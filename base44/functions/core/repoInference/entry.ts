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
 * Note: openaiFetchWithTimeout is inlined to avoid cross-file import assumptions;
 *       Inlined to avoid cross-file import assumptions in this runtime.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

// ── openaiFetchWithTimeout (inlined — see components/docs/PlatformConstraints.jsx) ──
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
    const request_id = crypto.randomUUID();
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
        const { messages, model = 'gpt-4o', max_tokens = 2000 } = body;

        if (!messages || !Array.isArray(messages)) {
            return Response.json({ ok: false, request_id, error_code: 'INVALID_INPUT', stage: 'REPO_INFERENCE', message: 'messages array required', retryable: false });
        }

        // ── REPO COMMAND MODE ─────────────────────────────────────────────────────
        // Admin repo access now mirrors Gemini behavior:
        // The model outputs the raw command string (e.g. "open src/pages/Chat.jsx")
        // and the frontend auto-executes it via the caos:repoNextChunk / handleSendMessage
        // auto-exec loop. The model then receives the result and provides a rich response
        // with a concise receipt on the NEXT turn.
        //
        // This replaces the old tool-loop approach which returned raw file content
        // without a descriptive wrapper, and was inconsistent with Gemini's output.
        // ─────────────────────────────────────────────────────────────────────────
        const COMMAND_ENFORCEMENT_SUFFIX = `
REPO_COMMAND_MODE_ACTIVE:
- If the user is asking to read or browse a file, respond with ONLY the raw command on its own line.
  Examples: "open src/pages/Chat.jsx" or "ls functions/core"
- Do NOT explain, narrate, or wrap the command in markdown.
- Do NOT say "I will now..." or "Let me...".
- After the frontend executes the command and returns results, provide a rich, analytical response.
- Include a concise receipt at the end: [TOOL: repo_access | ACTION: read|list | PATH: <path> | ok: true]
- DO NOT include the full file content in the receipt — just confirm what was accessed.`;

        const augmentedMessages = [
            ...messages,
            { role: 'system', content: COMMAND_ENFORCEMENT_SUFFIX }
        ];

        const loopStart = Date.now();
        const result = await openaiFetchWithTimeout(openaiKey, {
            model,
            messages: augmentedMessages,
            temperature: 0.3,
            max_completion_tokens: max_tokens,
            tools: REPO_TOOLS,
            tool_choice: 'auto'
        }, 38000);

        if (!result.ok) {
            console.error('🔥 [REPO_INFERENCE_FETCH_FAILED]', { timedOut: result.timedOut, status: result.status, request_id });
            return Response.json({ ok: false, request_id, error_code: result.timedOut ? 'REPO_INFERENCE_TIMEOUT' : 'OPENAI_ERROR', stage: 'REPO_INFERENCE', message: result.timedOut ? 'PROVIDER_TIMEOUT' : result.errorMessage, retryable: result.timedOut, t_repo_tool_total_ms: Date.now() - loopStart });
        }

        const data = result.data;
        const totalUsage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const choice = data.choices[0];
        const tool_calls_log = [];

        // If model decided to call a tool directly (web_search etc.), execute one round and return
        if (choice.message.tool_calls?.length > 0) {
            const msgs = [...augmentedMessages, choice.message];
            for (const toolCall of choice.message.tool_calls) {
                const fnName = toolCall.function.name;
                let fnArgs = {};
                try { fnArgs = JSON.parse(toolCall.function.arguments); } catch {}
                let toolResult;
                try {
                    toolResult = await dispatchTool(fnName, fnArgs, base44);
                    tool_calls_log.push({ fn: fnName, args: fnArgs, success: true });
                } catch (err) {
                    toolResult = { error: err.message };
                    tool_calls_log.push({ fn: fnName, args: fnArgs, success: false });
                }
                msgs.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
            }
            // Final synthesis call with tool results
            const finalResult = await openaiFetchWithTimeout(openaiKey, {
                model, messages: msgs, temperature: 0.3, max_completion_tokens: max_tokens
            }, 30000);
            const finalContent = finalResult.ok ? finalResult.data.choices[0]?.message?.content : choice.message.content;
            console.log('✅ [REPO_INFERENCE_TOOL_DONE]', { total_tokens: totalUsage.total_tokens, t_ms: Date.now() - loopStart, request_id });
            return Response.json({ ok: true, request_id, content: finalContent, usage: totalUsage, tool_rounds: 1, tool_calls_log, t_repo_tool_total_ms: Date.now() - loopStart });
        }

        // Model output the raw command string or a rich response — return as-is
        console.log('✅ [REPO_INFERENCE_DONE]', { total_tokens: totalUsage.total_tokens, t_ms: Date.now() - loopStart, request_id });
        return Response.json({
            ok: true,
            request_id,
            content: choice.message.content,
            usage: totalUsage,
            tool_rounds: 0,
            tool_calls_log,
            t_repo_tool_total_ms: Date.now() - loopStart
        });

    } catch (err) {
        console.error('🔥 [REPO_INFERENCE_ERROR]', err.message);
        return Response.json({ ok: false, request_id, error_code: 'REPO_INFERENCE_ERROR', stage: 'REPO_INFERENCE', message: err.message, retryable: false });
    }
});