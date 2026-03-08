// hybridMessage — CAOS Primary Pipeline
// LOCK_SIGNATURE: CAOS_HYBRID_MESSAGE_SPINE_v2_2026-03-01
// PIPELINE: AUTH → PROFILE_LOAD → MEMORY_WRITE → HISTORY_PREP → HEURISTICS → PROMPT_BUILD → OPENAI_CALL → MESSAGE_SAVE → RESPONSE_BUILD
// INVARIANTS: SESSION_RESUME=noop | Memory save=early return | Receipt=fire-and-forget | Model=gpt-5.2 | HOT_HEAD=15 HOT_TAIL=40
// ⚠️ FROZEN: 536 lines — OVER 400-LINE HARD LIMIT (TSB-021/TSB-024)
// GOVERNANCE: No new features. Only permitted change = adding a call/invoke to an external module.
// Next edit must be a REFACTOR to extract inlined logic OUT, not add more IN.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BUILD_ID = "HM_SELF_DESCRIBE_V1_2026-03-02";
const ACTIVE_MODEL = 'gpt-5.2';
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const MAX_HISTORY_MESSAGES = 40;
const HOT_TAIL = 40;
const HOT_HEAD = 15;
const BUDGET_MS = 1500;  // Total time budget for optional stages
const CTC_HYDRATION_BUDGET_MS = 800;  // Max time for hydrate + assemble
const INTENT_MAX_CHARS = 5000;  // Cap for CTC intent detection
const SANITIZER_MAX_CHARS = 8000;  // Cap for sanitizer input (if used)
const MODEL_CONTEXT_WINDOW = {
    'gpt-4o': 128000, 'gpt-4o-mini': 128000, 'gpt-4-turbo': 128000,
    'gpt-4': 8192, 'gpt-3.5-turbo': 16385, 'gpt-5.2': 200000, 'gpt-5': 200000,
};

// ─── STAGE TRACKER ────────────────────────────────────────────────────────────
const STAGES = { AUTH: 'AUTH', PROFILE_LOAD: 'PROFILE_LOAD', MEMORY_WRITE: 'MEMORY_WRITE', HISTORY_PREP: 'HISTORY_PREP', CTC_INTENT: 'CTC_INTENT', CTC_HYDRATE: 'CTC_HYDRATE', ARC_ASSEMBLE: 'ARC_ASSEMBLE', HEURISTICS: 'HEURISTICS', OPENAI_CALL: 'OPENAI_CALL', MESSAGE_SAVE: 'MESSAGE_SAVE', RESPONSE_BUILD: 'RESPONSE_BUILD' };
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

// ─── EXPLICIT CTC GATING (pure — no network) ──────────────────────────────────
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

// ─── INLINED HEURISTICS (pure — no network) ───────────────────────────────────
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

// ─── PROMPT BUILD — delegates to core/promptBuilder (TSB-023: 2026-03-05) ────
// Inlined buildSystemPrompt REPLACED. promptBuilder is now the canonical source.
// It carries the full capability declaration block (all tools explicit + open).
// Fallback: if promptBuilder call fails, use a minimal inline prompt.
async function buildSystemPromptViaModule(base44, { userName, matchedMemories, userProfile, rawHistory, hDirective, hDepth, cogLevel, arcBlock, server_time }) {
    try {
        const res = await base44.functions.invoke('core/promptBuilder', {
            userName, matchedMemories, userProfile, rawHistory,
            hDirective, hDepth, cogLevel, arcBlock, server_time
        });
        if (res?.data?.systemPrompt) return res.data.systemPrompt;
    } catch (e) {
        console.warn('⚠️ [PROMPT_BUILDER_FALLBACK]', e.message);
    }
    // Minimal fallback — should rarely trigger
    return `You are Aria, a personal AI assistant for ${userName}.\nCURRENT_SERVER_TIME: ${server_time}\nAll tools are enabled: web_search, file_read, file_write, image_parse, image_gen, python, tts, memory.\nSession: ${rawHistory.length} messages.`;
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

// ─── MBCR: THREAD RECOVERY (same-thread v1) ───────────────────────────────────
// LOCK_SIGNATURE: CAOS_MBCR_INJECTION_v1_2026-03-08
// Whole-word, case-insensitive regex markers for metadata_tags extraction.
// Applied to BOTH user and assistant messages before save.
const MBCR_TAG_PATTERNS = [
    { tag: 'PR2',                   re: /\bPR2\b/i },
    { tag: 'PR3',                   re: /\bPR3\b/i },
    { tag: 'LOCKED',                re: /\bLOCKED\b/i },
    { tag: 'UNLOCK',                re: /\bUNLOCK\b/i },
    { tag: 'ACCEPTANCE',            re: /\bACCEPTANCE\b/i },
    { tag: 'RECEIPTS',              re: /\bRECEIPTS\b/i },
    { tag: 'EXECUTE_STEP_2',        re: /\bEXECUTE_STEP_2\b/i },
    { tag: 'STOP_AFTER_RECEIPTS',   re: /\bSTOP_AFTER_RECEIPTS\b/i },
    { tag: 'APPROVED_SCOPE',        re: /\bAPPROVED_SCOPE\b/i },
    { tag: 'WAITING_FOR_APPROVAL',  re: /\bWAITING_FOR_APPROVAL\b/i },
];
const MBCR_INJECTION_MAX_CHARS = 6000;
const MBCR_SNIPPET_MAX_CHARS   = 500;

function extractMetadataTags(content) {
    if (!content) return [];
    return MBCR_TAG_PATTERNS.filter(({ re }) => re.test(content)).map(({ tag }) => tag);
}

// Trigger: detect "thread-reference intent" in user input.
// Returns { triggered, tags, text_query } — NO network call, pure inline.
function mbcrTriggerCheck(input) {
    const t = input || '';
    const triggered =
        /\bPR[23]\b/i.test(t) ||
        /\b(locked|unlock|lock status)\b/i.test(t) ||
        /\b(receipts|acceptance criteria|rollback plan)\b/i.test(t) ||
        /\b(continue|where are we|status|next step|what.*plan|approved_scope|waiting_for_approval|stop_after_receipts)\b/i.test(t);

    if (!triggered) return { triggered: false, tags: [], text_query: '' };

    // Infer tags from input
    const inferredTags = MBCR_TAG_PATTERNS
        .filter(({ re }) => re.test(t))
        .map(({ tag }) => tag);

    // Infer a primary keyword for text_query
    const kwMatch = t.match(/\b(PR[23]|locked|receipts|acceptance|rollback|approved_scope|waiting_for_approval)\b/i);
    const text_query = kwMatch ? kwMatch[0] : '';

    return { triggered: true, tags: inferredTags, text_query };
}

// Build the Thread Recovery injection block (raw excerpts — no LLM summarization).
function buildThreadRecoveryBlock(snippets) {
    if (!snippets || snippets.length === 0) return '';
    let block = 'THREAD RECOVERY EXCERPTS (same-thread; auto-selected):\n';
    let totalChars = block.length;
    for (const s of snippets) {
        const date = s.created_date ? new Date(s.created_date).toISOString() : 'unknown';
        const truncated = (s.content || '').slice(0, MBCR_SNIPPET_MAX_CHARS);
        const line = `[${s.role} | ${date} | ${s.id}]: ${truncated}\n`;
        if (totalChars + line.length > MBCR_INJECTION_MAX_CHARS) break;
        block += line;
        totalChars += line.length;
    }
    return block;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();
    const correlation_id = request_id;
    const debugMode = req.headers.get('x-caos-debug') === 'true' || Deno.env.get('CAOS_DEBUG_MODE') === 'true';
    
    // Debug metadata (dev-only tracking)
    const debug_meta = {
        ctc_signal_detected: null,
        ctc_skipped_reason: null,
        ctc_elapsed_ms: 0,
        intent_truncated: false,
        intent_chars: 0,
        budget_exceeded_stages: [],
        time_checks: {},
        gating_decisions: {}
    };

    let body = null;
    let user = null;

    try {
        const base44 = createClientFromRequest(req);

        // AUTH + PROFILE_LOAD in parallel
        setStage(STAGES.AUTH);
        [user, body] = await Promise.all([
            base44.auth.me(),
            req.json()
        ]);
        if (!user || !user.email) {
            return Response.json({ reply: "Authentication required.", error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const { input, session_id, file_urls = [] } = body;

        // SESSION_RESUME sentinel — noop
        if (input === '__SESSION_RESUME__') {
            return Response.json({ reply: null, mode: 'SESSION_RESUME_NOOP', request_id });
        }

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        console.log('🚀 [START]', { request_id, user: user.email, session_id });

        // ── STAGE: PROFILE_LOAD + HISTORY_LOAD in parallel ───────────────────
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

        // SAVE path — INLINED (no separate function invoke)
        if (memorySaveSignal) {
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
            return Response.json({ reply: confirmReply, mode: 'MEMORY_SAVE', memory_saved, entries_created: saved.length, entry_ids, dedup_ids: deduped.map(e => e.id), rejected_entries: rejected, request_id, response_time_ms: Date.now() - startTime, tool_calls: [], execution_receipt: { request_id, session_id, memory_saved, entries_created: saved.length, latency_ms: Date.now() - startTime } });
        }

        // ── STAGE: HISTORY_PREP — history already loaded in PROFILE_LOAD parallel ─
        setStage(STAGES.HISTORY_PREP);
        const conversationHistory = compressHistory(rawHistory);

        // ── STAGE: CTC — Cross-Thread Context (Phase 3) ───────────────────────
        // G1: Explicit gating — only run if user signal detected
        // G2: Conditional execution — skip stages if not needed
        // G4: Time budget guard — abort if >1500ms elapsed
        // G5: Separate hydration budget — max 800ms for hydrate + assemble
        let arcBlock = '';
        let ctcInjectionMeta = [];
        const ctcStartTime = Date.now();

        // G1: Check explicit CTC signal first (fast, no DB)
        const ctcSignalDetected = shouldRunCTC(input);
        debug_meta.ctc_signal_detected = ctcSignalDetected;
        
        if (ctcSignalDetected && (Date.now() - startTime) < BUDGET_MS) {
            try {
                // G3: Cap input for intent detection (preserve canonical message)
                const ctcInput = input.slice(0, INTENT_MAX_CHARS);
                const inputTruncated = input.length > INTENT_MAX_CHARS;
                debug_meta.intent_truncated = inputTruncated;
                debug_meta.intent_chars = ctcInput.length;
                
                setStage(STAGES.CTC_INTENT);
                const intentRes = await base44.functions.invoke('context/crossThreadIntent', {
                    input: ctcInput, session_id, user_email: user.email
                });
                const intentData = intentRes?.data || {};

                // G2 + G5: Only hydrate if intent found AND hydration budget available
                const hydrationStartTime = Date.now();
                if (intentData.cross_thread && intentData.thread_ids?.length > 0 && 
                    (Date.now() - startTime) < BUDGET_MS &&
                    (Date.now() - hydrationStartTime) < CTC_HYDRATION_BUDGET_MS) {
                    setStage(STAGES.CTC_HYDRATE);
                    const hydrateRes = await base44.functions.invoke('context/threadHydrator', {
                        thread_ids: intentData.thread_ids, user_email: user.email
                    });
                    const hydrateData = hydrateRes?.data || {};

                    // G2 + G5: Only assemble if seeds hydrated AND still within hydration budget
                    if (hydrateData.hydrated?.length > 0 && 
                        (Date.now() - hydrationStartTime) < CTC_HYDRATION_BUDGET_MS) {
                        setStage(STAGES.ARC_ASSEMBLE);
                        const arcRes = await base44.functions.invoke('context/arcAssembler', {
                            hydrated: hydrateData.hydrated, current_session_id: session_id, arc_token_budget: 2000
                        });
                        const arcData = arcRes?.data || {};
                        arcBlock = arcData.arc_block || '';
                        ctcInjectionMeta = arcData.injection_meta || [];
                        debug_meta.ctc_elapsed_ms = Date.now() - ctcStartTime;
                        console.log('🏗️ [CTC_INJECTED]', { seeds: arcData.seeds_included, tokens: arcData.estimated_tokens, elapsed_ms: debug_meta.ctc_elapsed_ms });
                    } else if (hydrateData.hydrated?.length > 0) {
                        debug_meta.budget_exceeded_stages.push('ARC_ASSEMBLE');
                        console.log('⏭️ [ARC_ASSEMBLE_SKIPPED] Hydration budget exceeded');
                    }
                } else if (intentData.cross_thread) {
                    debug_meta.ctc_skipped_reason = (Date.now() - startTime) >= BUDGET_MS ? 'total_budget_exceeded' : 'hydration_budget_exceeded';
                    debug_meta.budget_exceeded_stages.push('CTC_HYDRATE');
                    console.log('⏭️ [CTC_HYDRATE_SKIPPED]', debug_meta.ctc_skipped_reason);
                }
            } catch (ctcErr) {
                console.warn('⚠️ [CTC_NONFATAL]', ctcErr.message);
                debug_meta.gating_decisions.ctc_error = ctcErr.message;
            }
        } else if (!ctcSignalDetected) {
            debug_meta.ctc_skipped_reason = 'no_explicit_signal';
            debug_meta.gating_decisions.signal_gate = 'blocked';
            console.log('⏭️ [CTC_SKIPPED] No explicit signal detected');
        } else {
            debug_meta.ctc_skipped_reason = 'total_budget_exceeded';
            debug_meta.gating_decisions.time_gate = 'blocked';
            console.log('⏭️ [CTC_SKIPPED] Budget exceeded');
        }
        debug_meta.ctc_elapsed_ms = Date.now() - ctcStartTime;

        // ── MEMORY RECALL — INLINED (no function invoke) ──────────────────────
        const isRecallQuery = detectRecallIntent(input);
        const structuredMemory = userProfile?.structured_memory || [];
        let matchedMemories = [];
        if (isRecallQuery && structuredMemory.length > 0) {
            const queryTerms = input.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            matchedMemories = structuredMemory.filter(m => 
                queryTerms.some(term => m.content?.toLowerCase().includes(term))
            ).slice(0, 5);
        }

        // ── STAGE: MBCR — Thread Recovery injection (same-thread v1) ────────
        // LOCK_SIGNATURE: CAOS_MBCR_INJECTION_v1_2026-03-08
        let mbcrBlock = '';
        let mbcrMeta = { triggered: false, tags: [], text_query: '', count: 0, injected_chars: 0 };
        if (session_id) {
            const mbcrTrigger = mbcrTriggerCheck(input);
            if (mbcrTrigger.triggered) {
                try {
                    const snippetRes = await base44.functions.invoke('getThreadSnippets', {
                        thread_id: session_id,
                        tags: mbcrTrigger.tags,
                        text_query: mbcrTrigger.text_query,
                        limit: 20,
                        around: 2
                    });
                    const snippets = snippetRes?.data?.snippets || [];
                    mbcrBlock = buildThreadRecoveryBlock(snippets);
                    mbcrMeta = { triggered: true, tags: mbcrTrigger.tags, text_query: mbcrTrigger.text_query, count: snippets.length, injected_chars: mbcrBlock.length };
                    if (debugMode) console.log('[MBCR_TRIGGERED]', { tags: mbcrTrigger.tags, text_query: mbcrTrigger.text_query, count: snippets.length, injected_chars: mbcrBlock.length, ids: (snippetRes?.data?.snippets || []).map(s => s.id) });
                } catch (mbcrErr) {
                    console.warn('⚠️ [MBCR_NONFATAL]', mbcrErr.message);
                }
            } else {
                if (debugMode) console.log('[MBCR_SKIPPED] No thread-reference intent detected');
            }
        }

        // ── STAGE: HEURISTICS (inlined — no network) ─────────────────────────
        setStage(STAGES.HEURISTICS);
        const hIntent = classifyIntent(input);
        const cogLevel = detectCogLevel(input);
        const hDepth = calibrateDepth(hIntent, cogLevel);
        const hDirective = buildDirective(hIntent, hDepth, cogLevel);
        console.log('🎛️ [HEURISTICS]', { intent: hIntent, depth: hDepth, cognitive_level: cogLevel });

        // ── STAGE: PROMPT_BUILD — via core/promptBuilder (TSB-023: 2026-03-05) ─
        // Delegates to promptBuilder which carries full capability declarations.
        // No bootloader injection needed — all tools declared on every session.
        const userName = userProfile?.preferred_name || user.full_name || 'the user';
        const server_time = new Date().toISOString();
        const systemPrompt = await buildSystemPromptViaModule(base44, { userName, matchedMemories, userProfile, rawHistory, hDirective, hDepth, cogLevel, arcBlock, server_time });

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

        // Inject Thread Recovery block as a separate system message (keeps user_input pristine)
        const finalMessages = [
            { role: 'system', content: systemPrompt },
            ...(mbcrBlock ? [{ role: 'system', content: mbcrBlock }] : []),
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
            has_web: systemPrompt.includes('web_search_enabled='),
            has_file: systemPrompt.includes('file_read_enabled='),
            has_image_gen: systemPrompt.includes('image_gen_enabled='),
            has_python: systemPrompt.includes('python_enabled='),
            has_tts: systemPrompt.includes('tts_enabled='),
            has_memory: systemPrompt.includes('memory_enabled='),
            built_via: 'promptBuilder',
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

        // AUTO-TITLE: Fire-and-forget — only titles new threads with default titles
        base44.functions.invoke('autoTitleThread', {
            session_id, user_input: input
        }).catch(e => console.warn('⚠️ [AUTO_TITLE_NONFATAL]', e?.message));

        // FIX 1: Fire-and-forget — receipt is diagnostic, not functional (I2 → best-effort)
        base44.functions.invoke('core/receiptWriter', {
            request_id, correlation_id, session_id, model_used: ACTIVE_MODEL,
            wcw_budget: wcwBudget, wcw_used: promptTokens, wcw_remaining: wcwRemaining,
            heuristics_intent: hIntent, heuristics_depth: hDepth, cognitive_level: cogLevel,
            history_messages: rawHistory.length, recall_executed: matchedMemories.length > 0,
                matched_memories: matchedMemories.length,
                ctc_injected: ctcInjectionMeta.length > 0,
                ctc_seed_ids: ctcInjectionMeta.map(m => m.seed_id),
                ctc_injection_meta: ctcInjectionMeta,
                latency_breakdown: { inference_ms: inferenceMs, total_ms: responseTime },
            token_breakdown: tokenBreakdown,
            user_email: user.email
        }).catch(e => console.error('🔥 [RECEIPT_WRITE_FAIL_NONFATAL]', e?.message || e));

        // 3.1: Background anchor auto-extraction DISABLED.
        console.log('🔒 [ANCHOR_EXTRACTION_DISABLED] Phase 3.1 lock active');
        console.log('🎯 [PIPELINE_COMPLETE_v2]', { request_id, correlation_id, duration: responseTime });

        const response = {
            reply, mode: 'GEN', request_id, correlation_id,
            server_time, response_time_ms: responseTime, tool_calls: [],
            wcw_budget: wcwBudget, wcw_used: promptTokens, wcw_remaining: wcwRemaining,
            execution_receipt: {
                request_id, correlation_id, session_id,
                history_messages: rawHistory.length, recall_executed: matchedMemories.length > 0,
                matched_memories: matchedMemories.length, heuristics_intent: hIntent,
                heuristics_depth: hDepth, cognitive_level: cogLevel, elevation_delta: 0.75,
                model_used: ACTIVE_MODEL, latency_ms: responseTime,
                token_breakdown: tokenBreakdown, wcw_budget: wcwBudget,
                wcw_used: promptTokens, wcw_remaining: wcwRemaining,
                ctc_injected: ctcInjectionMeta.length > 0,
                ctc_seed_ids: ctcInjectionMeta.map(m => m.seed_id),
                ctc_injection_meta: ctcInjectionMeta
            }
        };
        
        // Dev-only debug metadata
        if (debugMode) {
            response.debug_meta = debug_meta;
        }
        
        return Response.json(response);

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