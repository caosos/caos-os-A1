// MODULE: core/mbcrEngine
// LOCK_SIGNATURE: CAOS_MBCR_ENGINE_v1_2026-03-12
// PURPOSE: MBCR (Message-Based Context Recovery) — detects thread-reference intent,
//          retrieves same-thread snippets, and builds injection block for hybridMessage.
// EXTRACTED FROM: functions/hybridMessage inline MBCR block (Phase 4 PR1)
// UNLOCK_TOKEN: CAOS_PHASE4_PR1_MBCR_v1_2026-03-12
//
// INPUT CONTRACT (POST body):
//   { thread_id: string, userText: string, debugMode?: boolean }
//
// OUTPUT CONTRACT:
//   { message: { role: 'system', content: string } | null,
//     debug: { triggered, tags, text_query, retrievedCount, injected } }
//
// INVARIANT: Output shape is byte-for-byte equivalent to inlined maybeBuildMbcrInjectedMessage.
//            No new fallback semantics introduced. Error handling mirrors original.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

// Identical logic to inlined _mbcrTriggerCheck
function _mbcrTriggerCheck(text) {
    const t = text || '';
    const triggered =
        /\bPR[23]\b/i.test(t) ||
        /\b(locked|unlock|lock status)\b/i.test(t) ||
        /\b(receipts|acceptance criteria|rollback plan)\b/i.test(t) ||
        /\b(continue|where are we|status|next step|what.*plan|approved_scope|waiting_for_approval|stop_after_receipts)\b/i.test(t);
    if (!triggered) return { triggered: false, tags: [], text_query: '' };
    const inferredTags = MBCR_TAG_PATTERNS.filter(({ re }) => re.test(t)).map(({ tag }) => tag);
    const kwMatch = t.match(/\b(PR[23]|locked|receipts|acceptance|rollback|approved_scope|waiting_for_approval)\b/i);
    return { triggered: true, tags: inferredTags, text_query: kwMatch ? kwMatch[0] : '' };
}

// Identical logic to inlined _buildThreadRecoveryBlock
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

const NULL_RESULT = { message: null, debug: { triggered: false, tags: [], text_query: '', retrievedCount: 0, injected: false } };

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ ok: false, error_code: 'UNAUTHORIZED', stage: 'AUTH' }, { status: 401 });

        const { thread_id, userText, debugMode = false } = await req.json();

        if (!thread_id || !userText) return Response.json(NULL_RESULT);

        const trigger = _mbcrTriggerCheck(userText);
        const dbg = { triggered: trigger.triggered, tags: trigger.tags, text_query: trigger.text_query, retrievedCount: 0, injected: false };

        if (!trigger.triggered) {
            if (debugMode) console.log('[MBCR_SKIPPED] No thread-reference intent detected');
            return Response.json({ message: null, debug: dbg });
        }

        // Error handling mirrors original: catches and returns null result (nonfatal)
        try {
            const snippetRes = await base44.functions.invoke('getThreadSnippets', {
                thread_id, tags: trigger.tags, text_query: trigger.text_query, limit: 20, around: 2
            });
            const snippets = snippetRes?.data?.snippets || [];
            dbg.retrievedCount = snippets.length;
            const block = _buildThreadRecoveryBlock(snippets);
            dbg.injected = !!block;
            if (debugMode) console.log('[MBCR_TRIGGERED]', { tag_count: trigger.tags.length, count: snippets.length, injected_chars: block.length });
            return Response.json({ message: block ? { role: 'system', content: block } : null, debug: dbg });
        } catch (err) {
            console.warn('⚠️ [MBCR_NONFATAL]', err.message);
            return Response.json({ message: null, debug: dbg });
        }
    } catch (error) {
        console.error('🔥 [MBCR_ENGINE_ERROR]', error.message);
        return Response.json(NULL_RESULT);
    }
});