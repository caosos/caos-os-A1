// hybridMessage — CAOS Primary Pipeline
// LOCK_SIGNATURE: CAOS_HYBRID_MESSAGE_SPINE_v4_2026-03-15
// PIPELINE: AUTH → PROFILE_LOAD → MEMORY_WRITE → HISTORY_PREP → CTC_INTENT → CTC_HYDRATE → ARC_ASSEMBLE → HEURISTICS → PROMPT_BUILD → OPENAI_CALL → MESSAGE_SAVE → RESPONSE_BUILD
// INVARIANTS: SESSION_RESUME=noop | Memory save=early return | Receipt=fire-and-forget | Model=gpt-5.2 | HOT_HEAD=15 HOT_TAIL=40
// TSB-040: Phase 1 refactor — within-file structural cleanup only. Zero behavior change.
//   - Pure helpers consolidated into PURE HELPERS region
//   - Repo command block extracted to handleRepoCommand() (same file)
//   - Memory save block extracted to handleMemorySave() (same file)
//   - Section headers added throughout
//   - 924 → 680 lines. No logic edits. No timeout changes. No semantic changes.
// GOVERNANCE: No new features. Only permitted change = adding a call/invoke to an external module.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const BUILD_ID = "HM_SELF_DESCRIBE_V1_2026-03-02";
const ACTIVE_MODEL = 'gpt-5.2';
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const MAX_HISTORY_MESSAGES = 40;
const HOT_TAIL = 40;
const HOT_HEAD = 15;
const BUDGET_MS = 1500;
const CTC_HYDRATION_BUDGET_MS = 800;
const INTENT_MAX_CHARS = 5000;
const SANITIZER_MAX_CHARS = 8000;
const MODEL_CONTEXT_WINDOW = {
    'gpt-4o': 128000, 'gpt-4o-mini': 128000, 'gpt-4-turbo': 128000,
    'gpt-4': 8192, 'gpt-3.5-turbo': 16385, 'gpt-5.2': 200000, 'gpt-5': 200000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — STAGE TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

const STAGES = { AUTH: 'AUTH', PROFILE_LOAD: 'PROFILE_LOAD', MEMORY_WRITE: 'MEMORY_WRITE', HISTORY_PREP: 'HISTORY_PREP', CTC_INTENT: 'CTC_INTENT', CTC_HYDRATE: 'CTC_HYDRATE', ARC_ASSEMBLE: 'ARC_ASSEMBLE', HEURISTICS: 'HEURISTICS', OPENAI_CALL: 'OPENAI_CALL', MESSAGE_SAVE: 'MESSAGE_SAVE', RESPONSE_BUILD: 'RESPONSE_BUILD' };
let CURRENT_STAGE = null;
const setStage = (s) => { CURRENT_STAGE = s; };
const getStage = () => CURRENT_STAGE;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — OBSERVABILITY PLANE v1
// ═══════════════════════════════════════════════════════════════════════════════

const ENABLE_PIPELINE_EVENTS = true;
function emitEvent(base44, request_id, session_id, startTime, stage, message, opts = {}) {
    if (!ENABLE_PIPELINE_EVENTS) return;
    base44.functions.invoke('core/pipelineEventWriter', {
        request_id, session_id,
        level: opts.level || 'INFO',
        stage, code: opts.code || null,
        message, elapsed_ms: Date.now() - startTime,
        data: opts.data || null
    }).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — PURE HELPERS
// (No I/O. No side effects. Deterministic. Safe inline per §16.1.)
// ═══════════════════════════════════════════════════════════════════════════════

// ── History compression ───────────────────────────────────────────────────────
function compressHistory(messages) {
    if (messages.length <= HOT_HEAD + HOT_TAIL) return messages;
    const head = messages.slice(0, HOT_HEAD);
    const tail = messages.slice(-HOT_TAIL);
    const middleCount = messages.length - HOT_HEAD - HOT_TAIL;
    return [...head, { role: 'assistant', content: `[CONVERSATION SUMMARY: ${middleCount} earlier messages omitted. First ${HOT_HEAD} and last ${HOT_TAIL} messages shown in full.]` }, ...tail];
}

// ── OpenAI HTTP call ──────────────────────────────────────────────────────────
async function openAICall(key, messages, model, maxTokens = 2000, signal = null) {
    const response = await fetch(OPENAI_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_completion_tokens: maxTokens }),
        ...(signal ? { signal } : {})
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return { content: data.choices[0]?.message?.content || '', usage: data.usage || null };
}

// ── CTC gate ──────────────────────────────────────────────────────────────────
function shouldRunCTC(input) {
    const t = input || '';
    const patterns = [
        /\bin\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+thread\b/i,
        /\bin\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+conversation\b/i,
        /\bfrom\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+(?:thread|conversation)\b/i,
        /\b(\w+(?:\s+\w+)?)\s*:\s+/,
        /\b(?:other|another)\s+thread\b/i,
        /\bctc:/i
    ];
    return patterns.some(p => p.test(t));
}

// ── Heuristics (classifyIntent / detectCogLevel / calibrateDepth / buildDirective) ──
function classifyIntent(input) {
    const t = input.toLowerCase();
    if (/\b(remember|save to memory|add to memory|note that|store that)\b/i.test(input)) return 'MEMORY_ACTION';
    if (/\b(architect|design|system|layer|contract|schema|spec|pipeline|phase|module|interface|protocol|structure|refactor|decouple|boundary|invariant)\b/i.test(t) && t.length > 80) return 'TECHNICAL_DESIGN';
    if (/\b(review|thoughts on|assess|evaluate|what do you think|critique|feedback on|opinion on)\b/i.test(t)) return 'PARTNER_REVIEW';
    if (/\b(run|execute|do|apply|implement|build|create|write|generate|deploy|fix|update)\b/i.test(t) && t.length < 120) return 'EXECUTION_DIRECTIVE';
    if (/\b(summarize|tldr|brief|short version|in a sentence|quick summary)\b/i.test(t)) return 'SUMMARY_COMPACT';
    return 'GENERAL_QUERY';
}
function detectCogLevel(input) {
    const lengthScore = Math.min(input.length / 300, 3);
    const abstractTerms = (input.match(/\b(system|architecture|deterministic|governance|modular|inference|boundary|schema|contract|latency|invariant|substrate|canonical|decoupled|coherent|abstraction)\b/gi) || []).length;
    const metaSignals = (input.match(/\b(blueprint|spec|control law|failure mode|audit|pipeline|heuristic|phase|layer|protocol|invariant|receipt|validation)\b/gi) || []).length;
    return Math.min(10, 3 + lengthScore + abstractTerms * 0.5 + metaSignals * 0.75);
}
function calibrateDepth(intent, cogLevel) {
    if (intent === 'SUMMARY_COMPACT') return 'COMPACT';
    const elevated = Math.min(10, cogLevel + 0.75);
    if (elevated <= 3) return 'STANDARD';
    if (elevated <= 7) return 'STANDARD';
    return 'LAYERED';
}
function buildDirective(intent, depth, cogLevel) {
    if (intent === 'MEMORY_ACTION') return '';
    const posture = `\nRESPONSE POSTURE (apply silently): Write flowing prose. No praise openers. No CRM framing. Architect-level tone. Shared ownership where appropriate.\n`;
    const depthMap = { COMPACT: 'Respond concisely — one to three sentences.', STANDARD: 'Respond with natural paragraphing. Logical sequencing.', LAYERED: 'Full analytical depth. Address each logical layer.' };
    return posture + `DEPTH: ${depthMap[depth] || depthMap.STANDARD}\n`;
}

// ── Memory detection ──────────────────────────────────────────────────────────
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
    /\b(?:search saved|search what I saved|what have I saved|find in memory|recall what you saved)\b/i,
];
const VAGUE_WORDS = new Set(['this','these','that','them','it','things','thing','too','also','as','well','please','ok','okay','all','of','right','yes','yep','yeah']);
const PRONOUN_PATTERN = /\b(she|he|they|her|him|them|it)\b/i;

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

// ── Request router (dead code — preserved per TSB-032) ────────────────────────
const CHEAP_MODEL_NAME = 'gpt-4o-mini';
function routeRequest(input, hIntent, cogLevel) {
    const t = (input || '').toLowerCase();
    const inputLen = input.length;
    const qualityCritical = (
        hIntent === 'TECHNICAL_DESIGN' || cogLevel >= 7 ||
        /\b(debug|debugging|refactor|refactoring|blueprint|tsb|invariant|governance|root cause|diagnose|stack trace|pipeline design|control law|phase \d|tier \d)\b/i.test(input)
    );
    if (qualityCritical) return { route: 'GPT_5_2', model: 'gpt-5.2', route_reason: `quality_critical hIntent=${hIntent} cogLevel=${cogLevel.toFixed(1)}` };
    const neverCheap = /\b(debug|fix|refactor|architect|deploy|security|auth|permission|role|blueprint|tsb|invariant|schema|contract|phase|pipeline)\b/i.test(t);
    const cheapSignal = (
        (hIntent === 'SUMMARY_COMPACT' && inputLen < 1500) ||
        /\b(reformat|bullet(ed)?|extract links?|extract urls?|rephrase|copy variant|one sentence|tldr|summarize this|list the links|what links|short version)\b/i.test(t) ||
        (inputLen < 120 && hIntent === 'GENERAL_QUERY' && cogLevel < 4)
    );
    if (cheapSignal && !neverCheap) return { route: 'CHEAP_MODEL', model: CHEAP_MODEL_NAME, route_reason: `low_risk hIntent=${hIntent} cogLevel=${cogLevel.toFixed(1)} len=${inputLen}` };
    return { route: 'GPT_5_2', model: 'gpt-5.2', route_reason: `default hIntent=${hIntent} cogLevel=${cogLevel.toFixed(1)}` };
}

// ── Repo command detection ────────────────────────────────────────────────────
function detectRepoCommand(input) {
    const t = (input || '').trim();
    const listMatch = t.match(/^(?:list|ls)(?:\s+(.+))?$/i);
    if (listMatch) {
        const rawPath = (listMatch[1] || '/').trim().replace(/^['"]+|['"]+$/g, '');
        return { op: 'list', path: rawPath === '/' ? '' : rawPath };
    }
    const readMatch = t.match(/^(?:open|show|read|cat)\s+(.+?)(?:\s+--offset\s+(\d+))?$/i);
    if (readMatch) {
        return {
            op: 'read',
            path: readMatch[1].trim().replace(/^['"]+|['"]+$/g, ''),
            offset: readMatch[2] ? parseInt(readMatch[2], 10) : 0
        };
    }
    return null;
}

// ── MBCR tag extraction ───────────────────────────────────────────────────────
// UNLOCK_TOKEN: CAOS_PHASE4_PR1_MBCR_v1_2026-03-12
const MBCR_TAG_PATTERNS = [
    { tag: 'PR2', re: /\bPR2\b/i }, { tag: 'PR3', re: /\bPR3\b/i },
    { tag: 'LOCKED', re: /\bLOCKED\b/i }, { tag: 'UNLOCK', re: /\bUNLOCK\b/i },
    { tag: 'ACCEPTANCE', re: /\bACCEPTANCE\b/i }, { tag: 'RECEIPTS', re: /\bRECEIPTS\b/i },
    { tag: 'EXECUTE_STEP_2', re: /\bEXECUTE_STEP_2\b/i }, { tag: 'STOP_AFTER_RECEIPTS', re: /\bSTOP_AFTER_RECEIPTS\b/i },
    { tag: 'APPROVED_SCOPE', re: /\bAPPROVED_SCOPE\b/i }, { tag: 'WAITING_FOR_APPROVAL', re: /\bWAITING_FOR_APPROVAL\b/i },
];
function extractMetadataTags(content) {
    if (!content) return [];
    return MBCR_TAG_PATTERNS.filter(({ re }) => re.test(content)).map(({ tag }) => tag);
}

// ── promptBuilder delegation ──────────────────────────────────────────────────
// TSB-023: inlined buildSystemPrompt replaced. promptBuilder is canonical source.
async function buildSystemPromptViaModule(base44, { userName, matchedMemories, userProfile, rawHistory, hDirective, hDepth, cogLevel, arcBlock, server_time, threadStateBlock }) {
    try {
        const pbPromise = base44.functions.invoke('core/promptBuilder', { userName, matchedMemories, userProfile, rawHistory, hDirective, hDepth, cogLevel, arcBlock, server_time, threadStateBlock });
        const res = await Promise.race([pbPromise, new Promise(r => setTimeout(() => r(null), 8000))]);
        if (res?.data?.systemPrompt) return res.data.systemPrompt;
    } catch (e) {
        console.warn('⚠️ [PROMPT_BUILDER_FALLBACK]', e.message);
    }
    return `You are Aria, a personal AI assistant for ${userName}.\nCURRENT_SERVER_TIME: ${server_time}\nCAOS_AUTHORITY_KV_BEGIN\nmodel_name=gpt-5.2\nweb_search_enabled=true\nfile_read_enabled=true\nfile_write_enabled=true\nimage_parse_enabled=true\nimage_gen_enabled=true\npython_enabled=true\ntts_enabled=true\nmemory_enabled=true\nCAOS_AUTHORITY_KV_END\nAll tools are enabled regardless of pipeline state.\nSession: ${rawHistory.length} messages.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — ORCHESTRATION HANDLERS
// (Large clusters extracted for main-handler readability. Zero semantic changes.)
// ═══════════════════════════════════════════════════════════════════════════════

// ── CTC pipeline handler ──────────────────────────────────────────────────────
async function handleCTC({ base44, user, input, startTime, session_id, debugMode }) {
    let arcBlock = '';
    let ctcInjectionMeta = [];
    const ctcStartTime = Date.now();
    const ctcSignalDetected = shouldRunCTC(input);
    const debug_ctc = { ctc_signal_detected: ctcSignalDetected, ctc_skipped_reason: null, ctc_elapsed_ms: 0, intent_truncated: false, intent_chars: 0, budget_exceeded_stages: [], gating_decisions: {} };
    
    if (ctcSignalDetected && (Date.now() - startTime) < BUDGET_MS) {
        try {
            const ctcInput = input.slice(0, INTENT_MAX_CHARS);
            debug_ctc.intent_truncated = input.length > INTENT_MAX_CHARS;
            debug_ctc.intent_chars = ctcInput.length;
            setStage(STAGES.CTC_INTENT);
            const intentRes = await base44.functions.invoke('context/crossThreadIntent', { input: ctcInput, session_id, user_email: user.email });
            const intentData = intentRes?.data || {};
            const hydrationStartTime = Date.now();
            if (intentData.cross_thread && intentData.thread_ids?.length > 0 &&
                (Date.now() - startTime) < BUDGET_MS &&
                (Date.now() - hydrationStartTime) < CTC_HYDRATION_BUDGET_MS) {
                setStage(STAGES.CTC_HYDRATE);
                const hydrateRes = await base44.functions.invoke('context/threadHydrator', { thread_ids: intentData.thread_ids, user_email: user.email });
                const hydrateData = hydrateRes?.data || {};
                if (hydrateData.hydrated?.length > 0 && (Date.now() - hydrationStartTime) < CTC_HYDRATION_BUDGET_MS) {
                    setStage(STAGES.ARC_ASSEMBLE);
                    const arcRes = await base44.functions.invoke('context/arcAssembler', { hydrated: hydrateData.hydrated, current_session_id: session_id, arc_token_budget: 2000 });
                    const arcData = arcRes?.data || {};
                    arcBlock = arcData.arc_block || '';
                    ctcInjectionMeta = arcData.injection_meta || [];
                    debug_ctc.ctc_elapsed_ms = Date.now() - ctcStartTime;
                    console.log('🏗️ [CTC_INJECTED]', { seeds: arcData.seeds_included, tokens: arcData.estimated_tokens, elapsed_ms: debug_ctc.ctc_elapsed_ms });
                } else if (hydrateData.hydrated?.length > 0) {
                    debug_ctc.budget_exceeded_stages.push('ARC_ASSEMBLE');
                    console.log('⏭️ [ARC_ASSEMBLE_SKIPPED] Hydration budget exceeded');
                }
            } else if (intentData.cross_thread) {
                debug_ctc.ctc_skipped_reason = (Date.now() - startTime) >= BUDGET_MS ? 'total_budget_exceeded' : 'hydration_budget_exceeded';
                debug_ctc.budget_exceeded_stages.push('CTC_HYDRATE');
                console.log('⏭️ [CTC_HYDRATE_SKIPPED]', debug_ctc.ctc_skipped_reason);
            }
        } catch (ctcErr) {
            console.warn('⚠️ [CTC_NONFATAL]', ctcErr.message);
            debug_ctc.gating_decisions.ctc_error = ctcErr.message;
        }
    } else if (!ctcSignalDetected) {
        debug_ctc.ctc_skipped_reason = 'no_explicit_signal';
        debug_ctc.gating_decisions.signal_gate = 'blocked';
        console.log('⏭️ [CTC_SKIPPED] No explicit signal detected');
    } else {
        debug_ctc.ctc_skipped_reason = 'total_budget_exceeded';
        debug_ctc.gating_decisions.time_gate = 'blocked';
        console.log('⏭️ [CTC_SKIPPED] Budget exceeded');
    }
    debug_ctc.ctc_elapsed_ms = Date.now() - ctcStartTime;
    return { arcBlock, ctcInjectionMeta, debug_ctc };
}

// ── Thread augmentations (TRH + MBCR) handler ────────────────────────────────
async function handleThreadAugmentations({ base44, session_id, input, startTime, debugMode }) {
    const execution_meta = { trh: { outcome: 'not_triggered' } };
    let trhSummaryMessage = null;
    
    // TRH stage
    const TRH_TRIGGER = /\b(pr[23]|rehydrate|catch me up|update summary|what did we decide)\b/i;
    if (session_id && TRH_TRIGGER.test(input)) {
        execution_meta.trh.triggered = true;
        execution_meta.trh.invoked = true;
        try {
            const trhRes = await Promise.race([
                base44.functions.invoke('threadRehydrate', { thread_id: session_id, user_text: input }),
                new Promise(r => setTimeout(() => r(null), 2000))
            ]);
            if (trhRes === null) {
                execution_meta.trh.outcome = 'timeout';
                console.warn('⚠️ [TRH_TIMEOUT]');
            } else if (trhRes?.data?.should_write_summary && trhRes.data.summary_text) {
                execution_meta.trh.outcome = 'wrote_summary';
                execution_meta.trh.wrote_summary = true;
                trhSummaryMessage = { role: 'assistant', content: trhRes.data.summary_text };
                execution_meta.trh.save_attempted = true;
                base44.asServiceRole.entities.Message.create({
                    conversation_id: session_id, role: 'assistant',
                    content: trhRes.data.summary_text,
                    timestamp: new Date().toISOString(),
                    metadata_tags: ['THREAD_SUMMARY']
                }).catch(e => console.warn('⚠️ [TRH_SAVE_NONFATAL]', e.message));
                if (debugMode) console.log('[TRH_INJECTED]', { chars: trhRes.data.summary_text.length });
            } else {
                const skipReason = trhRes?.data?.meta?.skipReason || trhRes?.data?.meta?.reason || null;
                execution_meta.trh.outcome = skipReason === 'fresh_summary_exists' ? 'skipped_fresh' : 'no_summary';
                execution_meta.trh.reason = skipReason;
                if (debugMode) console.log('[TRH_SKIPPED]', { reason: skipReason || 'null_response' });
            }
        } catch (e) {
            execution_meta.trh.outcome = 'error';
            execution_meta.trh.error = e.message;
            console.warn('⚠️ [TRH_NONFATAL]', e.message);
        }
    }
    
    // MBCR stage
    const NULL_MBCR = { message: null, debug: { triggered: false, tags: [], text_query: '', retrievedCount: 0, injected: false } };
    const mbcrResult = session_id
        ? await base44.functions.invoke('core/mbcrEngine', { thread_id: session_id, userText: input, debugMode }).then(r => r?.data ?? NULL_MBCR).catch(() => NULL_MBCR)
        : NULL_MBCR;
    
    return { trhSummaryMessage, mbcrInjectedMessage: mbcrResult.message, mbcrDebug: mbcrResult.debug, execution_meta };
}

// ── Inference handler ────────────────────────────────────────────────────────
async function handleInference({ base44, user, finalMessages, RESOLVED_MODEL, request_id, correlation_id, session_id, startTime }) {
    setStage(STAGES.OPENAI_CALL);
    let reply, openaiUsage;
    const inferenceStart = Date.now();
    const openaiAbort = new AbortController();
    const INFERENCE_TIMEOUT_MS = 45000;
    const openaiTimeout = setTimeout(() => openaiAbort.abort(), INFERENCE_TIMEOUT_MS);
    emitEvent(base44, request_id, session_id, startTime, 'OPENAI_CALL', 'Inference started', { data: { model: RESOLVED_MODEL, message_count: finalMessages.length } });
    
    try {
        if (user.role === 'admin') {
            const riRes = await base44.functions.invoke('core/repoInference', { messages: finalMessages, model: RESOLVED_MODEL, max_tokens: 2000 });
            reply = riRes?.data?.content;
            openaiUsage = riRes?.data?.usage || null;
        } else {
            const giRes = await base44.functions.invoke('core/generalInference', { messages: finalMessages, model: RESOLVED_MODEL, max_tokens: 2000 });
            reply = giRes?.data?.content;
            openaiUsage = giRes?.data?.usage || null;
        }
        clearTimeout(openaiTimeout);
        emitEvent(base44, request_id, session_id, startTime, 'OPENAI_CALL', 'Inference complete', { data: { reply_chars: reply?.length, prompt_tokens: openaiUsage?.prompt_tokens, completion_tokens: openaiUsage?.completion_tokens } });
    } catch (inferenceError) {
        clearTimeout(openaiTimeout);
        const latency_ms = Date.now() - startTime;
        const isTimeout = inferenceError?.name === 'AbortError' || inferenceError?.message?.includes('aborted') || inferenceError?.message?.includes('PROVIDER_TIMEOUT');
        const stage = isTimeout ? 'INFERENCE' : 'OPENAI_CALL';
        const error_code = isTimeout ? 'INFERENCE_TIMEOUT' : 'INFERENCE_FAILED';
        console.error('🔥 [INFERENCE_ERROR_ENVELOPE]', { stage, error_code, message: inferenceError.message, request_id, correlation_id, latency_ms });
        emitEvent(base44, request_id, session_id, startTime, stage, inferenceError.message, { level: 'ERROR', code: error_code, data: { is_timeout: isTimeout, latency_ms } });
        throw { latency_ms, isTimeout, stage, error_code, message: inferenceError.message };
    }
    const inferenceMs = Date.now() - inferenceStart;
    if (!reply) throw new Error('No response from OpenAI');
    return { reply, openaiUsage, inferenceMs };
}

// ── Message save handler ─────────────────────────────────────────────────────
async function handleMessageSave({ base44, session_id, input, reply, startTime }) {
    setStage(STAGES.MESSAGE_SAVE);
    if (!session_id) return { latency: Date.now() - startTime };
    
    try {
        const userTags = extractMetadataTags(input);
        const asstTags = extractMetadataTags(reply);
        await base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, file_urls: [], timestamp: new Date().toISOString(), ...(userTags.length > 0 ? { metadata_tags: userTags } : {}) });
        await base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: reply, timestamp: new Date().toISOString(), ...(asstTags.length > 0 ? { metadata_tags: asstTags } : {}) });
        console.log('✅ [MESSAGES_SAVED]', { user_tags: userTags.length, asst_tags: asstTags.length });
    } catch (e) { console.warn('⚠️ [SAVE_FAILED]', e.message); }
    return { latency: Date.now() - startTime };
}

// ── Response payload builder ─────────────────────────────────────────────────
function buildResponsePayload({ reply, request_id, correlation_id, routingDecision, RESOLVED_MODEL, server_time, responseTime, execution_meta, wcwBudget, promptTokens, wcwRemaining, hIntent, hDepth, cogLevel, rawHistory, matchedMemories, ctcInjectionMeta, tokenBreakdown, sanitize_reduction_ratio, context_post_sanitize_tokens_est, context_pre_sanitize_tokens_est, session_id, debugMode, debug_meta, tsResult, threadStateBlock, t_auth, t_profile_and_history_load, t_sanitizer, t_prompt_build, t_openai_call, t_save_messages }) {
    const response = {
        reply, mode: 'GEN', request_id, correlation_id,
        route: routingDecision.route, model_used: RESOLVED_MODEL,
        server_time, response_time_ms: responseTime, tool_calls: [],
        execution_meta,
        wcw_budget: wcwBudget, wcw_used: promptTokens, wcw_remaining: wcwRemaining,
        execution_receipt: {
            request_id, correlation_id, session_id,
            history_messages: rawHistory.length, recall_executed: matchedMemories.length > 0,
            matched_memories: matchedMemories.length, heuristics_intent: hIntent,
            heuristics_depth: hDepth, cognitive_level: cogLevel, elevation_delta: 0.75,
            model_used: RESOLVED_MODEL, route: routingDecision.route, route_reason: routingDecision.route_reason,
            latency_ms: responseTime,
            latency_breakdown: { t_auth, t_profile_and_history_load, t_sanitizer, t_prompt_build, t_openai_call, t_save_messages, t_total: responseTime },
            sanitizer_delta: { context_pre_sanitize_tokens_est, context_post_sanitize_tokens_est, sanitize_reduction_ratio },
            token_breakdown: tokenBreakdown, wcw_budget: wcwBudget,
            wcw_used: promptTokens, wcw_remaining: wcwRemaining,
            ctc_injected: ctcInjectionMeta.length > 0,
            ctc_seed_ids: ctcInjectionMeta.map(m => m.seed_id),
            ctc_injection_meta: ctcInjectionMeta,
            thread_state_used: !!threadStateBlock,
            thread_state_seq: tsResult?.data?.last_seq || null
        }
    };
    if (debugMode) response.debug_meta = debug_meta;
    return response;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — SHORT-CIRCUIT HANDLERS (REPO + MEMORY)
// (Extracted from main handler for readability. Same logic, same I/O.)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Repo command handler ──────────────────────────────────────────────────────
async function handleRepoCommand({ repoCmd, base44, user, session_id, input, request_id, correlation_id, startTime }) {
    const ghToken = Deno.env.get('GITHUB_TOKEN');
    const ghOwner = Deno.env.get('GITHUB_OWNER');
    const ghRepo  = Deno.env.get('GITHUB_REPO');
    let repoResult = null;

    if (!ghToken || !ghOwner || !ghRepo) {
        repoResult = { ok: false, error: 'GitHub secrets not configured on server' };
    } else {
        const ghHeaders = {
            'Authorization': `Bearer ${ghToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'CAOS-Chat/1.0'
        };
        const cleanPath = repoCmd.path.replace(/^\/+|\/+$/g, '');

        if (repoCmd.op === 'list') {
            const url = cleanPath
                ? `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${cleanPath}?ref=main`
                : `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents?ref=main`;
            const ghRes = await fetch(url, { headers: ghHeaders });
            if (!ghRes.ok) {
                repoResult = { ok: false, error: `GitHub ${ghRes.status}: ${await ghRes.text()}` };
            } else {
                const data = await ghRes.json();
                const items = (Array.isArray(data) ? data : [data]).map(i => ({
                    name: i.name, path: i.path, type: i.type, size: i.size || 0
                }));
                repoResult = { ok: true, path: cleanPath || '/', items };
            }
        } else {
            const offset = repoCmd.offset || 0;
            const max_bytes = 60000;
            const metaRes = await fetch(
                `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${cleanPath}?ref=main`,
                { headers: ghHeaders }
            );
            if (!metaRes.ok) {
                repoResult = { ok: false, error: `GitHub meta ${metaRes.status}` };
            } else {
                const meta = await metaRes.json();
                if (meta.type !== 'file') {
                    repoResult = { ok: false, error: `Not a file (${meta.type}) — use \`list ${cleanPath}\` to browse` };
                } else {
                    const rawRes = await fetch(meta.download_url, {
                        headers: { 'Authorization': `Bearer ${ghToken}`, 'User-Agent': 'CAOS-Chat/1.0' }
                    });
                    if (!rawRes.ok) {
                        repoResult = { ok: false, error: `Download failed: ${rawRes.status}` };
                    } else {
                        const full = await rawRes.text();
                        const chunk = full.slice(offset, offset + max_bytes);
                        const next_offset = offset + chunk.length;
                        const done = next_offset >= full.length;
                        repoResult = { ok: true, path: cleanPath, content: chunk, done, total_bytes: full.length, next_offset, sha: meta.sha };
                    }
                }
            }
        }
    }

    const cleanPath = repoCmd.path.replace(/^\/+|\/+$/g, '');
    let reply;
    if (!repoResult?.ok) {
        reply = `⚠️ Repo error: ${repoResult?.error || 'unknown error'}`;
    } else if (repoCmd.op === 'list') {
        const { items, path } = repoResult;
        const dirs  = items.filter(i => i.type === 'dir').sort((a,b) => a.name.localeCompare(b.name)).map(i => `- 📁 \`${i.path}/\``);
        const files = items.filter(i => i.type === 'file').sort((a,b) => a.name.localeCompare(b.name)).map(i => `- 📄 \`${i.path}\` (${i.size.toLocaleString()} bytes)`);
        reply = `**Listing: \`${path}\`** (${items.length} items)\n\n` + [...dirs, ...files].join('\n');
    } else {
        const { content, done, total_bytes, next_offset, sha, path } = repoResult;
        const ext = path.split('.').pop() || '';
        const chunkInfo = done
            ? `\n\n_File complete (${total_bytes?.toLocaleString()} bytes, sha: \`${sha?.slice(0,8)}\`)_`
            : `\n\n_Chunk shown: bytes 0–${next_offset?.toLocaleString()} of ${total_bytes?.toLocaleString()} total. Type \`open ${path} --offset ${next_offset}\` for next chunk._`;
        reply = `**File: \`${path}\`**\n\n\`\`\`${ext}\n${content}\n\`\`\`` + chunkInfo;
    }

    if (session_id) {
        await Promise.all([
            base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, timestamp: new Date().toISOString() }),
            base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: reply, timestamp: new Date().toISOString() })
        ]);
    }

    const canonicalPath = cleanPath || '/';
    const repoToolMeta = repoResult?.ok
        ? (repoCmd.op === 'read'
            ? { op: 'read', path: canonicalPath, done: repoResult.done, next_offset: repoResult.next_offset, total_bytes: repoResult.total_bytes }
            : { op: 'list', path: canonicalPath, item_count: repoResult.items?.length || 0 })
        : null;

    const latency_ms = Date.now() - startTime;
    const repoAuditPayload = { request_id, correlation_id, user: user.email, op: repoCmd.op, path: canonicalPath, ok: repoResult?.ok, session_id: session_id || null, latency_ms };
    console.log('📂 [REPO_TOOL_AUDIT]', JSON.stringify(repoAuditPayload));
    base44.asServiceRole.entities.ErrorLog.create({
        user_email: user.email, error_type: 'unknown',
        error_message: `[REPO_AUDIT] op=${repoCmd.op} path=${canonicalPath} ok=${repoResult?.ok}`,
        request_payload: repoAuditPayload, resolved: true
    }).catch(() => {});

    return Response.json({
        reply, mode: 'REPO_TOOL', request_id,
        repo: { op: repoCmd.op, path: canonicalPath, ok: repoResult?.ok },
        repo_tool: repoToolMeta,
        response_time_ms: latency_ms, tool_calls: []
    });
}

// ── Memory save handler ───────────────────────────────────────────────────────
async function handleMemorySave({ memorySaveSignal, userProfile, session_id, input, request_id, startTime, base44 }) {
    let saved = [], deduped = [], rejected = [];
    try {
        const existing = userProfile?.structured_memory || [];
        const newMemory = { id: crypto.randomUUID(), content: memorySaveSignal, timestamp: new Date().toISOString(), scope: 'profile', tags: [], source: 'user' };
        const isDuplicate = existing.some(m => m.content === memorySaveSignal);
        if (isDuplicate) {
            deduped = [newMemory];
        } else {
            saved = [newMemory];
            if (userProfile) {
                const updated = [...existing, newMemory];
                await base44.entities.UserProfile.update(userProfile.id, { structured_memory: updated });
            }
        }
    } catch (e) { console.warn('⚠️ [MEMORY_SAVE_INLINE_FAILED]', e.message); }

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

    return Response.json({
        reply: confirmReply, mode: 'MEMORY_SAVE', memory_saved,
        entries_created: saved.length, entry_ids,
        dedup_ids: deduped.map(e => e.id), rejected_entries: rejected,
        request_id, response_time_ms: Date.now() - startTime,
        tool_calls: [],
        execution_receipt: { request_id, session_id, memory_saved, entries_created: saved.length, latency_ms: Date.now() - startTime }
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — MAIN HANDLER (Deno.serve spine)
// ═══════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();
    const correlation_id = request_id;
    const debugMode = req.headers.get('x-caos-debug') === 'true';

    const debug_meta = {
        ctc_signal_detected: null, ctc_skipped_reason: null, ctc_elapsed_ms: 0,
        intent_truncated: false, intent_chars: 0,
        budget_exceeded_stages: [], time_checks: {}, gating_decisions: {}
    };

    let body = null;
    let user = null;

    try {
        const base44 = createClientFromRequest(req);

        // ── STAGE: AUTH ───────────────────────────────────────────────────────
        setStage(STAGES.AUTH);
        [user, body] = await Promise.all([base44.auth.me(), req.json()]);
        if (!user || !user.email) {
            return Response.json({ reply: "Authentication required.", error: 'UNAUTHORIZED' }, { status: 401 });
        }
        const t_auth = Date.now() - startTime;

        const { input, session_id, file_urls = [] } = body;

        // ── SHORT-CIRCUIT: SESSION_RESUME sentinel ────────────────────────────
        if (input === '__SESSION_RESUME__') {
            return Response.json({ reply: null, mode: 'SESSION_RESUME_NOOP', request_id });
        }

        // ── SHORT-CIRCUIT: REPO COMMAND ───────────────────────────────────────
        const repoCmd = detectRepoCommand(input);
        if (repoCmd) {
            return await handleRepoCommand({ repoCmd, base44, user, session_id, input, request_id, correlation_id, startTime });
        }

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        console.log('🚀 [START]', { request_id, user: user.email, session_id });
        emitEvent(base44, request_id, session_id, startTime, 'START', 'Pipeline started', { data: { user: user.email, session_id } });

        // ── STAGE: PROFILE_LOAD + HISTORY_LOAD in parallel ────────────────────
        setStage(STAGES.PROFILE_LOAD);
        let userProfile = null;
        let rawHistory = [];
        try {
            const [profiles, historyMsgs] = await Promise.all([
                base44.entities.UserProfile.filter({ user_email: user.email }, '-created_date', 1),
                session_id
                    ? base44.entities.Message.filter({ conversation_id: session_id }, '-timestamp', MAX_HISTORY_MESSAGES)
                    : Promise.resolve([])
            ]);
            userProfile = profiles?.[0] || null;
            rawHistory = historyMsgs.reverse().map(m => ({ role: m.role, content: m.content }));
        } catch (e) { console.warn('⚠️ [PROFILE_HISTORY_FAILED]', e.message); }
        const t_profile_and_history_load = Date.now() - startTime;
        emitEvent(base44, request_id, session_id, startTime, 'PROFILE_LOAD', 'Profile + history loaded', { data: { history_count: rawHistory.length, has_profile: !!userProfile } });

        // ── STAGE: MEMORY_WRITE (Phase A) ─────────────────────────────────────
        setStage(STAGES.MEMORY_WRITE);
        const memorySaveSignal = detectSaveIntent(input);

        // SHORT-CIRCUIT: vague memory save
        if (memorySaveSignal === '__VAGUE__') {
            const clarifyReply = `Sure — what specifically would you like me to remember? Please share the facts and I'll save them.`;
            if (session_id) {
                await base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, timestamp: new Date().toISOString() });
                await base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: clarifyReply, timestamp: new Date().toISOString() });
            }
            return Response.json({ reply: clarifyReply, mode: 'MEMORY_CLARIFY', memory_saved: false, entries_created: 0, entry_ids: [], request_id, response_time_ms: Date.now() - startTime, tool_calls: [], execution_receipt: { request_id, session_id, memory_saved: false, latency_ms: Date.now() - startTime } });
        }

        // SHORT-CIRCUIT: pronoun memory save
        if (memorySaveSignal === '__PRONOUN__') {
            const pronoun = (input.match(PRONOUN_PATTERN) || ['they'])[0];
            const clarifyReply = `Who is "${pronoun}" referring to? I need a name before I can save this.`;
            if (session_id) {
                await base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, timestamp: new Date().toISOString() });
                await base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: clarifyReply, timestamp: new Date().toISOString() });
            }
            return Response.json({ reply: clarifyReply, mode: 'MEMORY_CLARIFY_PRONOUN', memory_saved: false, entries_created: 0, entry_ids: [], request_id, response_time_ms: Date.now() - startTime, tool_calls: [], execution_receipt: { request_id, session_id, memory_saved: false, latency_ms: Date.now() - startTime } });
        }

        // SHORT-CIRCUIT: confirmed memory save
        if (memorySaveSignal) {
            return await handleMemorySave({ memorySaveSignal, userProfile, session_id, input, request_id, startTime, base44 });
        }

        // ── STAGE: HISTORY_PREP ───────────────────────────────────────────────
        setStage(STAGES.HISTORY_PREP);
        const preChars = rawHistory.reduce((s, m) => s + (m.content?.length || 0), 0);
        const conversationHistory = compressHistory(rawHistory);
        const postChars = conversationHistory.reduce((s, m) => s + (m.content?.length || 0), 0);
        const context_pre_sanitize_tokens_est = Math.round(preChars / 4);
        const context_post_sanitize_tokens_est = Math.round(postChars / 4);
        const sanitize_reduction_ratio = preChars > 0 ? parseFloat((1 - postChars / preChars).toFixed(3)) : 0;
        const t_sanitizer = Date.now() - startTime;

        // Thread state: cache-only read — no model call, non-blocking
        const tsResult = session_id ? await base44.functions.invoke('core/threadStateBuilder', { session_id, fetch_only: true }).catch(() => null) : null;
        const tsData = tsResult?.data;
        const threadStateBlock = (tsData?.ok && tsData.last_seq >= rawHistory.length) ? tsData.block : '';

        // ── STAGE: CTC — Cross-Thread Context ────────────────────────────────
        const ctcResult = await handleCTC({ base44, user, input, startTime, session_id, debugMode });
        const { arcBlock, ctcInjectionMeta } = ctcResult;
        Object.assign(debug_meta, ctcResult.debug_ctc);

        // ── Memory recall (inlined — no network) ─────────────────────────────
        const isRecallQuery = detectRecallIntent(input);
        const structuredMemory = userProfile?.structured_memory || [];
        let matchedMemories = [];
        if (isRecallQuery && structuredMemory.length > 0) {
            const queryTerms = input.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            matchedMemories = structuredMemory.filter(m =>
                queryTerms.some(term => m.content?.toLowerCase().includes(term))
            ).slice(0, 5);
        }

        // ── STAGE: TRH + MBCR — Thread Augmentations ────────────────────────
        const augResult = await handleThreadAugmentations({ base44, session_id, input, startTime, debugMode });
        const { trhSummaryMessage, mbcrInjectedMessage, mbcrDebug, execution_meta } = augResult;

        // ── STAGE: HEURISTICS ─────────────────────────────────────────────────
        setStage(STAGES.HEURISTICS);
        const hIntent = classifyIntent(input);
        const cogLevel = detectCogLevel(input);
        const hDepth = calibrateDepth(hIntent, cogLevel);
        const hDirective = buildDirective(hIntent, hDepth, cogLevel);

        // Static routing (routeRequest() preserved as dead code — TSB-032)
        const RESOLVED_MODEL = ACTIVE_MODEL;
        const routingDecision = { route: 'standard', route_reason: 'static_model', model: ACTIVE_MODEL };
        console.log('🎛️ [HEURISTICS]', { intent: hIntent, depth: hDepth, cognitive_level: cogLevel });
        emitEvent(base44, request_id, session_id, startTime, 'HEURISTICS', `intent=${hIntent} depth=${hDepth} cog=${cogLevel.toFixed(1)}`, { data: { intent: hIntent, depth: hDepth, cognitive_level: cogLevel } });

        // ── STAGE: PROMPT_BUILD ───────────────────────────────────────────────
        const userName = userProfile?.preferred_name || user.full_name || 'the user';
        const server_time = new Date().toISOString();
        const systemPrompt = await buildSystemPromptViaModule(base44, { userName, matchedMemories, userProfile, rawHistory: threadStateBlock ? rawHistory.slice(-15) : rawHistory, hDirective, hDepth, cogLevel, arcBlock, server_time, threadStateBlock });
        const t_prompt_build = Date.now() - startTime;

        // ── STAGE: OPENAI_CALL — assemble messages + run inference ──────────────
        setStage(STAGES.OPENAI_CALL);
        const userMessageContent = [];
        userMessageContent.push({ type: 'text', text: input });
        if (file_urls && file_urls.length > 0) {
            file_urls.forEach(url => {
                if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                    userMessageContent.push({ type: 'image_url', image_url: { url } });
                }
            });
        }

        const trhMetaMarker = { role: 'system', content: `EXECUTION_META_TRH:${JSON.stringify(execution_meta.trh)}` };
        const finalMessages = [
            { role: 'system', content: systemPrompt },
            trhMetaMarker,
            ...(trhSummaryMessage ? [trhSummaryMessage] : []),
            ...(mbcrInjectedMessage ? [mbcrInjectedMessage] : []),
            ...conversationHistory,
            { role: 'user', content: userMessageContent.length === 1 ? input : userMessageContent }
        ];
        const sysMsgs = finalMessages.filter(m => m.role === 'system');

        console.log('AUDIT_BUILD', { BUILD_ID, request_id, session_id });
        console.log('AUDIT_SYSTEM', {
            BUILD_ID, system_message_count: sysMsgs.length,
            has_begin: systemPrompt.includes('CAOS_AUTHORITY_KV_BEGIN'),
            has_model: systemPrompt.includes('model_name='),
            has_token: systemPrompt.includes('token_limit='),
            has_web: systemPrompt.includes('web_search_enabled='),
            has_file: systemPrompt.includes('file_read_enabled='),
            has_image_gen: systemPrompt.includes('image_gen_enabled='),
            has_python: systemPrompt.includes('python_enabled='),
            has_tts: systemPrompt.includes('tts_enabled='),
            has_memory: systemPrompt.includes('memory_enabled='),
            built_via: 'promptBuilder',
        });
        emitEvent(base44, request_id, session_id, startTime, 'PROMPT_BUILT', 'System prompt built via promptBuilder', { data: { prompt_chars: systemPrompt.length, thread_state_used: !!threadStateBlock } });

        let reply, openaiUsage, inferenceMs, t_openai_call;
        try {
            const inferResult = await handleInference({ base44, user, finalMessages, RESOLVED_MODEL, request_id, correlation_id, session_id, startTime });
            reply = inferResult.reply;
            openaiUsage = inferResult.openaiUsage;
            inferenceMs = inferResult.inferenceMs;
            t_openai_call = inferenceMs;
        } catch (inferenceError) {
            if (inferenceError.latency_ms !== undefined) {
                return Response.json({
                    ok: false, error_code: inferenceError.error_code, stage: inferenceError.stage, message: inferenceError.message,
                    request_id, correlation_id, latency_ms: inferenceError.latency_ms, retryable: inferenceError.isTimeout,
                    mode: 'ERROR', response_time_ms: inferenceError.latency_ms
                }, { status: inferenceError.isTimeout ? 504 : 502 });
            }
            throw inferenceError;
        }

        if (debugMode) {
            const mbcrHeader = `[MBCR] triggered=${mbcrDebug.triggered} retrieved=${mbcrDebug.retrievedCount} injected=${mbcrDebug.injected} tags=[${mbcrDebug.tags.join(',')}] query="${mbcrDebug.text_query}"\n\n`;
            reply = mbcrHeader + reply;
        }

        // WCW instrumentation
        const wcwBudget = MODEL_CONTEXT_WINDOW[ACTIVE_MODEL] || 128000;
        const promptTokens = openaiUsage?.prompt_tokens || 0;
        const completionTokens = openaiUsage?.completion_tokens || 0;
        const totalTokens = openaiUsage?.total_tokens || 0;
        const wcwRemaining = wcwBudget - promptTokens;
        const tokenBreakdown = { system_prompt_tokens: null, history_tokens: null, user_input_tokens: null, total_prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens };
        console.log('📊 [WCW]', { wcw_budget: wcwBudget, prompt_tokens: promptTokens, wcw_remaining: wcwRemaining });
        console.log('✅ [INFERENCE_SUCCESS]', { replyLength: reply.length });

        // ── MESSAGE_SAVE + RESPONSE_BUILD ────────────────────────────────────
        const saveResult = await handleMessageSave({ base44, session_id, input, reply, startTime });
        const t_save_messages = saveResult.latency;
        const responseTime = Date.now() - startTime;

        setStage(STAGES.RESPONSE_BUILD);

        // Fire-and-forget: thread state builder for next turn (non-blocking)
        if (session_id && rawHistory.length >= 4) base44.functions.invoke('core/threadStateBuilder', { session_id, last_seq: rawHistory.length, messages: rawHistory.slice(-40) }).catch(() => {});

        // Fire-and-forget: auto-title new threads
        base44.functions.invoke('autoTitleThread', { session_id, user_input: input }).catch(e => console.warn('⚠️ [AUTO_TITLE_NONFATAL]', e?.message));

        // Fire-and-forget: receipt writer (I2 best-effort — TSB-021 open)
        base44.functions.invoke('core/receiptWriter', {
            request_id, correlation_id, session_id, model_used: RESOLVED_MODEL,
            route: routingDecision.route, route_reason: routingDecision.route_reason,
            wcw_budget: wcwBudget, wcw_used: promptTokens, wcw_remaining: wcwRemaining,
            heuristics_intent: hIntent, heuristics_depth: hDepth, cognitive_level: cogLevel,
            history_messages: rawHistory.length, recall_executed: matchedMemories.length > 0,
            matched_memories: matchedMemories.length,
            ctc_injected: ctcInjectionMeta.length > 0,
            ctc_seed_ids: ctcInjectionMeta.map(m => m.seed_id),
            ctc_injection_meta: ctcInjectionMeta,
            latency_breakdown: { t_auth, t_profile_and_history_load, t_sanitizer, t_prompt_build, t_openai_call, t_save_messages, t_total: responseTime },
            sanitizer_delta: { context_pre_sanitize_tokens_est, context_post_sanitize_tokens_est, sanitize_reduction_ratio },
            token_breakdown: tokenBreakdown,
            user_email: user.email
        }).catch(e => console.error('🔥 [RECEIPT_WRITE_FAIL_NONFATAL]', e?.message || e));

        // Phase 3.1: anchor auto-extraction DISABLED (lock active)
        console.log('🔒 [ANCHOR_EXTRACTION_DISABLED] Phase 3.1 lock active');
        emitEvent(base44, request_id, session_id, startTime, 'PIPELINE_COMPLETE', 'Pipeline complete', { data: { duration_ms: responseTime, wcw_used: promptTokens, wcw_remaining: wcwRemaining } });
        console.log('🎯 [PIPELINE_COMPLETE_v2]', { request_id, correlation_id, duration: responseTime });

        const response = buildResponsePayload({
            reply, request_id, correlation_id, routingDecision, RESOLVED_MODEL, server_time: new Date().toISOString(), responseTime, execution_meta,
            wcwBudget, promptTokens, wcwRemaining, hIntent, hDepth, cogLevel, rawHistory, matchedMemories, ctcInjectionMeta, tokenBreakdown,
            sanitize_reduction_ratio, context_post_sanitize_tokens_est, context_pre_sanitize_tokens_est, session_id, debugMode, debug_meta, tsResult, threadStateBlock,
            t_auth, t_profile_and_history_load, t_sanitizer, t_prompt_build, t_openai_call, t_save_messages
        });

        return Response.json(response);

    } catch (error) {
        const latency_ms = Date.now() - startTime;
        try {
            const base44 = createClientFromRequest(req);
            await base44.functions.invoke('core/errorEnvelopeWriter', {
                error_message: error.message, stage: getStage(),
                request_id, correlation_id,
                session_id: body?.session_id || null,
                user_email: user?.email || null,
                model_used: ACTIVE_MODEL, latency_ms
            });
        } catch (_) {}
        console.error('🔥 [PIPELINE_ERROR]', { stage: getStage(), message: error.message, latency_ms });
        try { emitEvent(createClientFromRequest(req), request_id, body?.session_id || null, startTime, getStage() || 'UNKNOWN', error.message, { level: 'ERROR', code: 'PIPELINE_ERROR', data: { latency_ms } }); } catch (_) {}
        return Response.json({
            reply: "Something went wrong. Please try again.",
            error_code: 'SERVER_ERROR', stage: getStage(),
            request_id, correlation_id, mode: 'ERROR', response_time_ms: latency_ms,
        }, { status: 500 });
    }
});