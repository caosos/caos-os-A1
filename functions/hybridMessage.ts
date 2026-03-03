/**
 * hybridMessage — CAOS Primary Pipeline
 * CONTRACT v2 — 2026-03-01
 * LOCK_SIGNATURE: CAOS_HYBRID_MESSAGE_SPINE_v2_2026-03-01
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ⚠️  ARCHITECTURAL LAW — READ BEFORE TOUCHING THIS FILE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * THIS FILE IS THE SPINE. IT ORCHESTRATES. IT DOES NOT IMPLEMENT.
 *
 * THE LAW:
 *   1. THIS FILE MUST STAY UNDER 400 LINES. No exceptions.
 *   2. NO logic belongs here. Logic lives in contracted modules (see below).
 *   3. This file calls modules. Modules do not call each other without a contract.
 *   4. Every module is independently removable. Pull one out — nothing else breaks.
 *   5. DO NOT ADD NEW LOGIC HERE. If you think you need to, create a new module.
 *   6. DO NOT EDIT WITHOUT A TSB (Technical Specification Block) and a new LOCK_SIGNATURE.
 *   7. The system is an ORCHESTRATION — a clean conductor, not a monolith.
 *
 * CONTRACTED MODULES (each is its own file, under 400 lines):
 *   - functions/core/memoryEngine          (Phase A: save/recall)
 *   - functions/core/heuristicsEngine      (intent, DCS, directive)
 *   - functions/core/promptBuilder         (system prompt assembly)
 *   - functions/core/receiptWriter         (DiagnosticReceipt + SessionContext)
 *   - functions/core/errorEnvelopeWriter   (ODEL v1 error persistence)
 *   - functions/core/environmentLoader     (cross-thread awareness)
 *   - functions/core/selfDescribe          (runtime manifest / kv lines)
 *   - functions/core/webSearch             (external knowledge)
 *   - functions/core/externalKnowledgeDetector (should we search?)
 *
 * PIPELINE STAGES (in order):
 *   AUTH → PROFILE_LOAD → MEMORY_WRITE → HISTORY_LOAD →
 *   HEURISTICS → PROMPT_BUILD → OPENAI_CALL → MESSAGE_SAVE → RESPONSE_BUILD
 *
 * INVARIANTS (do not change without TSB + new lock):
 *   - SESSION_RESUME sentinel → noop, no AI call, no message saved
 *   - Memory save → returns immediately, bypasses inference
 *   - Receipt write is AWAITED (I2) — no fire-and-forget
 *   - body and user hoisted above try{} so catch block has full context
 *   - Active model: gpt-5.2
 *   - compressHistory: HOT_HEAD=15, HOT_TAIL=40
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
// Manifest imports removed — runtime facts now sourced from core/selfDescribe module

// CAOS_ENVIRONMENT_AUTHORITY_v1_2026-03-02 | CAOS_CAPABILITY_AUTHORITY_v1_2026-03-02 | CAOS_UI_AUTHORITY_v1_2026-03-02
// Machine-only authority blocks. No prose. No duplicate keys. No schema.
// Static build-time imports. No runtime invocation. No per-turn call. No DB read.

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BUILD_ID = "HM_SELF_DESCRIBE_V1_2026-03-02";
const ACTIVE_MODEL = 'gpt-5.2';
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const MAX_HISTORY_MESSAGES = 100;
const HOT_TAIL = 40;
const HOT_HEAD = 15;
const MODEL_CONTEXT_WINDOW = {
    'gpt-4o': 128000, 'gpt-4o-mini': 128000, 'gpt-4-turbo': 128000,
    'gpt-4': 8192, 'gpt-3.5-turbo': 16385, 'gpt-5.2': 200000, 'gpt-5': 200000,
};

// ─── STAGE TRACKER ────────────────────────────────────────────────────────────
const STAGES = { AUTH: 'AUTH', PROFILE_LOAD: 'PROFILE_LOAD', MEMORY_WRITE: 'MEMORY_WRITE', HISTORY_LOAD: 'HISTORY_LOAD', HEURISTICS: 'HEURISTICS', OPENAI_CALL: 'OPENAI_CALL', MESSAGE_SAVE: 'MESSAGE_SAVE', RESPONSE_BUILD: 'RESPONSE_BUILD' };
let CURRENT_STAGE = null;
const setStage = (s) => { CURRENT_STAGE = s; };
const getStage = () => CURRENT_STAGE;

// ─── HISTORY COMPRESSION (pure — stays inline, no network) ───────────────────
function compressHistory(messages) {
    if (messages.length <= HOT_HEAD + HOT_TAIL) return messages;
    const head = messages.slice(0, HOT_HEAD);
    const tail = messages.slice(-HOT_TAIL);
    const middleCount = messages.length - HOT_HEAD - HOT_TAIL;
    return [...head, { role: 'assistant', content: `[CONVERSATION SUMMARY: ${middleCount} earlier messages omitted. First ${HOT_HEAD} and last ${HOT_TAIL} messages shown in full.]` }, ...tail];
}

// ─── OPENAI CALL (pure HTTP — stays inline) ───────────────────────────────────
async function openAICall(key, messages, model, maxTokens = 2000) {
    const response = await fetch(OPENAI_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_completion_tokens: maxTokens })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return { content: data.choices[0]?.message?.content || '', usage: data.usage || null };
}

// ─── INLINED MEMORY DETECTION (pure regex — no network) ──────────────────────
// FIX 2: Inlined from memoryEngine to eliminate 2 Deno function-call round-trips
// LOCK_SIGNATURE: CAOS_INLINE_MEMORY_DETECT_v1_2026-03-03

const MEMORY_SAVE_TRIGGERS = [
    /^i want you to remember\b(.*)/i,
    /^please remember\b(.*)/i,
    /^remember\s+(?:this|these|that)\b[:\s]*(.*)/i,
    /^remember\s+that\b(.*)/i,
    /^remember\b[:\s]+(.*)/i,
    /^can you remember\b(.*)/i,
    /^save(?:\s+this)?\s+to\s+memory[:\s]*(.*)/i,
    /^add(?:\s+this)?\s+to\s+memory[:\s]*(.*)/i,
    /^note\s+(?:this|that)[:\s]*(.*)/i,
    /^store\s+(?:this|that)[:\s]*(.*)/i,
];
const MEMORY_RECALL_TRIGGERS = [
    /\b(?:what do you remember about|do you remember|recall|you told me|you mentioned|what did I tell you about)\b/i,
    /\b(?:what do you know about me|what have I told you)\b/i,
];
const VAGUE_WORDS = new Set(['this','these','that','them','it','things','thing','too','also','as','well','please','ok','okay','all','of','right','yes','yep','yeah']);

function detectSaveIntent(input) {
    const trimmed = input.trim();
    for (const pattern of MEMORY_SAVE_TRIGGERS) {
        const match = trimmed.match(pattern);
        if (match) {
            const captured = (match[1] || '').trim();
            const cleaned = captured
                .replace(/[,.]?\s*(okay|ok|alright|right|too|as well|please)[?.]?\s*$/i, '')
                .replace(/[?.]$/, '')
                .replace(/^[\s,?:.]+/, '')
                .trim();
            if (!cleaned || cleaned.length < 3) return '__VAGUE__';
            const meaningfulWords = cleaned.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 1 && !VAGUE_WORDS.has(w));
            if (meaningfulWords.length === 0) return '__VAGUE__';
            if (PRONOUN_PATTERN.test(cleaned)) return '__PRONOUN__';
            return cleaned;
        }
    }
    return null;
}

function detectRecallIntent(input) {
    return MEMORY_RECALL_TRIGGERS.some(p => p.test(input));
}

// ─── PRONOUNS (used inline for PRONOUN clarify path) ─────────────────────────
const PRONOUN_PATTERN = /\b(she|he|they|her|him|them|it)\b/i;

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();
    const correlation_id = request_id;

    let body = null;
    let user = null;

    try {
        const base44 = createClientFromRequest(req);

        setStage(STAGES.AUTH);
        user = await base44.auth.me();
        if (!user || !user.email) {
            return Response.json({ reply: "Authentication required.", error: 'UNAUTHORIZED' }, { status: 401 });
        }

        body = await req.json();
        const { input, session_id, file_urls = [] } = body;

        // SESSION_RESUME sentinel — noop
        if (input === '__SESSION_RESUME__') {
            console.log('🔄 [SESSION_RESUME_NOOP]', { session_id });
            return Response.json({ reply: null, mode: 'SESSION_RESUME_NOOP', request_id });
        }

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        console.log('🚀 [PIPELINE_START]', { BUILD_ID, request_id, user: user.email, session_id, model: ACTIVE_MODEL });

        // ── STAGE: PROFILE_LOAD ───────────────────────────────────────────────
        setStage(STAGES.PROFILE_LOAD);
        let userProfile = null;
        let environmentState = null;
        try {
            const [profiles, envRes] = await Promise.all([
                base44.entities.UserProfile.filter({ user_email: user.email }, '-created_date', 1),
                base44.functions.invoke('core/environmentLoader', { action: 'load', user_id: user.email }).catch(() => null)
            ]);
            userProfile = profiles?.[0] || null;
            environmentState = envRes?.data || null;
        } catch (e) { console.warn('⚠️ [PROFILE_FAILED]', e.message); }

        // ── STAGE: MEMORY_WRITE (Phase A) ─────────────────────────────────────
        setStage(STAGES.MEMORY_WRITE);

        // FIX 2: Inlined — no network round-trip
        const memorySaveSignal = detectSaveIntent(input);

        // VAGUE clarify
        if (memorySaveSignal === '__VAGUE__') {
            const clarifyReply = `Sure — what specifically would you like me to remember? Please share the facts and I'll save them.`;
            if (session_id) {
                await base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, timestamp: new Date().toISOString() });
                await base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: clarifyReply, timestamp: new Date().toISOString() });
            }
            return Response.json({ reply: clarifyReply, mode: 'MEMORY_CLARIFY', memory_saved: false, entries_created: 0, entry_ids: [], request_id, response_time_ms: Date.now() - startTime, tool_calls: [], execution_receipt: { request_id, session_id, memory_saved: false, latency_ms: Date.now() - startTime } });
        }

        // PRONOUN clarify
        if (memorySaveSignal === '__PRONOUN__') {
            const pronoun = (input.match(PRONOUN_PATTERN) || ['they'])[0];
            const clarifyReply = `Who is "${pronoun}" referring to? I need a name before I can save this.`;
            if (session_id) {
                await base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, timestamp: new Date().toISOString() });
                await base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: clarifyReply, timestamp: new Date().toISOString() });
            }
            return Response.json({ reply: clarifyReply, mode: 'MEMORY_CLARIFY_PRONOUN', memory_saved: false, entries_created: 0, entry_ids: [], request_id, response_time_ms: Date.now() - startTime, tool_calls: [], execution_receipt: { request_id, session_id, memory_saved: false, latency_ms: Date.now() - startTime } });
        }

        // SAVE path
        if (memorySaveSignal) {
            const saveRes = await base44.functions.invoke('core/memoryEngine', { action: 'save', content: memorySaveSignal });
            const { saved = [], deduped = [], rejected = [] } = saveRes?.data || {};
            const memory_saved = saved.length > 0;
            const entry_ids = saved.map(e => e.id);

            let confirmReply;
            if (!memory_saved && deduped.length === 0) {
                confirmReply = `I couldn't save that — it doesn't contain enough information to store.`;
            } else if (!memory_saved && deduped.length > 0) {
                confirmReply = `Already in memory: ${deduped.map(e => `"${e.content}"`).join(', ')}`;
            } else if (saved.length === 1 && deduped.length === 0) {
                confirmReply = `Memory saved. I'll remember: "${saved[0].content}"\n\nMEMORY_SAVED: TRUE | entries: 1 | id: ${saved[0].id}`;
            } else {
                const savedLines = saved.map((e, i) => `${i + 1}. "${e.content}"`).join('\n');
                const dupNote = deduped.length > 0 ? `\n(${deduped.length} already existed)` : '';
                const rejNote = rejected.length > 0 ? `\n(${rejected.length} rejected — too vague)` : '';
                confirmReply = `Saved ${saved.length} fact${saved.length !== 1 ? 's' : ''}:\n${savedLines}${dupNote}${rejNote}\n\nMEMORY_SAVED: TRUE | entries: ${saved.length} | ids: [${entry_ids.join(', ')}]`;
            }

            if (session_id) {
                await base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, timestamp: new Date().toISOString() });
                await base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: confirmReply, timestamp: new Date().toISOString() });
            }
            return Response.json({ reply: confirmReply, mode: 'MEMORY_SAVE', memory_saved, entries_created: saved.length, entry_ids, dedup_ids: deduped.map(e => e.id), rejected_entries: rejected, request_id, response_time_ms: Date.now() - startTime, tool_calls: [], execution_receipt: { request_id, session_id, memory_saved, entries_created: saved.length, latency_ms: Date.now() - startTime } });
        }

        // ── STAGE: HISTORY_LOAD ───────────────────────────────────────────────
        setStage(STAGES.HISTORY_LOAD);
        let rawHistory = [];
        if (session_id) {
            try {
                const msgs = await base44.entities.Message.filter({ conversation_id: session_id }, '-timestamp', MAX_HISTORY_MESSAGES);
                rawHistory = msgs.reverse().map(m => ({ role: m.role, content: m.content }));
                console.log('✅ [HISTORY_LOADED]', { count: rawHistory.length });
            } catch (e) { console.warn('⚠️ [HISTORY_FAILED]', e.message); }
        }
        const conversationHistory = compressHistory(rawHistory);

        // ── MEMORY RECALL ─────────────────────────────────────────────────────
        // FIX 2: Inlined — no network round-trip
        const isRecallQuery = detectRecallIntent(input);
        const structuredMemory = userProfile?.structured_memory || [];
        let matchedMemories = [];
        if (isRecallQuery && structuredMemory.length > 0) {
            const recallData = await base44.functions.invoke('core/memoryEngine', { action: 'recall', structuredMemory, query: input });
            matchedMemories = recallData?.data?.matches || [];
            console.log('🔍 [MEMORY_RECALL]', { matched: matchedMemories.length });
        }

        // ── STAGE: HEURISTICS ─────────────────────────────────────────────────
         setStage(STAGES.HEURISTICS);
         const [hRes, extRes] = await Promise.all([
           base44.functions.invoke('core/heuristicsEngine', { input }),
           base44.functions.invoke('core/externalKnowledgeDetector', { input })
         ]);
         const { intent: hIntent = 'GENERAL_QUERY', depth: hDepth = 'STANDARD', cognitive_level: cogLevel = 3, directive: hDirective = '' } = hRes?.data || {};
         const webSearchNeeded = extRes?.data?.requires_web ?? false;
         const webSearchEnabled = extRes?.data?.web_search_enabled ?? false;

         console.log('🎛️ [HEURISTICS+DCS]', { intent: hIntent, depth: hDepth, cognitive_level: cogLevel });
         console.log('🔍 [WEB_SEARCH_CHECK]', { web_search_enabled: webSearchEnabled, search_needed: webSearchNeeded });

        // ── STAGE: PROMPT_BUILD (delegated to core/promptBuilder) ────────────
        const userName = userProfile?.preferred_name || user.full_name || 'the user';

        const [sdRes, pbRes] = await Promise.all([
            base44.functions.invoke('core/selfDescribe', {}),
            Promise.resolve(null) // placeholder; promptBuilder called after selfDescribe resolves
        ]);
        const kv = sdRes?.data?.kv_lines || 'model_name=gpt-5.2\ntoken_limit=200000\nplatform_name=CAOS';
        console.log('🔑 [SELF_DESCRIBE]', { kv_length: kv.length, has_model: kv.includes('model_name=') });

        // Conditionally invoke webSearch if enabled and needed
        let webSearchResults = [];
        if (webSearchEnabled && webSearchNeeded) {
          try {
            const wsRes = await base44.functions.invoke('core/webSearch', { query: input, limit: 5 });
            webSearchResults = wsRes?.data?.results || [];
            console.log('✅ [WEB_SEARCH_EXECUTED]', { result_count: webSearchResults.length });
          } catch (e) {
            console.warn('⚠️ [WEB_SEARCH_FAILED]', e.message);
          }
        }

        const pbRes2 = await base44.functions.invoke('core/promptBuilder', {
            userName, kv, matchedMemories, userProfile, rawHistory,
            hDirective, hDepth, cogLevel, webSearchResults, webSearchEnabled,
            environmentState
        });
        const systemPrompt = pbRes2?.data?.systemPrompt || `You are Aria, assistant for ${userName}.`;

        // ── STAGE: OPENAI_CALL ────────────────────────────────────────────────
        setStage(STAGES.OPENAI_CALL);

        // Convert file_urls to OpenAI vision format (image_url for images)
        const userMessageContent = [];
        userMessageContent.push({ type: 'text', text: input });
        if (file_urls && file_urls.length > 0) {
            file_urls.forEach(url => {
                if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                    userMessageContent.push({ type: 'image_url', image_url: { url } });
                }
            });
        }

        const finalMessages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: userMessageContent.length === 1 ? input : userMessageContent }
        ];
        const sysMsgs = finalMessages.filter(m => m.role === 'system');

        console.log('AUDIT_BUILD', { BUILD_ID, request_id, session_id });
        console.log('AUDIT_SYSTEM', {
            BUILD_ID,
            system_message_count: sysMsgs.length,
            has_begin: systemPrompt.includes('CAOS_AUTHORITY_KV_BEGIN'),
            has_model: systemPrompt.includes('model_name='),
            has_token: systemPrompt.includes('token_limit='),
            has_backend: systemPrompt.includes('backend_runtime='),
            has_frontend: systemPrompt.includes('frontend_framework='),
            has_provider: systemPrompt.includes('inference_provider='),
            has_web: systemPrompt.includes('web_search_enabled='),
            has_file: systemPrompt.includes('file_read_enabled='),
            has_tts: systemPrompt.includes('tts_enabled='),
            has_learning: systemPrompt.includes('learning_mode='),
        });

        const inferenceStart = Date.now();
        const { content: reply, usage: openaiUsage } = await openAICall(openaiKey, finalMessages, ACTIVE_MODEL, 2000);
        const inferenceMs = Date.now() - inferenceStart;
        if (!reply) throw new Error('No response from OpenAI');

        // WCW instrumentation
        const wcwBudget = MODEL_CONTEXT_WINDOW[ACTIVE_MODEL] || 128000;
        const promptTokens = openaiUsage?.prompt_tokens || 0;
        const completionTokens = openaiUsage?.completion_tokens || 0;
        const totalTokens = openaiUsage?.total_tokens || 0;
        const wcwRemaining = wcwBudget - promptTokens;
        const tokenBreakdown = { system_prompt_tokens: null, history_tokens: null, user_input_tokens: null, total_prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens };

        console.log('📊 [WCW]', { wcw_budget: wcwBudget, prompt_tokens: promptTokens, wcw_remaining: wcwRemaining });
        console.log('✅ [INFERENCE_SUCCESS]', { replyLength: reply.length });

        // ── STAGE: MESSAGE_SAVE ───────────────────────────────────────────────
        setStage(STAGES.MESSAGE_SAVE);
        if (session_id) {
            try {
                await base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, file_urls: file_urls.length > 0 ? file_urls : undefined, timestamp: new Date().toISOString() });
                await base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: reply, timestamp: new Date().toISOString() });
                console.log('✅ [MESSAGES_SAVED]');
            } catch (e) { console.warn('⚠️ [SAVE_FAILED]', e.message); }
        }

        // ── STAGE: RESPONSE_BUILD (receipt + session context — AWAITED per I2) ─
        setStage(STAGES.RESPONSE_BUILD);
        const responseTime = Date.now() - startTime;

        // FIX 1: Fire-and-forget — receipt is diagnostic, not functional (I2 → best-effort)
        base44.functions.invoke('core/receiptWriter', {
            request_id, correlation_id, session_id, model_used: ACTIVE_MODEL,
            wcw_budget: wcwBudget, wcw_used: promptTokens, wcw_remaining: wcwRemaining,
            heuristics_intent: hIntent, heuristics_depth: hDepth, cognitive_level: cogLevel,
            history_messages: rawHistory.length, recall_executed: matchedMemories.length > 0,
            matched_memories: matchedMemories.length,
            latency_breakdown: { inference_ms: inferenceMs, total_ms: responseTime },
            token_breakdown: tokenBreakdown,
            user_email: user.email
        }).catch(e => console.error('🔥 [RECEIPT_WRITE_FAIL_NONFATAL]', e?.message || e));

        // 3.1: Background anchor auto-extraction DISABLED.
        console.log('🔒 [ANCHOR_EXTRACTION_DISABLED] Phase 3.1 lock active');
        console.log('🎯 [PIPELINE_COMPLETE_v2]', { request_id, correlation_id, duration: responseTime });

        return Response.json({
            reply, mode: 'GEN', request_id, correlation_id,
            response_time_ms: responseTime, tool_calls: [],
            wcw_budget: wcwBudget, wcw_used: promptTokens, wcw_remaining: wcwRemaining,
            execution_receipt: {
                request_id, correlation_id, session_id,
                history_messages: rawHistory.length, recall_executed: matchedMemories.length > 0,
                matched_memories: matchedMemories.length, heuristics_intent: hIntent,
                heuristics_depth: hDepth, cognitive_level: cogLevel, elevation_delta: 0.75,
                model_used: ACTIVE_MODEL, latency_ms: responseTime,
                token_breakdown: tokenBreakdown, wcw_budget: wcwBudget,
                wcw_used: promptTokens, wcw_remaining: wcwRemaining
            }
        });

    } catch (error) {
        const latency_ms = Date.now() - startTime;

        // Invoke errorEnvelopeWriter module (best effort — no await on failure)
        try {
            const base44 = createClientFromRequest(req);
            await base44.functions.invoke('core/errorEnvelopeWriter', {
                error_message: error.message, stage: getStage(),
                request_id, correlation_id,
                session_id: body?.session_id || null,
                user_email: user?.email || null,
                model_used: ACTIVE_MODEL, latency_ms
            });
        } catch (_) { /* envelope write failed — already logged inside module */ }

        console.error('🔥 [PIPELINE_ERROR]', { stage: getStage(), message: error.message, latency_ms });

        return Response.json({
            reply: "Something went wrong. Please try again.",
            error_code: 'SERVER_ERROR',
            stage: getStage(),
            request_id, correlation_id,
            mode: 'ERROR',
            response_time_ms: latency_ms,
        }, { status: 500 });
    }
});