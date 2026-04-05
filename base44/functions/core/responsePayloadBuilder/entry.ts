// core/responsePayloadBuilder — Extracted response assembly
// Extracted from functions/hybridMessage SECTION 4 (buildWcwAudit, buildWcwStateV1, buildWcwTurnV1, buildResponsePayload)
// GOVERNANCE: behavior-identical extraction. No new logic. No gating changes.
// LOCK_SIGNATURE: CAOS_WCW_TELEMETRY_v1_2026-03-15 (preserved from source)
// Contract:
//   input:  { reply, request_id, correlation_id, routingDecision, RESOLVED_MODEL, server_time,
//             responseTime, execution_meta, wcwBudget, promptTokens, completionTokens, totalTokens,
//             wcwRemaining, inferenceMs, hIntent, hDepth, cogLevel, rawHistory_length,
//             matchedMemories_length, ctcInjectionMeta, tokenBreakdown, sanitize_reduction_ratio,
//             context_post_sanitize_tokens_est, context_pre_sanitize_tokens_est, session_id,
//             debugMode, debug_meta, thread_state_used, ts_last_seq,
//             t_auth, t_profile_and_history_load, t_sanitizer, t_prompt_build, t_openai_call,
//             t_save_messages, riaResult, is_admin, finalMessages }
//   output: { data, diagnostic_receipt, execution_receipt, additive,
//             wcw_audit, wcw_state, wcw_turn, wcwPressureScore, wcwZone }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ── WCW Slot Audit ─────────────────────────────────────────────────────────────
function buildWcwAudit({ finalMessages, wcwBudget, promptTokens, debugMode, isAdmin }) {
    if (!debugMode && !isAdmin) return null;
    const classifySlot = (msg, idx) => {
        const c = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
        if (idx === 0 && msg.role === 'system') return 'system_prompt';
        if (msg.role === 'system' && c.startsWith('EXECUTION_META_TRH:')) return 'trh_meta';
        if (msg.role === 'system' && c.startsWith('THREAD RECOVERY EXCERPTS')) return 'mbcr';
        if (msg.role === 'assistant' && c.startsWith('THREAD SUMMARY')) return 'trh_summary';
        if (msg.role === 'user') return 'user';
        if (msg.role === 'system' || msg.role === 'assistant' || msg.role === 'user') return 'history';
        return 'other';
    };
    const simpleHash = (s) => {
        let h = 0x811c9dc5;
        for (let i = 0; i < Math.min(s.length, 4096); i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
        return h.toString(16).padStart(8, '0');
    };
    const slots = finalMessages.map((msg, idx) => {
        const c = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
        const slot = { idx, role: msg.role, bucket: classifySlot(msg, idx), chars: c.length, hash: simpleHash(c) };
        if (debugMode) slot.preview_200 = c.slice(0, 200);
        return slot;
    });
    const charsTotal = slots.reduce((s, sl) => s + sl.chars, 0);
    const largestSlots = [...slots].sort((a, b) => b.chars - a.chars).slice(0, 5).map(s => ({ idx: s.idx, bucket: s.bucket, chars: s.chars }));
    return { enabled: true, max_model_wcw_tokens: wcwBudget, prompt_tokens_post_inference: promptTokens, slots, chars_total: charsTotal, largest_slots: largestSlots };
}

// ── WCW telemetry builders (pure, no I/O) ─────────────────────────────────────
// LOCK_SIGNATURE: CAOS_WCW_TELEMETRY_v1_2026-03-15
function buildWcwStateV1({ wcwBudget, promptTokens, completionTokens, totalTokens, wcwRemaining, responseTime, session_id, request_id, model }) {
    const pct_used = wcwBudget > 0 ? parseFloat(((promptTokens / wcwBudget) * 100).toFixed(2)) : 0;
    const pct_remaining = wcwBudget > 0 ? parseFloat(((wcwRemaining / wcwBudget) * 100).toFixed(2)) : 100;
    return {
        snapshot_ts: new Date().toISOString(),
        request_id, session_id: session_id || null, model: model || null,
        wcw_budget_tokens: wcwBudget, wcw_used_tokens: promptTokens, wcw_remaining_tokens: wcwRemaining,
        wcw_pct_used: pct_used, wcw_pct_remaining: pct_remaining,
        completion_tokens: completionTokens || 0, total_tokens: totalTokens || 0,
        response_time_ms: responseTime,
        severity: pct_used >= 90 ? 'CRITICAL' : pct_used >= 75 ? 'HIGH' : pct_used >= 50 ? 'MEDIUM' : 'LOW',
    };
}

function buildWcwTurnV1({ wcwBudget, promptTokens, completionTokens, totalTokens, wcwRemaining, inferenceMs, responseTime, request_id, session_id }) {
    const pct_used = wcwBudget > 0 ? parseFloat(((promptTokens / wcwBudget) * 100).toFixed(2)) : 0;
    return {
        event_ts: new Date().toISOString(),
        request_id, session_id: session_id || null, stage: 'PIPELINE_COMPLETE',
        wcw_budget: wcwBudget, wcw_used: promptTokens, wcw_remaining: wcwRemaining,
        wcw_pct_used: pct_used, completion_tokens: completionTokens || 0, total_tokens: totalTokens || 0,
        inference_ms: inferenceMs || null, total_response_ms: responseTime,
    };
}

// ── Response payload builder ───────────────────────────────────────────────────
function buildResponsePayload({ reply, request_id, correlation_id, routingDecision, RESOLVED_MODEL, server_time, responseTime, execution_meta, wcwBudget, promptTokens, wcwRemaining, hIntent, hDepth, cogLevel, rawHistory_length, matchedMemories_length, ctcInjectionMeta, tokenBreakdown, sanitize_reduction_ratio, context_post_sanitize_tokens_est, context_pre_sanitize_tokens_est, session_id, debugMode, debug_meta, thread_state_used, ts_last_seq, t_auth, t_profile_and_history_load, t_sanitizer, t_prompt_build, t_openai_call, t_save_messages, wcw_audit, wcw_state, wcw_turn, riaResult }) {
    const additive = {
        mode: 'GEN',
        route: routingDecision.route, model_used: RESOLVED_MODEL,
        server_time, response_time_ms: responseTime, tool_calls: [],
        execution_meta,
        wcw_budget: wcwBudget, wcw_used: promptTokens, wcw_remaining: wcwRemaining,
    };
    if (debugMode) additive.debug_meta = debug_meta;
    if (wcw_audit) additive.wcw_audit = wcw_audit;
    if (wcw_state) additive.wcw_state = wcw_state;
    if (wcw_turn) additive.wcw_turn = wcw_turn;

    const data = { reply, openaiUsage: null, inferenceMs: t_openai_call ?? 0 };

    const diagnostic_receipt = {
        tool: 'hybridMessage',
        stage: 'INFERENCE',
        elapsed_ms: responseTime,
        provider_elapsed_ms: null,
        model: RESOLVED_MODEL,
        fallback_tier: riaResult?.fallback_tier ?? null,
    };

    const execution_receipt = [
        { tool: 'resilientInference', ok: true, stage: 'INFERENCE', error_code: null, elapsed_ms: t_openai_call ?? null },
    ];

    additive.legacy_execution_receipt = {
        request_id, correlation_id, session_id,
        history_messages: rawHistory_length, recall_executed: matchedMemories_length > 0,
        matched_memories: matchedMemories_length, heuristics_intent: hIntent,
        heuristics_depth: hDepth, cognitive_level: cogLevel, elevation_delta: 0.75,
        model_used: RESOLVED_MODEL, route: routingDecision.route, route_reason: routingDecision.route_reason,
        latency_ms: responseTime,
        latency_breakdown: { t_auth, t_profile_and_history_load, t_sanitizer, t_prompt_build, t_openai_call, t_save_messages, t_total: responseTime },
        sanitizer_delta: { context_pre_sanitize_tokens_est, context_post_sanitize_tokens_est, sanitize_reduction_ratio },
        token_breakdown: tokenBreakdown, wcw_budget: wcwBudget,
        wcw_used: promptTokens, wcw_remaining: wcwRemaining,
        ctc_injected: ctcInjectionMeta.length > 0,
        ctc_seed_ids: ctcInjectionMeta.map(m => m.seed_id),
        ctc_injection_meta: ctcInjectionMeta,
        thread_state_used: thread_state_used,
        thread_state_seq: ts_last_seq,
        provider: riaResult?.provider ?? null,
    };

    return { data, diagnostic_receipt, execution_receipt, additive };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const {
            reply, request_id, correlation_id, routingDecision, RESOLVED_MODEL, server_time,
            responseTime, execution_meta, wcwBudget, promptTokens, completionTokens, totalTokens,
            wcwRemaining, inferenceMs, hIntent, hDepth, cogLevel, rawHistory_length,
            matchedMemories_length, ctcInjectionMeta, tokenBreakdown, sanitize_reduction_ratio,
            context_post_sanitize_tokens_est, context_pre_sanitize_tokens_est, session_id,
            debugMode, debug_meta, thread_state_used, ts_last_seq,
            t_auth, t_profile_and_history_load, t_sanitizer, t_prompt_build, t_openai_call,
            t_save_messages, riaResult, is_admin, finalMessages,
        } = body;

        // ── WCW audit (gated: debugMode OR isAdmin) ───────────────────────────
        const wcw_audit = buildWcwAudit({ finalMessages, wcwBudget, promptTokens, debugMode, isAdmin: is_admin });

        // ── WCW state + turn (admin-gated) ────────────────────────────────────
        const _wcwPressureScore = Math.round(100 * promptTokens / wcwBudget);
        const _wcwZone = _wcwPressureScore >= 85 ? 'red' : _wcwPressureScore >= 70 ? 'yellow' : _wcwPressureScore >= 50 ? 'blue' : 'green';
        const wcw_state = is_admin
            ? { ...buildWcwStateV1({ wcwBudget, promptTokens, completionTokens, totalTokens, wcwRemaining, responseTime, request_id, session_id, model: RESOLVED_MODEL }),
                schema: 'wcw_state.v1', context_pressure_score: _wcwPressureScore, zone: _wcwZone,
                inventory: [], telemetry_missing_fields: ['inventory', 'sanitizer_delta_tokens'] }
            : null;
        const wcw_turn = is_admin
            ? { ...buildWcwTurnV1({ wcwBudget, promptTokens, completionTokens, totalTokens, wcwRemaining, inferenceMs, responseTime, request_id, session_id }),
                schema: 'wcw_turn.v1', context_pressure_score: _wcwPressureScore, zone: _wcwZone }
            : null;

        const { data, diagnostic_receipt, execution_receipt, additive } = buildResponsePayload({
            reply, request_id, correlation_id, routingDecision, RESOLVED_MODEL, server_time,
            responseTime, execution_meta, wcwBudget, promptTokens, wcwRemaining,
            hIntent, hDepth, cogLevel, rawHistory_length, matchedMemories_length,
            ctcInjectionMeta, tokenBreakdown, sanitize_reduction_ratio,
            context_post_sanitize_tokens_est, context_pre_sanitize_tokens_est,
            session_id, debugMode, debug_meta, thread_state_used, ts_last_seq,
            t_auth, t_profile_and_history_load, t_sanitizer, t_prompt_build,
            t_openai_call, t_save_messages, wcw_audit, wcw_state, wcw_turn, riaResult,
        });

        return Response.json({
            ok: true,
            data, diagnostic_receipt, execution_receipt, additive,
            wcw_audit, wcw_state, wcw_turn,
            wcwPressureScore: _wcwPressureScore, wcwZone: _wcwZone,
        });
    } catch (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});