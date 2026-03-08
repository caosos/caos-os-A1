// threadRehydrate — TRH_v1 Thread Rehydration Worker
// LOCK_SIGNATURE: CAOS_TRH_v1_2026-03-08
// PURPOSE: Two-stage thread rehydration.
//   Stage 1 — Deterministic (no LLM): check freshness + campaign signal presence in last-80.
//   Stage 2 — LLM summarize (ACTIVE_MODEL): fetch up to 1000 messages, produce THREAD SUMMARY block.
// GOVERNANCE:
//   - Primary gate is TRH_TRIGGER regex on user_text (enforced in hybridMessage.js).
//   - This function is only invoked when that gate passes.
//   - Stage 1 here only checks anti-spam freshness. Tag hits do NOT block Stage 2.
//   - No new models: ACTIVE_MODEL (gpt-5.2) only.
//   - Max wall time: 7500ms (Promise.race enforced in caller).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ACTIVE_MODEL = 'gpt-5.2';
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const MAX_SCAN_MESSAGES = 1000;
const MAX_SUMMARY_CHARS = 6000;
const MAX_CONTENT_INPUT_CHARS = 8000;
const FRESHNESS_MINUTES = 10;
const FRESHNESS_MESSAGES = 10;

// ── Stage 1: Deterministic freshness + signal scan over last-80 ──────────────
function analyzeLastEighty(messages, userText) {
    const TAG_RES = {
        PR2: /\bPR2\b/i,
        PR3: /\bPR3\b/i,
        LOCKED: /\bLOCKED\b/i,
        RECEIPTS: /\bRECEIPTS\b/i,
        ACCEPTANCE: /\bACCEPTANCE\b/i,
        WAITING_FOR_APPROVAL: /\bWAITING_FOR_APPROVAL\b/i,
        EXECUTE_STEP: /\bEXECUTE_STEP/i,
    };

    // Find most recent THREAD SUMMARY message
    let lastSummaryAge = null;
    let lastSummaryIndex = null;
    const now = Date.now();
    for (let i = messages.length - 1; i >= 0; i--) {
        const c = messages[i].content || '';
        if (c.startsWith('THREAD SUMMARY (AUTO-GENERATED')) {
            const ts = messages[i].timestamp || messages[i].created_date;
            if (ts) {
                lastSummaryAge = (now - new Date(ts).getTime()) / 60000; // minutes
            }
            lastSummaryIndex = messages.length - 1 - i; // distance from end (0 = most recent)
            break;
        }
    }

    // Tag hit counts (all 80)
    const tagHits = {};
    let totalHits = 0;
    for (const [name, re] of Object.entries(TAG_RES)) {
        let count = 0;
        for (const m of messages) {
            if (re.test(m.content || '')) count++;
        }
        tagHits[name] = count;
        totalHits += count;
    }

    // Anti-spam: fresh summary = within FRESHNESS_MINUTES AND within last FRESHNESS_MESSAGES turns
    const isExplicitRefresh = /\b(refresh|rehydrate|update summary)\b/i.test(userText || '');
    const hasFreshSummary = (
        lastSummaryAge !== null &&
        lastSummaryAge < FRESHNESS_MINUTES &&
        lastSummaryIndex !== null &&
        lastSummaryIndex < FRESHNESS_MESSAGES
    );

    const shouldSkip = hasFreshSummary && !isExplicitRefresh;

    return {
        tagHits,
        totalHits,
        lastSummaryAge,
        lastSummaryIndex,
        hasFreshSummary,
        shouldSkip,
        skipReason: shouldSkip ? 'fresh_summary_exists' : null,
    };
}

// ── Stage 2: Fetch up to 1000 messages, summarize via ACTIVE_MODEL ───────────
async function summarizeThread({ openaiKey, messages, threadId }) {
    // Sort ascending (oldest → newest)
    const sorted = [...messages].sort((a, b) => {
        const ta = new Date(a.timestamp || a.created_date || 0).getTime();
        const tb = new Date(b.timestamp || b.created_date || 0).getTime();
        return ta - tb;
    });

    // Build content block capped at MAX_CONTENT_INPUT_CHARS
    let contentBlock = '';
    for (const m of sorted) {
        const ts = m.timestamp || m.created_date || '';
        const line = `[${m.role || 'unknown'} | ${ts}]: ${(m.content || '').slice(0, 2000)}\n`;
        if (contentBlock.length + line.length > MAX_CONTENT_INPUT_CHARS) break;
        contentBlock += line;
    }

    const firstTs = sorted[0]?.timestamp || sorted[0]?.created_date || 'unknown';
    const lastTs = sorted[sorted.length - 1]?.timestamp || sorted[sorted.length - 1]?.created_date || 'unknown';
    const scanned = sorted.length;

    const systemPrompt = `You are a precise thread summarizer. Your ONLY job is to output a structured THREAD SUMMARY block. No commentary before or after.

Output this EXACT skeleton (fill in each section; if a section has no data, write "None identified"):

THREAD SUMMARY (AUTO-GENERATED; SAME-THREAD; TRH_v1)
GeneratedAt: ${new Date().toISOString()}
Coverage: ${firstTs} → ${lastTs} | MessagesScanned: ${scanned}

Campaign State
- PR2: <state or "Not found">
- PR3: <state or "Not found">

Lock Table
- Locked: [list items or "None"]
- Unlocked: [list items or "None"]
- Unknown: [list items or "None"]

Open TODOs (in-thread)
1) <item or "None">

Last Accepted Plan / Receipts
- <item or "None">

Next Step (single concrete action)
- <action or "Clarify: <recommended clarifying question>">

Open Questions / Missing Anchors (if any)
- <item or "None">

IMPORTANT: If the thread contains no PR2/PR3 or campaign anchors, explicitly state that in Campaign State and recommend a clarifying question in Next Step. Do NOT fabricate status.`;

    const userPrompt = `Thread messages (oldest → newest, capped at ${MAX_CONTENT_INPUT_CHARS} chars):\n\n${contentBlock}`;

    const response = await fetch(OPENAI_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: ACTIVE_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.1,
            max_completion_tokens: 1200
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI summarize error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const raw = data.choices[0]?.message?.content || '';
    return raw.slice(0, MAX_SUMMARY_CHARS);
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { thread_id, user_text = '' } = await req.json();
        if (!thread_id) return Response.json({ error: 'thread_id required' }, { status: 400 });

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        const DEV = req.headers.get('x-caos-debug') === 'true' || Deno.env.get('CAOS_DEBUG_MODE') === 'true';

        // ── Stage 1: Fetch last 80, run deterministic freshness check ────────
        const last80 = await base44.asServiceRole.entities.Message.filter(
            { conversation_id: thread_id },
            '-timestamp',
            80
        );

        const analysis = analyzeLastEighty(last80 || [], user_text);

        if (DEV) console.log('[TRH_STAGE1]', {
            thread_id,
            total_in_slice: last80?.length,
            tagHits: analysis.tagHits,
            lastSummaryAge: analysis.lastSummaryAge,
            lastSummaryIndex: analysis.lastSummaryIndex,
            shouldSkip: analysis.shouldSkip,
            skipReason: analysis.skipReason,
        });

        if (analysis.shouldSkip) {
            return Response.json({
                should_write_summary: false,
                summary_text: null,
                meta: { decided: true, reason: analysis.skipReason, scanned: last80?.length || 0, version: 'TRH_v1' }
            });
        }

        // ── Stage 2: Fetch up to MAX_SCAN_MESSAGES, summarize ────────────────
        const allMessages = await base44.asServiceRole.entities.Message.filter(
            { conversation_id: thread_id },
            '-timestamp',
            MAX_SCAN_MESSAGES
        );

        if (!allMessages || allMessages.length === 0) {
            return Response.json({
                should_write_summary: false,
                summary_text: null,
                meta: { decided: true, reason: 'no_messages', scanned: 0, version: 'TRH_v1' }
            });
        }

        if (DEV) console.log('[TRH_STAGE2_START]', { thread_id, message_count: allMessages.length });

        const summaryText = await summarizeThread({ openaiKey, messages: allMessages, threadId: thread_id });

        const firstMsg = [...allMessages].sort((a, b) => new Date(a.timestamp || a.created_date || 0) - new Date(b.timestamp || b.created_date || 0))[0];
        const lastMsg = [...allMessages].sort((a, b) => new Date(b.timestamp || b.created_date || 0) - new Date(a.timestamp || a.created_date || 0))[0];

        if (DEV) console.log('[TRH_STAGE2_DONE]', { summary_chars: summaryText.length });

        return Response.json({
            should_write_summary: true,
            summary_text: summaryText,
            meta: {
                decided: true,
                reason: 'triggered',
                scanned: allMessages.length,
                coverage: {
                    first_ts: firstMsg?.timestamp || firstMsg?.created_date,
                    last_ts: lastMsg?.timestamp || lastMsg?.created_date,
                },
                version: 'TRH_v1'
            }
        });

    } catch (error) {
        console.error('[TRH_ERROR]', error.message);
        return Response.json({
            should_write_summary: false,
            summary_text: null,
            meta: { decided: false, reason: `error: ${error.message}`, scanned: 0, version: 'TRH_v1' }
        }, { status: 500 });
    }
});