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
// REDEPLOY: Force env var capture (2026-03-29)

const BUILD_ID = "HM_SELF_DESCRIBE_V1_2026-03-02";
const ACTIVE_MODEL = 'gpt-5.2';
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const MAX_HISTORY_MESSAGES = 40;
const HOT_TAIL = 40;
const HOT_HEAD = 15;
const BUDGET_MS = 1500;
const CTC_HYDRATION_BUDGET_MS = 800;
const INTENT_MAX_CHARS = 5000;
const MODEL_CONTEXT_WINDOW = {
    'gpt-5.2': 200000, 'gpt-5.4': 200000, 'gpt-5': 200000,
    'gpt-4o': 128000, 'gpt-4o-mini': 128000, 'gpt-4-turbo': 128000,
    'gpt-4': 8192, 'gpt-3.5-turbo': 16385,
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

// ── Repo command detection ────────────────────────────────────────────────────
function detectRepoCommand(input) {
    const raw = (input || '').trim();
    if (!raw || raw.includes('\n')) return null;
    const t = raw;
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
async function buildSystemPromptViaModule(base44, { userName, matchedMemories, userProfile, rawHistory, hDirective, hDepth, cogLevel, arcBlock, server_time, threadStateBlock, resolvedModel, inferenceProvider }) {
    try {
        const pbPromise = base44.functions.invoke('core/promptBuilder', { userName, matchedMemories, userProfile, rawHistory, hDirective, hDepth, cogLevel, arcBlock, server_time, threadStateBlock, resolvedModel, inferenceProvider });
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
    const NULL_MBCR = { message: null, debug: { triggered: false, tags: [], text_query: '', retrievedCount: 0, injected: false } };

    // TRH and MBCR have no data dependency on each other — launch concurrently.
    const TRH_TRIGGER = /\b(pr[23]|rehydrate|catch me up|update summary|what did we decide)\b/i;
    const trhTriggered = session_id && TRH_TRIGGER.test(input);

    const trhPromise = trhTriggered
        ? Promise.race([
            base44.functions.invoke('threadRehydrate', { thread_id: session_id, user_text: input }),
            new Promise(r => setTimeout(() => r(null), 2000))
          ]).catch(e => ({ _error: e.message }))
        : Promise.resolve(null);

    const mbcrPromise = session_id
        ? base44.functions.invoke('core/mbcrEngine', { thread_id: session_id, userText: input, debugMode })
            .then(r => r?.data ?? NULL_MBCR).catch(() => NULL_MBCR)
        : Promise.resolve(NULL_MBCR);

    const [trhSettled, mbcrResult] = await Promise.all([trhPromise, mbcrPromise]);

    // Resolve TRH outcome from settled result
    let trhSummaryMessage = null;
    if (trhTriggered) {
        execution_meta.trh.triggered = true;
        execution_meta.trh.invoked = true;
        const trhRes = trhSettled;
        if (trhRes === null) {
            execution_meta.trh.outcome = 'timeout';
            console.warn('⚠️ [TRH_TIMEOUT]');
        } else if (trhRes?._error) {
            execution_meta.trh.outcome = 'error';
            execution_meta.trh.error = trhRes._error;
            console.warn('⚠️ [TRH_NONFATAL]', trhRes._error);
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
    }

    return { trhSummaryMessage, mbcrInjectedMessage: mbcrResult.message, mbcrDebug: mbcrResult.debug, execution_meta };
}

// ── Provider Guardrails Feature Flag ─────────────────────────────────────────
// ROLLBACK: set ENABLE_PROVIDER_GUARDRAILS = false to bypass all enforcement gates
const ENABLE_PROVIDER_GUARDRAILS = true;

// ── RIA Feature Flag ─────────────────────────────────────────────────────────
// ROLLBACK: set FF_RIA_INFERENCE_SPINE = false
const FF_RIA_INFERENCE_SPINE = false; // ROLLBACK: set true to re-enable RIA tiers

// Tier 3 — local responder (no provider, always succeeds)
function tier3Reply(request_id) {
    return {
        content: `⚠️ I'm temporarily unable to reach my inference provider. Please retry in a moment. [request_id: ${request_id}]`,
        usage: null,
        degraded: true,
        fallback_tier: 3,
        provider: 'local',
    };
}

// ── Inference handler ────────────────────────────────────────────────────────
async function handleInference({ base44, user, finalMessages, RESOLVED_MODEL, request_id, correlation_id, session_id, startTime, preferredProvider, openaiKey }) {
    const provider = preferredProvider || 'openai';
    const stage = provider === 'grok' ? 'GROK_CALL' : 'OPENAI_CALL';
    setStage(stage);
    let reply, openaiUsage, degraded = false, fallback_tier = null, providerUsed = provider;
    const inferenceStart = Date.now();
    const INFERENCE_TIMEOUT_MS = 120000;
    const openaiAbort = new AbortController();
    const openaiTimeout = setTimeout(() => openaiAbort.abort(), INFERENCE_TIMEOUT_MS);
    const timeoutRace = new Promise((_, rej) =>
        openaiAbort.signal.addEventListener('abort', () => rej(new Error('PROVIDER_TIMEOUT')), { once: true })
    );
    emitEvent(base44, request_id, session_id, startTime, stage, 'Inference started', { data: { model: RESOLVED_MODEL, message_count: finalMessages.length, provider } });

    const invokeInference = async (model) => {
        const res = await base44.functions.invoke('core/invokeInference', {
            model,
            messages: finalMessages,
            user_role: user.role,
            openai_key: openaiKey,
        });
        if (!res?.data?.ok) throw new Error(res?.data?.error || 'invokeInference failed');
        return { content: res.data.content, usage: res.data.usage || null };
    };

    try {
        // ── Tier 1: primary provider ─────────────────────────────────────────
        let tier1Result = null;
        let tier1Error = null;
        try {
            tier1Result = await Promise.race([invokeInference(RESOLVED_MODEL), timeoutRace]);
            clearTimeout(openaiTimeout);
        } catch (e) {
            tier1Error = e;
            clearTimeout(openaiTimeout);
        }

        // Classify auth failures from upstream invokes before treating as inference errors
        if (tier1Error) {
            const errMsg = tier1Error?.message || '';
            const isUnauth = errMsg.includes('403') || errMsg.includes('401') || errMsg.includes('Forbidden') || errMsg.includes('Unauthorized');
            if (isUnauth) {
                throw { latency_ms: Date.now() - startTime, isTimeout: false, stage: 'AUTH', error_code: 'UNAUTHENTICATED', message: tier1Error.message };
            }
        }

        if (tier1Result?.content) {
            reply = tier1Result.content;
            openaiUsage = tier1Result.usage;
            providerUsed = provider;
        } else {
            // RIA disabled — propagate original error
            if (tier1Error) throw tier1Error;
            throw new Error('No response from provider');
        }

        emitEvent(base44, request_id, session_id, startTime, stage, 'Inference complete', { data: { reply_chars: reply?.length, prompt_tokens: openaiUsage?.prompt_tokens, degraded, fallback_tier, provider: providerUsed } });
    } catch (inferenceError) {
        clearTimeout(openaiTimeout);
        const latency_ms = Date.now() - startTime;
        // Preserve pre-classified errors (e.g. UNAUTHENTICATED thrown by auth guard above)
        if (inferenceError?.error_code && inferenceError?.stage) {
            throw { ...inferenceError, latency_ms };
        }
        const isTimeout = inferenceError?.name === 'AbortError' || inferenceError?.message?.includes('aborted') || inferenceError?.message?.includes('PROVIDER_TIMEOUT');
        if (isTimeout) {
            clearTimeout(openaiTimeout);
            console.warn('⚠️ [INFERENCE_TIMEOUT_ABSORBED]', { request_id, latency_ms });
            emitEvent(base44, request_id, session_id, startTime, 'INFERENCE', 'Provider timeout — degraded local reply', { level: 'WARN', code: 'INFERENCE_TIMEOUT', data: { latency_ms } });
            return { reply: tier3Reply(request_id).content, openaiUsage: null, inferenceMs: Date.now() - inferenceStart, degraded: true, fallback_tier: 'TIER_3_TIMEOUT', provider: 'local' };
        }
        const errMsg = inferenceError?.message || '';
        const isProviderServerFailure = errMsg.includes('status code 500') || errMsg.includes('OpenAI 500') || errMsg.includes('OPENAI_ERROR') || errMsg.includes('status code 502') || errMsg.includes('status code 503');
        if (isProviderServerFailure) {
            console.warn('⚠️ [PROVIDER_500_ABSORBED]', { request_id, latency_ms, message: errMsg });
            emitEvent(base44, request_id, session_id, startTime, stage, 'Provider server failure — degraded local reply', { level: 'WARN', code: 'PROVIDER_SERVER_FAILURE', data: { is_timeout: false, latency_ms } });
            return { reply: tier3Reply(request_id).content, openaiUsage: null, inferenceMs: Date.now() - inferenceStart, degraded: true, fallback_tier: 'TIER_3_PROVIDER_500', provider: 'local' };
        }
        const errStage = stage;
        const error_code = 'INFERENCE_FAILED';
        console.error('🔥 [INFERENCE_ERROR_ENVELOPE]', { stage: errStage, error_code, message: inferenceError.message, request_id, correlation_id, latency_ms });
        emitEvent(base44, request_id, session_id, startTime, errStage, inferenceError.message, { level: 'ERROR', code: error_code, data: { is_timeout: false, latency_ms } });
        throw { latency_ms, isTimeout: false, stage: errStage, error_code, message: inferenceError.message };
    }
    const inferenceMs = Date.now() - inferenceStart;
    if (!reply) throw new Error('No response from provider');
    return { reply, openaiUsage, inferenceMs, degraded, fallback_tier, provider: providerUsed };
}

// ── RIA: Resilient Inference Wrapper ─────────────────────────────────────────
// Phase 2: wraps handleInference with tiered fallback under FF_RIA_INFERENCE_SPINE.
// LOCK_SIGNATURE: CAOS_RIA_WRAPPER_v1_2026-03-23
// Call-site: replace handleInference(...) with resilientInference(...)
// Tier 1 = primary provider (handleInference)
// Tier 2 = backup provider (gated by FF_GROK_PROVIDER_ENABLED, currently disabled)
// Tier 3 = local responder (always succeeds, degraded=true)
// Dev switch: forceTier1Fail (admin-only, body param _dev_force_tier1_fail)
async function resilientInference({ FF_RIA_INFERENCE_SPINE, forceTier1Fail = false, openaiKey, ...inferArgs }) {
    inferArgs.openaiKey = openaiKey;
    let tier1Error = null;

    // ── Tier 1 ───────────────────────────────────────────────────────────────
    if (!forceTier1Fail) {
        try {
            const result = await handleInference(inferArgs);
            return { ...result, degraded: false, fallback_tier: 'TIER_1' };
        } catch (e) {
            tier1Error = e;
        }
    } else {
        tier1Error = { latency_ms: Date.now() - inferArgs.startTime, isTimeout: false, stage: 'OPENAI_CALL', error_code: 'INFERENCE_FAILED', message: '[DEV] Forced Tier 1 failure' };
        console.warn('⚠️ [RIA_FORCE_TIER1_FAIL] Dev switch active');
    }

    // If RIA spine is off AND this is NOT a dev-forced test — propagate Tier 1 error as baseline
    if (!FF_RIA_INFERENCE_SPINE && !forceTier1Fail) {
        throw tier1Error;
    }

    // ── Tier 2 (future: backup provider — currently disabled) ────────────────
    // FF_GROK_PROVIDER_ENABLED=false, so Tier 2 is skipped in all current configs
    console.warn('⚠️ [RIA_TIER1_FAILED] Tier 2 skipped (provider disabled) → Tier 3', { reason: tier1Error?.message });

    // ── Tier 3: local responder — always succeeds ────────────────────────────
    console.warn('⚠️ [RIA_TIER3] Activating local responder');
    const localReply = `⚠️ I'm temporarily unable to reach my inference provider. Please retry in a moment. [request_id: ${inferArgs.request_id}]`;
    return {
        reply: localReply,
        openaiUsage: null,
        inferenceMs: Date.now() - inferArgs.startTime,
        degraded: true,
        fallback_tier: 'TIER_3_LOCAL',
        provider: 'local',
    };
}

// ── Message save handler ─────────────────────────────────────────────────────
async function handleMessageSave({ base44, session_id, input, reply, startTime, provider }) {
    setStage(STAGES.MESSAGE_SAVE);
    if (!session_id) return { latency: Date.now() - startTime };
    
    try {
        const userTags = extractMetadataTags(input);
        const asstTags = extractMetadataTags(reply);
        await Promise.all([
            base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, file_urls: [], timestamp: new Date().toISOString(), ...(userTags.length > 0 ? { metadata_tags: userTags } : {}) }),
            base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: reply, timestamp: new Date().toISOString(), inference_provider: provider || 'openai', response_time_ms: Date.now() - startTime, ...(asstTags.length > 0 ? { metadata_tags: asstTags } : {}) }),
        ]);
        console.log('✅ [MESSAGES_SAVED]', { user_tags: userTags.length, asst_tags: asstTags.length, provider });
    } catch (e) { console.warn('⚠️ [SAVE_FAILED]', e.message); }
    return { latency: Date.now() - startTime };
}

// ── WCW builders extracted → core/responsePayloadBuilder ─────────────────────
// buildWcwAudit, buildWcwStateV1, buildWcwTurnV1 removed. See extraction receipt.

// ── Contract-compliant error response builder ────────────────────────────────
// Phase 1.2: all hybridMessage failure paths must emit the v1 envelope
function respondError({ error_code, stage, message, retryable = false, request_id, correlation_id, elapsed_ms }) {
    const STATUS_MAP = {
        UNAUTHENTICATED: 401,
        INFERENCE_TIMEOUT: 504,
        FEATURE_DISABLED: 503,
    };
    const status = STATUS_MAP[error_code] || 502;
    return Response.json({
        ok: false,
        degraded: false,
        error_code,
        stage,
        message: message || error_code,
        retryable: !!retryable,
        request_id,
        correlation_id: correlation_id || request_id,
        data: { reply: null },
        diagnostic_receipt: {
            tool: 'hybridMessage',
            stage,
            elapsed_ms: elapsed_ms ?? null,
            provider_elapsed_ms: null,
            model: null,
            fallback_tier: null,
        },
        mode: 'ERROR',
        response_time_ms: elapsed_ms ?? null,
    }, { status });
}

// ── Contract-compliant success response builder ──────────────────────────────
// Phase 2.1: all hybridMessage success paths must emit the v1 envelope.
// Contract fields win; ...rest carries backward-compat additive fields.
function respondOk({ request_id, correlation_id, stage, degraded, message, data, diagnostic_receipt, execution_receipt, ...rest }) {
    return Response.json({
        ok: true,
        request_id,
        correlation_id: correlation_id || request_id,
        stage,
        error_code: null,
        message: message ?? (degraded ? 'Primary inference unavailable; fallback used.' : null),
        retryable: false,
        degraded: degraded || false,
        data,
        diagnostic_receipt,
        execution_receipt,
        ...rest,
    });
}

// ── buildResponsePayload extracted → core/responsePayloadBuilder ──────────────
// Removed. See extraction receipt.

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — SHORT-CIRCUIT HANDLERS (REPO + MEMORY)
// (Extracted from main handler for readability. Same logic, same I/O.)
// ═══════════════════════════════════════════════════════════════════════════════

// ── handleRepoCommand + mapChatPathToGitPath extracted → core/repoCommandHandler ──
// Removed. See extraction receipt CAOS_REPO_COMMAND_HANDLER_v1_2026-04-05.

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

        const { input, session_id, file_urls = [], _dev_force_tier1_fail = false, preferred_provider: bodyProvider } = body;
        // Dev-only forced failure: admin-only, requires FF_RIA_INFERENCE_SPINE=true or explicit test
        const forceTier1Fail = _dev_force_tier1_fail === true && user.role === 'admin';

        // ── SHORT-CIRCUIT: SESSION_RESUME sentinel ────────────────────────────
        if (input === '__SESSION_RESUME__') {
            return Response.json({ reply: null, mode: 'SESSION_RESUME_NOOP', request_id });
        }

        // ── SHORT-CIRCUIT: REPO COMMAND ───────────────────────────────────────
        const repoCmd = detectRepoCommand(input);
        if (repoCmd) {
            const rpbRes = await base44.functions.invoke('core/repoCommandHandler', {
                repoCmd, session_id, input, request_id, correlation_id,
                user_email: user.email, startTime,
            });
            return Response.json(rpbRes.data);
        }

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        console.log('🚀 [START]', { request_id, user: user.email, session_id });
        emitEvent(base44, request_id, session_id, startTime, 'START', 'Pipeline started', { data: { user: user.email, session_id } });

        // ── STAGE: PROFILE_LOAD + HISTORY_LOAD + threadStateBuilder(fetch_only) in parallel ──
        setStage(STAGES.PROFILE_LOAD);
        let userProfile = null;
        let rawHistory = [];
        // threadStateBuilder(fetch_only) started here — no dependency on profile/history.
        // Awaited below only at the point threadStateBlock is consumed (post-HISTORY_PREP).
        const tsResultPromise = session_id
            ? base44.functions.invoke('core/threadStateBuilder', { session_id, fetch_only: true }).catch(() => null)
            : Promise.resolve(null);
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

        // Thread state: resolve promise started at PROFILE_LOAD — already in-flight
        const tsResult = await tsResultPromise;
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

        // Phase 2.5: provider routing — session toggle enabled
        const FF_PROVIDER_ROUTER = true;
        const FF_GROK_PROVIDER_ENABLED = false;
        // Priority: per-request body param → userProfile preference → openai default
        const preferredProvider = bodyProvider || (FF_PROVIDER_ROUTER ? (userProfile?.preferred_provider || 'openai') : 'openai');

        // If Grok selected but feature disabled — explicit error, no silent fallback
        if (FF_PROVIDER_ROUTER && preferredProvider === 'grok' && !FF_GROK_PROVIDER_ENABLED) {
            return respondError({ error_code: 'FEATURE_DISABLED', stage: 'GROK_CALL', message: 'Grok provider is not yet enabled. Please switch to OpenAI in your profile settings.', retryable: false, request_id, correlation_id, elapsed_ms: Date.now() - startTime });
        }

        const providerDefaults = {
            openai:  'gpt-5.2',
            grok:    'grok-3',
            gemini:  'models/gemini-2.5-flash',
            // Note: gpt-5.4 available at higher tier — upgrade path when confirmed cost-neutral
        };
        // Only use preferred_model override if the provider hasn't been explicitly toggled away from openai
        // i.e. if user picked gemini, always use a gemini model — never let preferred_model (which may be an openai model) override it
        const RESOLVED_MODEL = preferredProvider === 'openai' && userProfile?.preferred_model
            ? userProfile.preferred_model
            : providerDefaults[preferredProvider] || 'gpt-5.2';
        const routingDecision = { route: 'standard', route_reason: `provider=${preferredProvider}`, model: RESOLVED_MODEL };
        console.log('🎛️ [HEURISTICS]', { intent: hIntent, depth: hDepth, cognitive_level: cogLevel });
        emitEvent(base44, request_id, session_id, startTime, 'HEURISTICS', `intent=${hIntent} depth=${hDepth} cog=${cogLevel.toFixed(1)}`, { data: { intent: hIntent, depth: hDepth, cognitive_level: cogLevel } });

        // ── STAGE: PROMPT_BUILD ───────────────────────────────────────────────
        const userName = userProfile?.preferred_name || user.full_name || 'the user';
        const server_time = new Date().toISOString();
        const systemPrompt = await buildSystemPromptViaModule(base44, { userName, matchedMemories, userProfile, rawHistory: threadStateBlock ? rawHistory.slice(-15) : rawHistory, hDirective, hDepth, cogLevel, arcBlock, server_time, threadStateBlock, resolvedModel: RESOLVED_MODEL, inferenceProvider: preferredProvider });
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
        const providerNote = { role: 'system', content: `PROVIDER_CONTEXT: This turn is being handled by inference provider "${preferredProvider}" (model: ${RESOLVED_MODEL}). Prior assistant messages in history may have been generated by a different provider — treat them as valid context regardless of which engine produced them. Do not express confusion about memory gaps caused by provider switching.` };
        const finalMessages = [
            { role: 'system', content: systemPrompt },
            providerNote,
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
        let riaResult = { degraded: false, fallback_tier: 'TIER_1', provider: preferredProvider };
        try {
            const inferResult = await resilientInference({ FF_RIA_INFERENCE_SPINE, forceTier1Fail, openaiKey, base44, user, finalMessages, RESOLVED_MODEL, request_id, correlation_id, session_id, startTime, preferredProvider });
            reply = inferResult.reply;
            openaiUsage = inferResult.openaiUsage;
            inferenceMs = inferResult.inferenceMs;
            t_openai_call = inferenceMs;
            riaResult = { degraded: inferResult.degraded || false, fallback_tier: inferResult.fallback_tier ?? null, provider: inferResult.provider || preferredProvider };
        } catch (inferenceError) {
            if (inferenceError.latency_ms !== undefined) {
                return respondError({
                    error_code: inferenceError.error_code,
                    stage: inferenceError.stage,
                    message: inferenceError.message,
                    retryable: inferenceError.isTimeout || false,
                    request_id, correlation_id,
                    elapsed_ms: inferenceError.latency_ms,
                });
            }
            throw inferenceError;
        }

        console.log('🔍 [INFERENCE_RESULT_DEBUG]', { replyType: typeof reply, replyLength: reply?.length || 'NULL', hasReply: !!reply });
        
        // Fallback if reply is missing — likely inference timeout or malformed response
        if (!reply || typeof reply !== 'string') {
            reply = '⚠️ Inference timeout or incomplete response. Please try again.';
            console.warn('⚠️ [REPLY_RECOVERY] Using fallback message due to missing/invalid reply');
        }

        // ── RESPONSE REVIEWER (post-inference policy gate) ────────────────────
        // Runs Gemini Flash as a cheap/fast reviewer. Fail-open: never blocks on error.
        // Hard ceiling: 3000ms. On timeout, pipeline continues with original reply.
        // Swap reviewer model to DeepSeek-R1 on self-hosted migration.
        try {
            const reviewRes = await Promise.race([
                base44.functions.invoke('core/responseReviewer', { reply, request_id, session_id }),
                new Promise((_, rej) => setTimeout(() => rej(new Error('REVIEWER_TIMEOUT')), 3000))
            ]);
            const reviewData = reviewRes?.data;
            if (reviewData && !reviewData.clean && reviewData.corrected_reply) {
                console.warn('🚨 [REVIEWER_CORRECTED]', { violations: reviewData.violations, request_id });
                reply = reviewData.corrected_reply;
            }
        } catch (reviewErr) {
            // Non-fatal — never block the response
            if (reviewErr?.message === 'REVIEWER_TIMEOUT') {
                console.warn('⚠️ [REVIEWER_TIMEOUT]', { request_id });
            } else {
                console.warn('⚠️ [REVIEWER_SKIPPED]', reviewErr?.message);
            }
        }

        // ── PROVIDER GUARDRAILS ENFORCEMENT ──────────────────────────────────
        // ROLLBACK: set ENABLE_PROVIDER_GUARDRAILS=false above to skip all gates
        if (ENABLE_PROVIDER_GUARDRAILS) {
            // GATE A: Repo command compliance
            // If input is a repo intent, reply must be a single bare command line.
            const trimmedInput = (input || '').trim();
            const isRepoIntent = !trimmedInput.includes('\n') && /^(open|show|read|cat|ls|list)\s+\S+/i.test(trimmedInput);
            if (isRepoIntent) {
                const lines = reply.trim().split('\n').filter(l => l.trim());
                const isCompliant = lines.length === 1 && /^(open|ls)\s+\S+/i.test(lines[0].trim());
                if (!isCompliant) {
                    console.warn('⚠️ [GUARDRAIL_REPO_NONCOMPLIANT] Issuing compliance retry');
                    const nudge = `COMPLIANCE_RETRY: Your previous response did not comply with repo command absolutism. The user asked: "${input}". Output ONLY a single bare command line — nothing else. No explanation, no preamble, no markdown.`;
                    const retryMessages = [
                        ...finalMessages,
                        { role: 'assistant', content: reply },
                        { role: 'system', content: nudge }
                    ];
                    try {
                        const retryResult = await handleInference({ base44, user, finalMessages: retryMessages, RESOLVED_MODEL, request_id, correlation_id, session_id, startTime, preferredProvider, openaiKey });
                        if (retryResult?.reply) {
                            reply = retryResult.reply.trim();
                            console.log('✅ [GUARDRAIL_REPO_RETRY_SUCCESS]', { reply });
                        }
                    } catch (e) {
                        console.warn('⚠️ [GUARDRAIL_REPO_RETRY_FAILED]', e.message);
                    }
                }
            }

            // GATE B: Tool receipt header injection
            // If repo tool was used (mode=REPO_TOOL), ensure receipt header is present.
            // For non-repo turns, the model is expected to self-inject per provider addendum.
            // Platform auto-injects if missing for repo reads.
            if (isRepoIntent && !reply.startsWith('[TOOL:')) {
                reply = `[TOOL: repo_access | ACTION: ${/^ls\s/i.test(input.trim()) ? 'list' : 'read'} | PATH: ${input.trim().replace(/^(open|show|read|cat|ls|list)\s+/i, '')}]\n` + reply;
                console.log('ℹ️ [GUARDRAIL_RECEIPT_INJECTED]');
            }

            // GATE C: Truncation auto-continue
            // If reply ends with TRUNCATED_CONTINUE, issue a continuation call.
            if (reply.trimEnd().endsWith('TRUNCATED_CONTINUE')) {
                console.log('⏭️ [GUARDRAIL_TRUNCATION_CONTINUE] Issuing continuation call');
                reply = reply.replace(/TRUNCATED_CONTINUE\s*$/, '').trimEnd();
                const continueMessages = [
                    ...finalMessages,
                    { role: 'assistant', content: reply },
                    { role: 'user', content: 'continue exactly where you left off' }
                ];
                try {
                    const continueResult = await handleInference({ base44, user, finalMessages: continueMessages, RESOLVED_MODEL, request_id, correlation_id, session_id, startTime, preferredProvider, openaiKey });
                    if (continueResult?.reply) {
                        reply = reply + '\n' + continueResult.reply;
                        console.log('✅ [GUARDRAIL_CONTINUE_SUCCESS]', { total_chars: reply.length });
                    }
                } catch (e) {
                    console.warn('⚠️ [GUARDRAIL_CONTINUE_FAILED]', e.message);
                }
            }
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
        const saveResult = await handleMessageSave({ base44, session_id, input, reply, startTime, provider: preferredProvider });
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

        // ── RESPONSE_BUILD — delegate to core/responsePayloadBuilder ─────────
        const isAdmin = user.role === 'admin';
        const rpbRes = await base44.functions.invoke('core/responsePayloadBuilder', {
            reply, request_id, correlation_id, routingDecision, RESOLVED_MODEL,
            server_time: new Date().toISOString(), responseTime, execution_meta,
            wcwBudget, promptTokens, completionTokens, totalTokens, wcwRemaining, inferenceMs,
            hIntent, hDepth, cogLevel,
            rawHistory_length: rawHistory.length, matchedMemories_length: matchedMemories.length,
            ctcInjectionMeta, tokenBreakdown, sanitize_reduction_ratio,
            context_post_sanitize_tokens_est, context_pre_sanitize_tokens_est,
            session_id, debugMode, debug_meta,
            thread_state_used: !!threadStateBlock, ts_last_seq: tsResult?.data?.last_seq || null,
            t_auth, t_profile_and_history_load, t_sanitizer, t_prompt_build, t_openai_call, t_save_messages,
            riaResult, is_admin: isAdmin, finalMessages,
        });
        const { data, diagnostic_receipt, execution_receipt, additive,
                wcw_state, wcw_turn, wcwPressureScore: _wcwPressureScore } = rpbRes.data;

        // PIPELINE_COMPLETE emitEvent
        emitEvent(base44, request_id, session_id, startTime, 'PIPELINE_COMPLETE', 'Pipeline complete', {
            data: {
                duration_ms: responseTime,
                wcw_used: promptTokens,
                wcw_remaining: wcwRemaining,
                ...(isAdmin ? { wcw_turn, wcw_state } : {})
            }
        });
        console.log('🎯 [PIPELINE_COMPLETE_v2]', { request_id, correlation_id, duration: responseTime });

        // Phase 3A: ordered tool_receipts summary (additive)
        additive.tool_receipts = [
            { tool: 'auth',            ok: true,  elapsed_ms: t_auth },
            { tool: 'profile+history', ok: !!userProfile || rawHistory.length >= 0, elapsed_ms: t_profile_and_history_load, history_count: rawHistory.length },
            { tool: 'memory_detect',   ok: true,  skipped: !memorySaveSignal },
            { tool: 'ctc',             ok: true,  skipped: !ctcInjectionMeta.length, injected: ctcInjectionMeta.length > 0 },
            { tool: 'memory_recall',   ok: true,  skipped: matchedMemories.length === 0 },
            { tool: 'trh+mbcr',        ok: true,  elapsed_ms: null },
            { tool: 'prompt_build',    ok: true,  elapsed_ms: t_prompt_build },
            { tool: riaResult?.provider || preferredProvider, ok: !riaResult?.degraded, elapsed_ms: t_openai_call, degraded: riaResult?.degraded, fallback_tier: riaResult?.fallback_tier },
            { tool: 'message_save',    ok: true,  elapsed_ms: t_save_messages },
        ];
        additive.provider = riaResult?.provider || preferredProvider;

        return respondOk({
            request_id, correlation_id, stage: 'INFERENCE',
            degraded: riaResult?.degraded || false,
            message: riaResult?.degraded ? 'Primary inference unavailable; fallback used.' : null,
            data, diagnostic_receipt, execution_receipt,
            ...additive,
        });

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
        return respondError({
            error_code: 'SERVER_ERROR',
            stage: getStage() || 'UNKNOWN',
            message: error.message || 'Something went wrong. Please try again.',
            retryable: false,
            request_id, correlation_id,
            elapsed_ms: latency_ms,
        });
    }
});