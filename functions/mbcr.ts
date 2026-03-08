// mbcr.js — Memory-Based Context Recovery (same-thread v1)
// LOCK_SIGNATURE: CAOS_MBCR_INJECTION_v1_2026-03-08
// Extracted from hybridMessage.js per PR2 thin-hub discipline.
// This file is a shared utility module (not an HTTP handler).
// Exports: extractMetadataTags, buildThreadRecoveryInjection

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MBCR_INJECTION_MAX_CHARS = 6000;
const MBCR_SNIPPET_MAX_CHARS   = 500;

// ─── TAG PATTERNS ─────────────────────────────────────────────────────────────
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

// ─── INTERNAL: TRIGGER CHECK ──────────────────────────────────────────────────
function _shouldTriggerMBCR(text) {
    const t = text || '';
    const triggered =
        /\bPR[23]\b/i.test(t) ||
        /\b(locked|unlock|lock status)\b/i.test(t) ||
        /\b(receipts|acceptance criteria|rollback plan)\b/i.test(t) ||
        /\b(continue|where are we|status|next step|what.*plan|approved_scope|waiting_for_approval|stop_after_receipts)\b/i.test(t);

    if (!triggered) return { triggered: false, tags: [], text_query: '' };

    const inferredTags = MBCR_TAG_PATTERNS
        .filter(({ re }) => re.test(t))
        .map(({ tag }) => tag);

    const kwMatch = t.match(/\b(PR[23]|locked|receipts|acceptance|rollback|approved_scope|waiting_for_approval)\b/i);
    const text_query = kwMatch ? kwMatch[0] : '';

    return { triggered: true, tags: inferredTags, text_query };
}

// ─── INTERNAL: EXCERPT BUILDER ────────────────────────────────────────────────
function _buildThreadRecoveryBlock(snippets) {
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

// ─── EXPORTS (attached to globalThis for cross-module access) ─────────────────
// Base44 deploys each file as an isolated Deno worker; ES module exports are not
// supported across function boundaries. Callers use base44.functions.invoke('mbcr').
// This file also exposes a minimal HTTP interface for direct invocation.

export function extractMetadataTags(content) {
    if (!content) return [];
    return MBCR_TAG_PATTERNS.filter(({ re }) => re.test(content)).map(({ tag }) => tag);
}

export async function buildThreadRecoveryInjection({ thread_id, userText, invokeFn, debugMode = false }) {
    const trigger = _shouldTriggerMBCR(userText);

    if (!trigger.triggered) {
        if (debugMode) console.log('[MBCR_SKIPPED] No thread-reference intent detected');
        return { injectedMessage: null, debug: { triggered: false } };
    }

    try {
        const snippetRes = await invokeFn('getThreadSnippets', {
            thread_id,
            tags: trigger.tags,
            text_query: trigger.text_query,
            limit: 20,
            around: 2
        });
        const snippets = snippetRes?.data?.snippets || [];
        const block = _buildThreadRecoveryBlock(snippets);

        const debug = {
            triggered: true,
            tag_count: trigger.tags.length,
            text_query_len: trigger.text_query.length,
            count: snippets.length,
            injected_chars: block.length,
            ids: snippets.map(s => s.id)
        };

        if (debugMode) console.log('[MBCR_TRIGGERED]', debug);

        return {
            injectedMessage: block ? { role: 'system', content: block } : null,
            debug
        };
    } catch (err) {
        console.warn('⚠️ [MBCR_NONFATAL]', err.message);
        return { injectedMessage: null, debug: { triggered: true, error: err.message } };
    }
}

// ─── HTTP HANDLER (required by Base44 Deno Deploy) ───────────────────────────
// Not intended for direct invocation. hybridMessage.js uses the logic via
// the inlined import path. This serve is a no-op deployment stub.
Deno.serve(() => new Response('mbcr: module-only', { status: 200 }));