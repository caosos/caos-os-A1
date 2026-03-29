/**
 * core/generalInference
 * Agentic OpenAI call with web_search tool — available to ALL authenticated users.
 * Admin users get repoInference (repo_list + repo_read + web_search).
 * Non-admin users get this (web_search only).
 *
 * Input:  { messages, model, max_tokens? }
 * Output: { content, usage, tool_rounds, tool_calls_log }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const PROVIDER_TIMEOUT_MS = 55000;

async function openaiCallWithTimeout(openaiKey, requestBody) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    const payload_bytes_est = JSON.stringify(requestBody).length;
    const callStart = Date.now();
    try {
        const response = await fetch(OPENAI_API, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        clearTimeout(timer);
        const provider_request_elapsed_ms = Date.now() - callStart;
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
            return { ok: false, error_code: 'PROVIDER_HTTP_ERROR', stage: 'OPENAI_CALL',
                message: err.error?.message || response.statusText,
                provider_http_status: response.status, provider_response_received: true,
                provider_request_elapsed_ms, provider_timeout_ms: PROVIDER_TIMEOUT_MS, payload_bytes_est };
        }
        const data = await response.json();
        return { ok: true, data, provider_request_elapsed_ms, provider_timeout_ms: PROVIDER_TIMEOUT_MS, payload_bytes_est };
    } catch (err) {
        clearTimeout(timer);
        const provider_request_elapsed_ms = Date.now() - callStart;
        const timedOut = err.name === 'AbortError';
        return { ok: false,
            error_code: timedOut ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK_ERROR',
            stage: 'OPENAI_CALL',
            message: timedOut ? 'PROVIDER_TIMEOUT' : err.message,
            provider_response_received: false,
            provider_request_elapsed_ms, provider_timeout_ms: PROVIDER_TIMEOUT_MS, payload_bytes_est };
    }
}

const TOOLS = [
    {
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
    return { error: `Unknown tool: ${name}` };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiKey) {
            return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
        }

        const body = await req.json();
        const { messages, model = 'gpt-4o', max_tokens = 2000 } = body;

        if (!messages || !Array.isArray(messages)) {
            return Response.json({ error: 'messages array required' }, { status: 400 });
        }

        const msgs = [...messages];
        let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const tool_calls_log = [];

        // Agentic loop — max 5 tool rounds
        for (let round = 0; round < 5; round++) {
            const result = await openaiCallWithTimeout(openaiKey, {
                model, messages: msgs, temperature: 0.01,
                max_completion_tokens: max_tokens, tools: TOOLS, tool_choice: 'auto'
            });

            if (!result.ok) {
                console.error('🔥 [GENERAL_INFERENCE_PROVIDER_ERR]', { round, error_code: result.error_code, elapsed_ms: result.provider_request_elapsed_ms });
                return Response.json({ ok: false, error_code: result.error_code, stage: result.stage,
                    message: result.message, provider_http_status: result.provider_http_status,
                    provider_response_received: result.provider_response_received,
                    provider_request_elapsed_ms: result.provider_request_elapsed_ms,
                    provider_timeout_ms: result.provider_timeout_ms,
                    payload_bytes_est: result.payload_bytes_est }, { status: 502 });
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
                console.log('✅ [GENERAL_INFERENCE_DONE]', { rounds: round + 1, total_tokens: totalUsage.total_tokens, provider_request_elapsed_ms: result.provider_request_elapsed_ms });
                return Response.json({
                    ok: true, content: choice.message.content, usage: totalUsage,
                    tool_rounds: round, tool_calls_log,
                    provider_request_elapsed_ms: result.provider_request_elapsed_ms,
                    provider_timeout_ms: result.provider_timeout_ms,
                    payload_bytes_est: result.payload_bytes_est
                });
            }

            // Execute tool calls
            msgs.push(choice.message);
            console.log('🔧 [GENERAL_TOOL_ROUND]', { round, tools: choice.message.tool_calls.map(t => t.function.name) });

            for (const toolCall of choice.message.tool_calls) {
                const fnName = toolCall.function.name;
                let fnArgs = {};
                try { fnArgs = JSON.parse(toolCall.function.arguments); } catch {}

                const callStart = Date.now();
                let result;
                try {
                    result = await dispatchTool(fnName, fnArgs, base44);
                    console.log('✅ [TOOL_OK]', { fn: fnName, ms: Date.now() - callStart });
                } catch (err) {
                    result = { error: `tool=${fnName} error=${err.message}` };
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

        return Response.json({ ok: false, error_code: 'TOOL_LOOP_EXHAUSTED', stage: 'OPENAI_CALL', message: 'Exceeded 5 tool rounds' }, { status: 500 });

    } catch (err) {
        console.error('🔥 [GENERAL_INFERENCE_ERROR]', err.message);
        return Response.json({ ok: false, error_code: 'INTERNAL_ERROR', stage: 'OPENAI_CALL', message: err.message }, { status: 500 });
    }
});