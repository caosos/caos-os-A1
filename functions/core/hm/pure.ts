// LOCK_SIGNATURE: CAOS_HM_PURE_v1_2026-03-15
// Pure helpers extracted from hybridMessage Section 4
// No I/O. No side effects. Deterministic. Safe inline per §16.1.

// ─ History compression ────────────────────────────────────────────────────
const HOT_HEAD = 15;
const HOT_TAIL = 40;

export function compressHistory(messages) {
    if (messages.length <= HOT_HEAD + HOT_TAIL) return messages;
    const head = messages.slice(0, HOT_HEAD);
    const tail = messages.slice(-HOT_TAIL);
    const middleCount = messages.length - HOT_HEAD - HOT_TAIL;
    return [...head, { role: 'assistant', content: `[CONVERSATION SUMMARY: ${middleCount} earlier messages omitted. First ${HOT_HEAD} and last ${HOT_TAIL} messages shown in full.]` }, ...tail];
}

// ─ OpenAI HTTP call ───────────────────────────────────────────────────────
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

export async function openAICall(key, messages, model, maxTokens = 2000, signal = null) {
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

// ─ CTC gate ───────────────────────────────────────────────────────────────
export function shouldRunCTC(input) {
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

// ─ Heuristics (classifyIntent / detectCogLevel / calibrateDepth / buildDirective) ──
export function classifyIntent(input) {
    const t = input.toLowerCase();
    if (/\b(remember|save to memory|add to memory|note that|store that)\b/i.test(input)) return 'MEMORY_ACTION';
    if (/\b(architect|design|system|layer|contract|schema|spec|pipeline|phase|module|interface|protocol|structure|refactor|decouple|boundary|invariant)\b/i.test(t) && t.length > 80) return 'TECHNICAL_DESIGN';
    if (/\b(review|thoughts on|assess|evaluate|what do you think|critique|feedback on|opinion on)\b/i.test(t)) return 'PARTNER_REVIEW';
    if (/\b(run|execute|do|apply|implement|build|create|write|generate|deploy|fix|update)\b/i.test(t) && t.length < 120) return 'EXECUTION_DIRECTIVE';
    if (/\b(summarize|tldr|brief|short version|in a sentence|quick summary)\b/i.test(t)) return 'SUMMARY_COMPACT';
    return 'GENERAL_QUERY';
}

export function detectCogLevel(input) {
    const lengthScore = Math.min(input.length / 300, 3);
    const abstractTerms = (input.match(/\b(system|architecture|deterministic|governance|modular|inference|boundary|schema|contract|latency|invariant|substrate|canonical|decoupled|coherent|abstraction)\b/gi) || []).length;
    const metaSignals = (input.match(/\b(blueprint|spec|control law|failure mode|audit|pipeline|heuristic|phase|layer|protocol|invariant|receipt|validation)\b/gi) || []).length;
    return Math.min(10, 3 + lengthScore + abstractTerms * 0.5 + metaSignals * 0.75);
}

export function calibrateDepth(intent, cogLevel) {
    if (intent === 'SUMMARY_COMPACT') return 'COMPACT';
    const elevated = Math.min(10, cogLevel + 0.75);
    if (elevated <= 3) return 'STANDARD';
    if (elevated <= 7) return 'STANDARD';
    return 'LAYERED';
}

export function buildDirective(intent, depth, cogLevel) {
    if (intent === 'MEMORY_ACTION') return '';
    const posture = `\nRESPONSE POSTURE (apply silently): Write flowing prose. No praise openers. No CRM framing. Architect-level tone. Shared ownership where appropriate.\n`;
    const depthMap = { COMPACT: 'Respond concisely — one to three sentences.', STANDARD: 'Respond with natural paragraphing. Logical sequencing.', LAYERED: 'Full analytical depth. Address each logical layer.' };
    return posture + `DEPTH: ${depthMap[depth] || depthMap.STANDARD}\n`;
}

// ─ Memory detection ───────────────────────────────────────────────────────
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

export function detectSaveIntent(input) {
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

export function detectRecallIntent(input) {
    return MEMORY_RECALL_TRIGGERS.some(p => p.test(input));
}

// ─ Request router (dead code — preserved per TSB-032) ────────────────────
const CHEAP_MODEL_NAME = 'gpt-4o-mini';
export function routeRequest(input, hIntent, cogLevel) {
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

// ─ Repo command detection ──────────────────────────────────────────────────
export function detectRepoCommand(input) {
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

// ─ MBCR tag extraction ─────────────────────────────────────────────────────
// UNLOCK_TOKEN: CAOS_PHASE4_PR1_MBCR_v1_2026-03-12
const MBCR_TAG_PATTERNS = [
    { tag: 'PR2', re: /\bPR2\b/i }, { tag: 'PR3', re: /\bPR3\b/i },
    { tag: 'LOCKED', re: /\bLOCKED\b/i }, { tag: 'UNLOCK', re: /\bUNLOCK\b/i },
    { tag: 'ACCEPTANCE', re: /\bACCEPTANCE\b/i }, { tag: 'RECEIPTS', re: /\bRECEIPTS\b/i },
    { tag: 'EXECUTE_STEP_2', re: /\bEXECUTE_STEP_2\b/i }, { tag: 'STOP_AFTER_RECEIPTS', re: /\bSTOP_AFTER_RECEIPTS\b/i },
    { tag: 'APPROVED_SCOPE', re: /\bAPPROVED_SCOPE\b/i }, { tag: 'WAITING_FOR_APPROVAL', re: /\bWAITING_FOR_APPROVAL\b/i },
];

export function extractMetadataTags(content) {
    if (!content) return [];
    return MBCR_TAG_PATTERNS.filter(({ re }) => re.test(content)).map(({ tag }) => tag);
}

// ─ promptBuilder delegation ────────────────────────────────────────────────
// TSB-023: inlined buildSystemPrompt replaced. promptBuilder is canonical source.
export async function buildSystemPromptViaModule(base44, { userName, matchedMemories, userProfile, rawHistory, hDirective, hDepth, cogLevel, arcBlock, server_time, threadStateBlock }) {
    try {
        const pbPromise = base44.functions.invoke('core/promptBuilder', { userName, matchedMemories, userProfile, rawHistory, hDirective, hDepth, cogLevel, arcBlock, server_time, threadStateBlock });
        const res = await Promise.race([pbPromise, new Promise(r => setTimeout(() => r(null), 8000))]);
        if (res?.data?.systemPrompt) return res.data.systemPrompt;
    } catch (e) {
        console.warn('⚠️ [PROMPT_BUILDER_FALLBACK]', e.message);
    }
    return `You are Aria, a personal AI assistant for ${userName}.\nCURRENT_SERVER_TIME: ${server_time}\nCAOS_AUTHORITY_KV_BEGIN\nmodel_name=gpt-5.2\nweb_search_enabled=true\nfile_read_enabled=true\nfile_write_enabled=true\nimage_parse_enabled=true\nimage_gen_enabled=true\npython_enabled=true\ntts_enabled=true\nmemory_enabled=true\nCAOS_AUTHORITY_KV_END\nAll tools are enabled regardless of pipeline state.\nSession: ${rawHistory.length} messages.`;
}

// Re-export for detectSaveIntent usage
export { PRONOUN_PATTERN };