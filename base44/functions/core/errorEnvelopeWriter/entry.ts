/**
 * MODULE: errorEnvelopeWriter
 * CONTRACT v1 — 2026-03-01
 * LOCK_SIGNATURE: CAOS_ERROR_ENVELOPE_WRITER_MODULE_v1_2026-03-01
 *
 * RESPONSIBILITIES:
 *   - Build deterministic ODEL v1 error envelope
 *   - Persist to ErrorLog (asServiceRole)
 *   - Write failure DiagnosticReceipt
 *   - Return structured envelope for caller to surface to frontend
 *
 * INPUT CONTRACT:
 *   POST body: {
 *     error_message: string,
 *     stage: string,
 *     request_id: string,
 *     correlation_id: string,
 *     session_id: string | null,
 *     user_email: string | null,
 *     model_used: string,
 *     latency_ms: number
 *   }
 *
 * OUTPUT CONTRACT:
 *   { error_id, error_code, stage, public_message, persisted: boolean }
 *
 * INVARIANTS:
 *   - public_message is ALWAYS generic (never expose internal details to frontend)
 *   - error_id is a UUID — the single join key for all downstream lookup
 *   - ErrorLog persist failure is logged but never throws (non-blocking to caller)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PUBLIC_MESSAGE = "Something went wrong. Please try again.";

Deno.serve(async (req) => {
    // Note: this endpoint can be called even when user auth fails (pipeline catch block)
    // so we use asServiceRole exclusively here.
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const {
        error_message, stage, request_id, correlation_id,
        session_id, user_email, model_used, latency_ms
    } = body;

    const error_id = crypto.randomUUID();
    const error_code = 'SERVER_ERROR';
    let persisted = false;

    const envelope = {
        error_id,
        error_code,
        stage: stage || null,
        message: error_message || 'Unknown error',
        created_at: new Date().toISOString()
    };

    // Persist ErrorLog
    try {
        await base44.asServiceRole.entities.ErrorLog.create({
            ...envelope,
            user_email: user_email || 'unknown',
            conversation_id: session_id || 'none',
            error_type: 'server_error',
            error_message,
            model_used,
            latency_ms,
            request_payload: { request_id, session_id }
        });
        persisted = true;
        console.log('✅ [ODEL_PERSISTED]', { error_id, stage });
    } catch (persistErr) {
        console.error('⚠️ [ODEL_PERSIST_FAILED]', persistErr.message);
    }

    // Failure DiagnosticReceipt
    try {
        await base44.asServiceRole.entities.DiagnosticReceipt.create({
            request_id: correlation_id || request_id,
            session_id: session_id || null,
            model_used,
            selector_decision: { stage_last: stage, error_code },
            latency_breakdown: { total_ms: latency_ms },
            created_at: new Date().toISOString()
        });
    } catch (receiptErr) {
        console.error('🔥 [FAILURE_RECEIPT_WRITE_FAILED]', receiptErr.message);
    }

    return Response.json({
        error_id,
        error_code,
        stage,
        public_message: PUBLIC_MESSAGE,
        persisted
    });
});