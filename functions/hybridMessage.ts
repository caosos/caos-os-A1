/**
 * hybridMessage — CAOS Primary Pipeline
 * CONTRACT v2 — 2026-03-01
 * LOCK_SIGNATURE: CAOS_HYBRID_MESSAGE_SPINE_v2_2026-03-01
 *
 * THIS FILE IS THE SPINE. IT ORCHESTRATES. IT DOES NOT IMPLEMENT.
 * All logic lives in contracted modules:
 *   - functions/core/memoryEngine     (Phase A: save/recall)
 *   - functions/core/heuristicsEngine (intent, DCS, directive)
 *   - functions/core/receiptWriter    (DiagnosticReceipt + SessionContext)
 *   - functions/core/errorEnvelopeWriter (ODEL v1 error persistence)
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
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { ENVIRONMENT_MANIFEST_AUTHORITY } from './core/manifests/environmentManifest.js';
import { CAPABILITY_MANIFEST_AUTHORITY } from './core/manifests/capabilityManifest.js';
import { UI_MANIFEST_AUTHORITY } from './core/manifests/uiManifest.js';

// CAOS_ENVIRONMENT_AUTHORITY_v1_2026-03-02 | CAOS_CAPABILITY_AUTHORITY_v1_2026-03-02 | CAOS_UI_AUTHORITY_v1_2026-03-02
// Machine-only authority blocks. No prose. No duplicate keys. No schema.
// Static build-time imports. No runtime invocation. No per-turn call. No DB read.

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ACTIVE_MODEL = 'gpt-5.2';
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const MAX_HISTORY_MESSAGES = 100;
const HOT_TAIL = 40;
const HOT_HEAD = 15;
const MAX_ANCHOR_LENGTH = 3000;
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
    return [...head, { role: 'system', content: `[CONVERSATION SUMMARY: ${middleCount} earlier messages omitted. First ${HOT_HEAD} and last ${HOT_TAIL} messages shown in full.]` }, ...tail];
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
        console.log('🚀 [PIPELINE_START]', { request_id, user: user.email, session_id, model: ACTIVE_MODEL });

        // ── STAGE: PROFILE_LOAD ───────────────────────────────────────────────
        setStage(STAGES.PROFILE_LOAD);
        let userProfile = null;
        try {
            const profiles = await base44.entities.UserProfile.filter({ user_email: user.email }, '-created_date', 1);
            userProfile = profiles?.[0] || null;
        } catch (e) { console.warn('⚠️ [PROFILE_FAILED]', e.message); }

        // ── STAGE: MEMORY_WRITE (Phase A) ─────────────────────────────────────
        setStage(STAGES.MEMORY_WRITE);

        // Invoke memoryEngine module for detection
        const detectRes = await base44.functions.invoke('core/memoryEngine', { action: 'detect_save', input });
        const memorySaveSignal = detectRes?.data?.result ?? null;

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
        const recallRes = await base44.functions.invoke('core/memoryEngine', { action: 'detect_recall', input });
        const isRecallQuery = recallRes?.data?.result ?? false;
        const structuredMemory = userProfile?.structured_memory || [];
        let matchedMemories = [];
        if (isRecallQuery && structuredMemory.length > 0) {
            const recallData = await base44.functions.invoke('core/memoryEngine', { action: 'recall', structuredMemory, query: input });
            matchedMemories = recallData?.data?.matches || [];
            console.log('🔍 [MEMORY_RECALL]', { matched: matchedMemories.length });
        }

        // ── STAGE: HEURISTICS ─────────────────────────────────────────────────
        setStage(STAGES.HEURISTICS);
        const hRes = await base44.functions.invoke('core/heuristicsEngine', { input });
        const { intent: hIntent = 'GENERAL_QUERY', depth: hDepth = 'STANDARD', cognitive_level: cogLevel = 3, directive: hDirective = '' } = hRes?.data || {};
        console.log('🎛️ [HEURISTICS+DCS]', { intent: hIntent, depth: hDepth, cognitive_level: cogLevel });

        // ── STAGE: PROMPT_BUILD ───────────────────────────────────────────────
        const userName = userProfile?.preferred_name || user.full_name || 'the user';

        // ── 1. IDENTITY BLOCK ─────────────────────────────────────────────────
        let systemPrompt = `You are Aria, a personal AI assistant for ${userName}.

IDENTITY:
- You are Aria. Not CAOS. Never say "I am CAOS" — that is the platform name, not yours.
- Speak in first person. Match your depth to the complexity of what you are responding to.

OUTPUT FORMAT:
- Match your format to the content. Use lists, headers, bullets, bold, or prose — whatever best serves the response.
- When asked for manifest/runtime/capability data, quote authority block values verbatim as key=value lines.

`;

        // ── 2. RUNTIME AUTHORITY BLOCKS (EARLY — HIGH PRIORITY) ──────────────
        systemPrompt += ENVIRONMENT_MANIFEST_AUTHORITY;
        systemPrompt += CAPABILITY_MANIFEST_AUTHORITY;
        systemPrompt += UI_MANIFEST_AUTHORITY;

        // ── 3. SELF-DESCRIPTION ENFORCEMENT RULE ─────────────────────────────
        systemPrompt += `
SELF-DESCRIPTION RULE — MANDATORY:
When asked about runtime, UI, model, or capabilities:
- You MUST quote values from the CAOS_*_AUTHORITY blocks above verbatim.
- Output only key=value lines.
- No explanations. No paraphrasing.
- If a key is not present in authority blocks, output: not_present_in_manifest.
- You are FORBIDDEN from saying "I don't have access to a manifest", "I cannot verify my runtime", or "no manifest was injected". The authority blocks are in this prompt. You read them.

`;

        // ── 4. TRUTH DISCIPLINE RULES ─────────────────────────────────────────
        systemPrompt += `TRUTH DISCIPLINE — MANDATORY RULES:

1. PRIOR-MENTION CLAIMS: You MUST NOT say "you've mentioned", "you previously said", "as we discussed", "from what I recall", or "you told me before" UNLESS the fact exists in STRUCTURED MEMORY (below) or appears verbatim in the SESSION HISTORY. If you cannot point to a source, do not claim prior knowledge.

2. NEW INFORMATION RULE: If the user introduces a fact in their current message, respond with "Got it —" and treat it as new. Do NOT frame it as something you already knew.

3. PREFERENCE CLAIMS: Never assert "you like X" or "you prefer X" unless it is explicitly stated in STRUCTURED MEMORY or the user said it in this session. If inferred, use: "It sounds like you might..." or "I could be inferring this, but..."

4. NO FABRICATION: If you don't know something about the user, say so. "I don't have that stored" is correct. Hallucinating facts is not.

5. SOURCE LABELING (when recalling facts): Briefly indicate the source — e.g., "(from memory)", "(from this conversation)", or "(inferred)".

`;

        // ── 5. RECALL + MEMORY INJECTION ─────────────────────────────────────
        if (matchedMemories.length > 0) {
            systemPrompt += `RECALLED MEMORY (explicitly saved facts matching this query):\n`;
            for (const m of matchedMemories) {
                systemPrompt += `- [${m.timestamp?.split('T')[0] || 'saved'}] ${m.content}\n`;
            }
            systemPrompt += '\n';
        }

        const anchors = userProfile?.memory_anchors;
        if (anchors && anchors.length > 0) {
            const structuredContents = (userProfile?.structured_memory || []).map(e => e.content.toLowerCase());
            const filteredAnchors = (Array.isArray(anchors) ? anchors : [anchors])
                .filter(a => {
                    const lower = a.toLowerCase();
                    return !structuredContents.some(sc => lower.includes(sc.substring(0, 20)) || sc.includes(lower.substring(0, 20)));
                });
            if (filteredAnchors.length > 0) {
                systemPrompt += `INFERRED CONTEXT (auto-extracted, treat as possible inference — DO NOT assert as definitive fact, use "It sounds like..." language):\n${filteredAnchors.join('\n').substring(0, MAX_ANCHOR_LENGTH)}\n\n`;
            }
        }

        // ── 6. TONE / PROJECT CONTEXT ─────────────────────────────────────────
        if (userProfile?.tone?.style) systemPrompt += `Communication style: ${userProfile.tone.style}\n`;
        if (userProfile?.project?.name) systemPrompt += `Current project: ${userProfile.project.name}\n`;

        systemPrompt += `\nSession: ${rawHistory.length} messages. ${rawHistory.length > HOT_HEAD + HOT_TAIL ? `First ${HOT_HEAD} and last ${HOT_TAIL} shown; middle summarized.` : 'Full history shown.'}`;

        // ── 7. HEURISTICS DIRECTIVE (LAST SYSTEM LAYER) ───────────────────────
        if (hDirective) {
            systemPrompt += hDirective;
            systemPrompt += `\nCOGNITIVE_LEVEL: ${cogLevel.toFixed ? cogLevel.toFixed(1) : cogLevel} | TARGET_DEPTH: ${hDepth} | ELEVATION_DELTA: 0.75 (do not surface these labels in output)`;
        }

        // ── STAGE: OPENAI_CALL ────────────────────────────────────────────────
        setStage(STAGES.OPENAI_CALL);
        const inferenceStart = Date.now();
        const { content: reply, usage: openaiUsage } = await openAICall(openaiKey, [{ role: 'system', content: systemPrompt }, ...conversationHistory, { role: 'user', content: input }], ACTIVE_MODEL, 2000);
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

        // Invoke receiptWriter module (awaited)
        await base44.functions.invoke('core/receiptWriter', {
            request_id, correlation_id, session_id, model_used: ACTIVE_MODEL,
            wcw_budget: wcwBudget, wcw_used: promptTokens, wcw_remaining: wcwRemaining,
            heuristics_intent: hIntent, heuristics_depth: hDepth, cognitive_level: cogLevel,
            history_messages: rawHistory.length, recall_executed: matchedMemories.length > 0,
            matched_memories: matchedMemories.length,
            latency_breakdown: { inference_ms: inferenceMs, total_ms: responseTime },
            token_breakdown: tokenBreakdown,
            user_email: user.email
        });

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