import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * probeReceiptWrite — T1 acceptance test probe
 * Attempts a DiagnosticReceipt write using both service role and user context.
 * Returns detailed result for admin audit.
 */
Deno.serve(async (req) => {
    const startTime = Date.now();
    const probe_id = crypto.randomUUID();

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
        return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const result = {
        probe_id,
        user_email: user.email,
        user_role: user.role,
        service_role_attempt: null,
        user_context_attempt: null,
        read_back: null,
        latency_ms: null
    };

    const payload = {
        request_id: probe_id,
        correlation_id: probe_id,
        session_id: 'probe-test',
        model_used: 'gpt-5.2-probe',
        wcw_budget: 200000,
        wcw_used: 1234,
        wcw_remaining: 198766,
        stage_last: 'RESPONSE_BUILD',
        selector_decision: { stage_last: 'RESPONSE_BUILD' },
        created_at: new Date().toISOString()
    };

    // Attempt 1: service role
    try {
        const created = await base44.asServiceRole.entities.DiagnosticReceipt.create(payload);
        result.service_role_attempt = { success: true, id: created?.id };
    } catch (e) {
        result.service_role_attempt = { success: false, error: e.message };
    }

    // Attempt 2: user context (if service role failed)
    if (!result.service_role_attempt?.success) {
        try {
            const created = await base44.entities.DiagnosticReceipt.create(payload);
            result.user_context_attempt = { success: true, id: created?.id };
        } catch (e) {
            result.user_context_attempt = { success: false, error: e.message };
        }
    }

    // Read back to verify it landed
    const successId = result.service_role_attempt?.id || result.user_context_attempt?.id;
    if (successId) {
        try {
            const found = await base44.asServiceRole.entities.DiagnosticReceipt.filter(
                { request_id: probe_id }, '-created_date', 1
            );
            result.read_back = { found: found?.length > 0, count: found?.length, record: found?.[0] };
        } catch (e) {
            result.read_back = { found: false, error: e.message };
        }
    }

    result.latency_ms = Date.now() - startTime;

    console.log('🔬 [PROBE_RESULT]', JSON.stringify(result, null, 2));

    return Response.json(result);
});