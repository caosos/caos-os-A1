/**
 * core/repoInference
 * Agentic OpenAI call with repo_list + repo_read tools injected.
 * Admin-only. Called by hybridMessage for admin users instead of bare openAICall.
 *
 * Input:  { messages, model, max_tokens? }
 * Output: { ok, request_id, content, usage, tool_rounds, tool_calls_log, t_repo_tool_total_ms }
 *
 * UNLOCK_TOKEN: CAOS_REPO_INFERENCE_TIMEOUT_v1_2026-03-12
 * Changes: inlined openaiFetchWithTimeout helper (AbortController + typed envelope);
 *          wall-clock budget guard (40s); envelope-consistent responses on all paths.
 * Note: openaiFetchWithTimeout is inlined here (not a separate import) because Base44
 *       function isolates do not support cross-file module imports.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

// ── openaiFetchWithTimeout (inlined — platform isolate constraint) ─────────────
// Wraps single OpenAI fetch with AbortController + hard deadline.
// Returns: { ok, timedOut, status, data?, errorMessage? }
async function openaiFetchWithTimeout(apiKey, body, timeoutMs = 38000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(OPENAI_API, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timer);
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
            return { ok: false, timedOut: false, status: response.status, errorMessage: err.error?.message || response.statusText };
        }
        const data = await response.json();
        return { ok: true, timedOut: false, status: 200, data };
    } catch (err) {
        clearTimeout(timer);
        const timedOut = err.name === 'AbortError';
        return { ok: false, timedOut, status: timedOut ? 504 : 502, errorMessage: timedOut ? 'PROVIDER_TIMEOUT' : err.message };
    }
}
// ─────────────────────────────────────────────────────────────────────────────

const WEB_SEARCH_TOOL = {
    type: 'function',
    function: {
        name: 'web_search',
        description: 'Search the web for current facts, news, documentation, or anything not in training data. Returns a summarized result with sources.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The search query string.' }
            },
            required: ['query']
        }
    }
};

const REPO_TOOLS = [WEB_SEARCH_TOOL,
    {
        type: 'function',
        function: {
            name: 'repo_list',
            description: 'List files and directories in the CAOS GitHub repository. Use to explore repo structure, find files, or verify paths.',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Directory path to list. Use "" for repo root.' },
                    ref:  { type: 'string', description: 'Git branch/tag/sha. Default: main.' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'repo_read',
            description: 'Read a file from the CAOS GitHub repository. Supports chunked pagination for large files via offset.',
            parameters: {
                type: 'object',
                properties: {
                    path:      { type: 'string',  description: 'File path relative to repo root.' },
                    ref:       { type: 'string',  description: 'Git ref. Default: main.' },
                    offset:    { type: 'integer', description: 'Byte offset to start reading. Default: 0.' },
                    max_bytes: { type: 'integer', description: 'Max bytes to read. Default: 200000.' }
                },
                required: ['path']
            }
        }
    }
];

async function dispatchTool(name, args, base44) {
    if (name === 'web_search') {
        const query = args.query || '';
        if (!query) return { error: 'web_search: query is required' };
        console.log('🔍 [WEB_SEARCH_DISPATCH]', { query: query.substring(0, 120) });
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Search the web for: "${query}". Return a factual, well-sourced summary. Include source URLs where available.`,
            add_context_from_internet: true,
            model: 'gemini_3_flash'
        });
        return { tool: 'web_search', query, result };
    }
    if (name === 'repo_list') {
        const res = await base44.asServiceRole.functions.invoke('core/repoList', {
            path: args.path ?? '',
            ref:  args.ref  ?? 'main'
        });
        return res?.data ?? res;
    }
    if (name === 'repo_read') {
        const res = await base44.asServiceRole.functions.invoke('core/repoReadChunked', {
            path:      args.path,
            ref:       args.ref       ?? 'main',
            offset:    args.offset    ?? 0,
            max_bytes: args.max_bytes ?? 200000
        });
        return res?.data ?? res;
    }
    return { error: `Unknown tool: ${name}` };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
        }

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiKey) {
            return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
        }

        const body = await req.json();
        const { messages, model = 'gpt-5.2', max_tokens = 2000 } = body;
        const request_id = crypto.randomUUID();

        if (!messages || !Array.isArray(messages)) {
            return Response.json({ ok: false, request_id, error_code: 'INVALID_INPUT', stage: 'REPO_INFERENCE', message: 'messages array required', retryable: false });
        }

        const msgs = [...messages];
        let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const tool_calls_log = [];
        const WALL_CLOCK_MS = 40000;
        const loopStart = Date.now();

        // Agentic loop — max 5 tool rounds, hard wall-clock budget of 40s
        for (let round = 0; round < 5; round++) {
            if (Date.now() - loopStart > WALL_CLOCK_MS) {
                console.warn('⚠️ [REPO_INFERENCE_TIMEOUT]', { round, elapsed_ms: Date.now() - loopStart, request_id });
                return Response.json({ ok: false, request_id, error_code: 'REPO_INFERENCE_TIMEOUT', stage: 'REPO_INFERENCE', message: 'PROVIDER_TIMEOUT: repo inference exceeded wall-clock budget', retryable: true, rounds_used: round, t_repo_tool_total_ms: Date.now() - loopStart }, { status: 504 });
            }

            const result = await openaiFetchWithTimeout(openaiKey, {
                model, messages: msgs, temperature: 0.7, max_completion_tokens: max_tokens,
                tools: REPO_TOOLS, tool_choice: 'auto'
            }, 38000);

            if (!result.ok) {
                console.error('🔥 [REPO_INFERENCE_FETCH_FAILED]', { round, timedOut: result.timedOut, status: result.status, request_id });
                return Response.json({ ok: false, request_id, error_code: result.timedOut ? 'REPO_INFERENCE_TIMEOUT' : 'OPENAI_ERROR', stage: 'REPO_INFERENCE', message: result.timedOut ? 'PROVIDER_TIMEOUT' : result.errorMessage, retryable: result.timedOut, rounds_used: round, t_repo_tool_total_ms: Date.now() - loopStart }, { status: result.status });
            }

            const data = result.data;
            if (data.usage) {
                totalUsage.prompt_tokens     += data.usage.prompt_tokens     || 0;
                totalUsage.completion_tokens += data.usage.completion_tokens || 0;
                totalUsage.total_tokens      += data.usage.total_tokens      || 0;
            }

            const choice = data.choices[0];

            // Final answer — no tool calls
            if (choice.finish_reason === 'stop' || !choice.message.tool_calls) {
                console.log('✅ [REPO_INFERENCE_DONE]', { rounds: round + 1, total_tokens: totalUsage.total_tokens, t_ms: Date.now() - loopStart, request_id });
                return Response.json({
                    ok: true,
                    request_id,
                    content: choice.message.content,
                    usage: totalUsage,
                    tool_rounds: round + 1,
                    tool_calls_log,
                    t_repo_tool_total_ms: Date.now() - loopStart
                });
            }

            // Execute tool calls
            msgs.push(choice.message);
            console.log('🔧 [REPO_TOOL_ROUND]', { round, tools: choice.message.tool_calls.map(t => t.function.name) });

            for (const toolCall of choice.message.tool_calls) {
                const fnName = toolCall.function.name;
                let fnArgs = {};
                try { fnArgs = JSON.parse(toolCall.function.arguments); } catch {}

                const callStart = Date.now();
                let result;
                try {
                    result = await dispatchTool(fnName, fnArgs, base44);
                    console.log('✅ [TOOL_OK]', { fn: fnName, path: fnArgs.path, ms: Date.now() - callStart });
                } catch (err) {
                    result = { error: err.message };
                    console.error('🚨 [TOOL_ERR]', { fn: fnName, error: err.message });
                }

                tool_calls_log.push({ fn: fnName, args: fnArgs, success: !result?.error });

                msgs.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                });
            }
        }

        return Response.json({ ok: false, request_id, error_code: 'TOOL_LOOP_EXHAUSTED', stage: 'REPO_INFERENCE', message: 'Exceeded maximum tool rounds (5)', retryable: false, rounds_used: 5, t_repo_tool_total_ms: Date.now() - loopStart }, { status: 500 });

    } catch (err) {
        console.error('🔥 [REPO_INFERENCE_ERROR]', err.message);
        return Response.json({ ok: false, request_id: crypto.randomUUID(), error_code: 'REPO_INFERENCE_ERROR', stage: 'REPO_INFERENCE', message: err.message, retryable: false }, { status: 500 });
    }
});