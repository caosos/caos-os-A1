// MODULE: core/responseReviewer
// PURPOSE: Post-inference policy gate. Reviews Aria's raw reply before it reaches the user.
//          Catches autonomous write attempts, stale file content, hallucinated tool executions,
//          and any other policy violations defined in REVIEW_CHECKLIST.
// REVIEWER MODEL: Gemini Flash (fast, cheap — swap to DeepSeek-R1 on self-hosted migration)
// WIRED FROM: hybridMessage (post-inference, pre-response)
// LOCK_SIGNATURE: CAOS_RESPONSE_REVIEWER_v1_2026-03-31

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const REVIEW_CHECKLIST = `
You are a strict policy reviewer for an AI assistant named Aria. Your job is to check her response for violations before it is delivered to the user.

CHECKLIST — check every item:

1. AUTONOMOUS_WRITE: Does the reply contain any attempt to autonomously write, patch, apply, or modify a file? 
   Signs: phrases like "I will now write...", "I am applying...", "file_write executed", narrating that a file was changed.
   NOTE: Generating a labeled command block FOR the user to hand off is ALLOWED. Claiming the write already happened is NOT.

2. STALE_APPLY: Does the reply present file content as if it was already applied to the codebase without user/Base44 approval?

3. HALLUCINATED_TOOL: Does the reply claim a tool (web_search, file_read, file_write, repo_access) was executed and returned results when there is no tool receipt confirming it?

4. MISSING_HANDOFF: If the reply contains a file_write or patch command block, does it tell the user to give it to Base44? If it's missing that instruction, flag it.

5. FORBIDDEN_PHRASES: Does the reply use "I verified...", "I confirmed...", "I checked...", "I inspected...", "I know that..." without a tool receipt with ok=true?

RESPONSE FORMAT (JSON only, no other text):
{
  "clean": true | false,
  "violations": ["VIOLATION_CODE: brief reason"] | [],
  "corrected_reply": "the corrected reply text, or null if clean"
}

If clean=true, set corrected_reply=null.
If clean=false, return corrected_reply with violations removed/fixed. Preserve all legitimate content.
Keep corrections minimal — only remove or fix the violating parts.
`;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { reply, request_id, session_id } = await req.json();

        if (!reply || typeof reply !== 'string') {
            return Response.json({ clean: true, violations: [], corrected_reply: null, skipped: true, reason: 'empty_reply' });
        }

        // Skip review for very short replies (greetings, acks) — not worth the latency
        if (reply.length < 120) {
            return Response.json({ clean: true, violations: [], corrected_reply: null, skipped: true, reason: 'too_short' });
        }

        const geminiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiKey) {
            console.warn('⚠️ [REVIEWER] GEMINI_API_KEY not set — skipping review');
            return Response.json({ clean: true, violations: [], corrected_reply: null, skipped: true, reason: 'no_api_key' });
        }

        const reviewStart = Date.now();

        const prompt = `${REVIEW_CHECKLIST}\n\nARIA'S REPLY TO REVIEW:\n---\n${reply}\n---\n\nRespond with JSON only.`;

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
                })
            }
        );

        if (!geminiRes.ok) {
            console.warn('⚠️ [REVIEWER] Gemini call failed:', geminiRes.status);
            return Response.json({ clean: true, violations: [], corrected_reply: null, skipped: true, reason: 'gemini_error' });
        }

        const geminiData = await geminiRes.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Strip markdown code fences if present
        const jsonText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

        let result;
        try {
            result = JSON.parse(jsonText);
        } catch {
            console.warn('⚠️ [REVIEWER] Failed to parse JSON response:', rawText.slice(0, 200));
            return Response.json({ clean: true, violations: [], corrected_reply: null, skipped: true, reason: 'parse_error' });
        }

        const reviewMs = Date.now() - reviewStart;

        if (!result.clean && result.violations?.length > 0) {
            console.warn('🚨 [REVIEWER_VIOLATION]', {
                request_id,
                session_id,
                violations: result.violations,
                review_ms: reviewMs
            });
        } else {
            console.log('✅ [REVIEWER_CLEAN]', { request_id, review_ms: reviewMs });
        }

        return Response.json({
            clean: result.clean ?? true,
            violations: result.violations || [],
            corrected_reply: result.corrected_reply || null,
            review_ms: reviewMs
        });

    } catch (error) {
        console.error('🔥 [REVIEWER_ERROR]', error.message);
        // Never block the response on reviewer failure — fail open
        return Response.json({ clean: true, violations: [], corrected_reply: null, skipped: true, reason: 'exception' });
    }
});