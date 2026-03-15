/**
 * MODULE: core/wcwTelemetry
 * LOCK_SIGNATURE: CAOS_WCW_TELEMETRY_v1_2026-03-15
 *
 * PURPOSE: Pure helper functions for WCW telemetry snapshots and turn events.
 *   - No I/O. No DB. No env reads. Deterministic. Safe inline per §16.1.
 *   - Exported via Deno.serve dispatcher (fn + args pattern).
 *   - Called from hybridMessage via base44.functions.invoke('core/wcwTelemetry', { fn, args })
 *
 * FUNCTIONS:
 *   buildWcwStateV1(args)  → wcw_state snapshot object (admin-only)
 *   buildWcwTurnV1(args)   → wcw_turn timeline event object (admin-only)
 *
 * INPUT CONTRACT for buildWcwStateV1:
 *   { wcwBudget, promptTokens, completionTokens, totalTokens,
 *     wcwRemaining, responseTime, session_id, request_id, model }
 *
 * INPUT CONTRACT for buildWcwTurnV1:
 *   { wcwBudget, promptTokens, completionTokens, totalTokens,
 *     wcwRemaining, inferenceMs, responseTime, request_id, session_id }
 *
 * OUTPUT CONTRACT:
 *   { ok: true, result: <object> }  |  { ok: false, error: string }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ── Pure builders ─────────────────────────────────────────────────────────────

function buildWcwStateV1({ wcwBudget, promptTokens, completionTokens, totalTokens, wcwRemaining, responseTime, session_id, request_id, model }) {
    const pct_used = wcwBudget > 0 ? parseFloat(((promptTokens / wcwBudget) * 100).toFixed(2)) : 0;
    const pct_remaining = wcwBudget > 0 ? parseFloat(((wcwRemaining / wcwBudget) * 100).toFixed(2)) : 100;
    return {
        snapshot_ts: new Date().toISOString(),
        request_id,
        session_id: session_id || null,
        model: model || null,
        wcw_budget_tokens: wcwBudget,
        wcw_used_tokens: promptTokens,
        wcw_remaining_tokens: wcwRemaining,
        wcw_pct_used: pct_used,
        wcw_pct_remaining: pct_remaining,
        completion_tokens: completionTokens || 0,
        total_tokens: totalTokens || 0,
        response_time_ms: responseTime,
        severity: pct_used >= 90 ? 'CRITICAL' : pct_used >= 75 ? 'HIGH' : pct_used >= 50 ? 'MEDIUM' : 'LOW',
    };
}

function buildWcwTurnV1({ wcwBudget, promptTokens, completionTokens, totalTokens, wcwRemaining, inferenceMs, responseTime, request_id, session_id }) {
    const pct_used = wcwBudget > 0 ? parseFloat(((promptTokens / wcwBudget) * 100).toFixed(2)) : 0;
    return {
        event_ts: new Date().toISOString(),
        request_id,
        session_id: session_id || null,
        stage: 'PIPELINE_COMPLETE',
        wcw_budget: wcwBudget,
        wcw_used: promptTokens,
        wcw_remaining: wcwRemaining,
        wcw_pct_used: pct_used,
        completion_tokens: completionTokens || 0,
        total_tokens: totalTokens || 0,
        inference_ms: inferenceMs || null,
        total_response_ms: responseTime,
    };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

const DISPATCH = { buildWcwStateV1, buildWcwTurnV1 };

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        const { fn, args } = await req.json();
        if (!fn || !DISPATCH[fn]) {
            return Response.json({ ok: false, error: `Unknown function: ${fn}` }, { status: 400 });
        }

        const result = DISPATCH[fn](args || {});
        return Response.json({ ok: true, result });
    } catch (err) {
        return Response.json({ ok: false, error: err.message }, { status: 500 });
    }
});