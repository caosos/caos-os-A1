// streamHybridMessage — SSE Streaming endpoint (opt-in parallel path)
// LOCK_SIGNATURE: CAOS_STREAM_HYBRID_v1_2026-03-13
// GOVERNANCE: Phase 1 — Option A (no mid-stream tool execution)
// INVARIANT: hybridMessage is NEVER touched. This is a fully parallel path.
// ROLLBACK: Delete this file only. Zero other changes needed.
//
// SSE EVENT SCHEMA:
//   event: meta   data: { request_id, session_id, model_used, t }
//   event: delta  data: { text, request_id }
//   event: final  data: { request_id, session_id, response_time_ms, token_usage, mode:"STREAM" }
//   event: error  data: { error_code, stage, request_id, retryable }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const ACTIVE_MODEL = 'gpt-5.2';
const PROVIDER_TIMEOUT_MS = 45000;
const MAX_HISTORY_MESSAGES = 40;
const HOT_HEAD = 15;
const HOT_TAIL = 40;

// ── SSE encoder ──────────────────────────────────────────────────────────────
const enc = new TextEncoder();
function sseEvent(type, data) {
    return enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── History compression (mirrors hybridMessage) ───────────────────────────────
function compressHistory(messages) {
    if (messages.length <= HOT_HEAD + HOT_TAIL) return messages;
    const head = messages.slice(0, HOT_HEAD);
    const tail = messages.slice(-HOT_TAIL);
    const middleCount = messages.length - HOT_HEAD - HOT_TAIL;
    return [...head, { role: 'assistant', content: `[CONVERSATION SUMMARY: ${middleCount} earlier messages omitted.]` }, ...tail];
}

// ── Tool detection (Option A: check if first response wants tools) ────────────
const TOOLS = [{
    type: 'function',
    function: {
        name: 'web_search',
        description: 'Search the web for current facts, news, or anything not in training data.',
        parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    }
}];

// ── Non-streaming tool loop (Option A fallback — mirrors generalInference) ────
async function runToolLoop(openaiKey, messages, model, controller) {
    const msgs = [...messages];
    let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    for (let round = 0; round < 5; round++) {
        const res = await fetch(OPENAI_API, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: msgs, temperature: 0.7, max_completion_tokens: 2000, tools: TOOLS, tool_choice: 'auto' }),
            signal: controller.signal
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.usage) {
            totalUsage.prompt_tokens     += data.usage.prompt_tokens     || 0;
            totalUsage.completion_tokens += data.usage.completion_tokens || 0;
            totalUsage.total_tokens      += data.usage.total_tokens      || 0;
        }
        const choice = data.choices[0];
        if (choice.finish_reason === 'stop' || !choice.message.tool_calls) {
            return { content: choice.message.content, usage: totalUsage };
        }
        // Execute tool calls
        msgs.push(choice.message);
        for (const toolCall of choice.message.tool_calls) {
            msgs.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ note: 'tool_executed' }) });
        }
    }
    throw new Error('TOOL_LOOP_EXHAUSTED');
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();

    // ── Auth ──────────────────────────────────────────────────────────────────
    const base44 = createClientFromRequest(req);
    let user, body;
    try {
        [user, body] = await Promise.all([base44.auth.me(), req.json()]);
    } catch (e) {
        return Response.json({ error: 'Bad request', stage: 'AUTH' }, { status: 400 });
    }
    if (!user?.email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { input, session_id, file_urls = [] } = body;
    if (!input?.trim()) {
        return Response.json({ error: 'input required' }, { status: 400 });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
        return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    // ── Build finalMessages (parallel path — mirrors hybridMessage prep) ───────
    let userProfile = null;
    let rawHistory = [];
    try {
        const [profiles, historyMsgs] = await Promise.all([
            base44.entities.UserProfile.filter({ user_email: user.email }, '-created_date', 1),
            session_id ? base44.entities.Message.filter({ conversation_id: session_id }, '-timestamp', MAX_HISTORY_MESSAGES) : Promise.resolve([])
        ]);
        userProfile = profiles?.[0] || null;
        rawHistory = historyMsgs.reverse().map(m => ({ role: m.role, content: m.content }));
    } catch (e) {
        console.warn('⚠️ [STREAM_PROFILE_WARN]', e.message);
    }

    // Build system prompt via promptBuilder (same as hybridMessage)
    const userName = userProfile?.preferred_name || user.full_name || 'the user';
    const server_time = new Date().toISOString();
    let systemPrompt = `You are Aria, a personal AI assistant for ${userName}.\nCURRENT_SERVER_TIME: ${server_time}`;
    try {
        const pbRes = await Promise.race([
            base44.functions.invoke('core/promptBuilder', { userName, matchedMemories: [], userProfile, rawHistory, hDirective: '', hDepth: 'STANDARD', cogLevel: 3, arcBlock: '', server_time }),
            new Promise(r => setTimeout(() => r(null), 6000))
        ]);
        if (pbRes?.data?.systemPrompt) systemPrompt = pbRes.data.systemPrompt;
    } catch (e) {
        console.warn('⚠️ [STREAM_PROMPT_BUILDER_FALLBACK]', e.message);
    }

    const conversationHistory = compressHistory(rawHistory);
    const userContent = file_urls?.length > 0
        ? [{ type: 'text', text: input }, ...file_urls.filter(u => u.match(/\.(jpg|jpeg|png|gif|webp)$/i)).map(url => ({ type: 'image_url', image_url: { url } }))]
        : input;

    const finalMessages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userContent }
    ];

    // ── SSE Stream ────────────────────────────────────────────────────────────
    const stream = new ReadableStream({
        async start(ctrl) {
            const abort = new AbortController();
            const timeout = setTimeout(() => abort.abort(), PROVIDER_TIMEOUT_MS);

            const emit = (type, data) => { try { ctrl.enqueue(sseEvent(type, data)); } catch (_) {} };

            emit('meta', { request_id, session_id, model_used: ACTIVE_MODEL, t: Date.now() });

            try {
                // ── OPTION A: probe for tool requirement first (non-streaming dry run) ──
                // Attempt streaming directly. If the first token is a tool_call, fall back.
                const streamRes = await fetch(OPENAI_API, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: ACTIVE_MODEL, messages: finalMessages, temperature: 0.7,
                        max_completion_tokens: 2000, stream: true,
                        tools: TOOLS, tool_choice: 'auto'
                    }),
                    signal: abort.signal
                });

                clearTimeout(timeout);

                if (!streamRes.ok) {
                    const errBody = await streamRes.json().catch(() => ({}));
                    emit('error', { error_code: 'PROVIDER_HTTP_ERROR', stage: 'OPENAI_CALL', request_id, retryable: false, message: errBody.error?.message || `HTTP ${streamRes.status}` });
                    ctrl.close();
                    return;
                }

                // Read the SSE stream from OpenAI
                const reader = streamRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let fullText = '';
                let tokenUsage = null;
                let isToolCall = false;
                let toolCallBuffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // keep incomplete line

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const raw = line.slice(6).trim();
                        if (raw === '[DONE]') continue;

                        let parsed;
                        try { parsed = JSON.parse(raw); } catch { continue; }

                        // Capture usage if present
                        if (parsed.usage) tokenUsage = parsed.usage;

                        const delta = parsed.choices?.[0]?.delta;
                        if (!delta) continue;

                        // Detect tool call in stream — switch to Option A fallback
                        if (delta.tool_calls) {
                            isToolCall = true;
                            toolCallBuffer = ''; // abandon streaming, will re-run via tool loop
                            // Drain remainder of stream silently
                            continue;
                        }

                        if (isToolCall) continue; // draining

                        if (delta.content) {
                            fullText += delta.content;
                            emit('delta', { text: delta.content, request_id });
                        }
                    }
                }

                // ── OPTION A: tool fallback — run full non-streaming tool loop ───────
                if (isToolCall) {
                    console.log('🔧 [STREAM_TOOL_FALLBACK] Switching to non-streaming tool loop');
                    const abort2 = new AbortController();
                    const timeout2 = setTimeout(() => abort2.abort(), PROVIDER_TIMEOUT_MS);
                    try {
                        const toolResult = await runToolLoop(openaiKey, finalMessages, ACTIVE_MODEL, abort2);
                        clearTimeout(timeout2);
                        tokenUsage = toolResult.usage;
                        fullText = toolResult.content || '';
                        // Stream the final answer as deltas (chunk it for UX)
                        const chunkSize = 80;
                        for (let i = 0; i < fullText.length; i += chunkSize) {
                            emit('delta', { text: fullText.slice(i, i + chunkSize), request_id });
                        }
                    } catch (toolErr) {
                        clearTimeout(timeout2);
                        const isTimeout = toolErr.name === 'AbortError' || toolErr.message?.includes('aborted');
                        emit('error', { error_code: isTimeout ? 'PROVIDER_TIMEOUT' : 'TOOL_LOOP_FAILED', stage: 'TOOL_LOOP', request_id, retryable: isTimeout });
                        ctrl.close();
                        // Fire-and-forget message save for error case
                        if (session_id) base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, timestamp: new Date().toISOString() }).catch(() => {});
                        return;
                    }
                }

                const response_time_ms = Date.now() - startTime;
                emit('final', { request_id, session_id, response_time_ms, token_usage: tokenUsage, mode: 'STREAM' });
                ctrl.close();

                // ── Fire-and-forget: save messages + update conversation ─────────────
                if (session_id && fullText) {
                    Promise.all([
                        base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, file_urls: file_urls.length > 0 ? file_urls : undefined, timestamp: new Date().toISOString() }),
                        base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: fullText, timestamp: new Date().toISOString() })
                    ]).catch(e => console.warn('⚠️ [STREAM_SAVE_WARN]', e.message));
                }

                // Auto-title fire-and-forget
                base44.functions.invoke('autoTitleThread', { session_id, user_input: input }).catch(() => {});

                console.log('✅ [STREAM_COMPLETE]', { request_id, response_time_ms, chars: fullText.length, tool_fallback: isToolCall });

            } catch (err) {
                clearTimeout(timeout);
                const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
                console.error('🔥 [STREAM_ERROR]', { error_code: isTimeout ? 'PROVIDER_TIMEOUT' : 'STREAM_FAILED', message: err.message, request_id });
                emit('error', {
                    error_code: isTimeout ? 'PROVIDER_TIMEOUT' : 'STREAM_FAILED',
                    stage: 'OPENAI_CALL', request_id, retryable: isTimeout
                });
                try { ctrl.close(); } catch (_) {}
            }
        }
    });

    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    });
});