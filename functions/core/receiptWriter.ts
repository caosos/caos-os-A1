/**
 * MODULE: receiptWriter
 * CONTRACT v1 — 2026-03-01
 * LOCK_SIGNATURE: CAOS_RECEIPT_WRITER_MODULE_v1_2026-03-01
 *
 * RESPONSIBILITIES:
 *   - Write DiagnosticReceipt (in-band, awaited — per I2 invariant)
 *   - Upsert SessionContext (wcw_budget, wcw_used, last_seq)
 *   - Log RECEIPT_WRITE_FAILED or SESSIONCONTEXT_UPSERT_FAILED to ErrorLog on failure
 *
 * INPUT CONTRACT:
 *   POST body: {
 *     request_id, correlation_id, session_id, model_used,
 *     wcw_budget, wcw_used, wcw_remaining,
 *     heuristics_intent, heuristics_depth, cognitive_level,
 *     history_messages, recall_executed, matched_memories,
 *     latency_breakdown: { inference_ms, total_ms },
 *     token_breakdown: { total_prompt_tokens, completion_tokens, total_tokens },
 *     user_email
 *   }
 *
 * OUTPUT CONTRACT:
 *   { receipt_written: boolean, session_context_updated: boolean }
 *
 * INVARIANTS (do not change without new lock + TSB):
 *   - Receipt write uses asServiceRole first, falls back to user context
 *   - Receipt write failure → ErrorLog entry (non-blocking to caller)
 *   - SessionContext upsert failure → ErrorLog entry (non-blocking to caller)
 *   - I2: This module must be awaited by hybridMessage (not fire-and-forget)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const {
            request_id, correlation_id, session_id, model_used,
            wcw_budget, wcw_used, wcw_remaining,
            heuristics_intent, heuristics_depth, cognitive_level,
            history_messages, recall_executed, matched_memories,
            latency_breakdown, token_breakdown,
            user_email
        } = body;

        let receipt_written = false;
        let session_context_updated = false;

        // ── DiagnosticReceipt write ──────────────────────────────────────────
        const receiptPayload = {
            request_id,
            correlation_id,
            session_id: session_id || 'none',
            model_used,
            token_breakdown,
            wcw_budget,
            wcw_used,
            wcw_remaining,
            heuristics_intent,
            heuristics_depth,
            history_messages,
            recall_executed,
            matched_memories,
            stage_last: 'RESPONSE_BUILD',
            selector_decision: { stage_last: 'RESPONSE_BUILD' },
            latency_breakdown,
            created_at: new Date().toISOString()
        };

        try {
            try {
                await base44.asServiceRole.entities.DiagnosticReceipt.create(receiptPayload);
            } catch (srErr) {
                console.warn('⚠️ [RECEIPT_SR_FAILED] Trying user context', srErr.message);
                await base44.entities.DiagnosticReceipt.create(receiptPayload);
            }
            receipt_written = true;
            console.log('✅ [RECEIPT_SAVED]', { request_id });
        } catch (receiptErr) {
            console.error('🔥 [RECEIPT_WRITE_FAILED]', receiptErr.message);
            try {
                await base44.asServiceRole.entities.ErrorLog.create({
                    user_email: user_email || user.email,
                    conversation_id: session_id || 'none',
                    error_type: 'server_error',
                    error_message: `RECEIPT_WRITE_FAILED: ${receiptErr.message}`,
                    error_code: 'RECEIPT_WRITE_FAILED',
                    stage: 'RESPONSE_BUILD',
                    model_used,
                    latency_ms: latency_breakdown?.total_ms,
                    request_payload: { request_id, session_id }
                });
            } catch (_) { /* ignore secondary */ }
        }

        // ── SessionContext upsert ────────────────────────────────────────────
        if (session_id) {
            try {
                const now = Date.now();
                const existing = await base44.asServiceRole.entities.SessionContext.filter({ session_id }, '-last_activity_ts', 1);
                if (existing && existing.length > 0) {
                    await base44.asServiceRole.entities.SessionContext.update(existing[0].id, {
                        wcw_budget, wcw_used,
                        last_request_ts: now, last_activity_ts: now,
                        last_seq: (existing[0].last_seq || 0) + 1
                    });
                } else {
                    await base44.asServiceRole.entities.SessionContext.create({
                        session_id, wcw_budget, wcw_used,
                        last_request_ts: now, last_activity_ts: now,
                        last_seq: 1
                    });
                }
                session_context_updated = true;
            } catch (scErr) {
                console.error('🔥 [SESSIONCONTEXT_UPSERT_FAILED]', scErr.message);
                try {
                    await base44.asServiceRole.entities.ErrorLog.create({
                        user_email: user_email || user.email,
                        conversation_id: session_id || 'none',
                        error_type: 'server_error',
                        error_message: `SESSIONCONTEXT_UPSERT_FAILED: ${scErr.message}`,
                        error_code: 'SESSIONCONTEXT_UPSERT_FAILED',
                        stage: 'RESPONSE_BUILD',
                        model_used,
                        request_payload: { request_id, session_id }
                    });
                } catch (_) { /* ignore */ }
            }
        }

        return Response.json({ receipt_written, session_context_updated });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});