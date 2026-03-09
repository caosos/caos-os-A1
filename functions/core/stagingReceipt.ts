/**
 * core/stagingReceipt
 * Sends one real message through hybridMessage and returns the execution_receipt + sanitizer_delta.
 * Admin only. Shows full latency_breakdown.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'admin only' }, { status: 403 });
    }

    const testInput = 'What is 2 + 2?';
    const t0 = Date.now();
    const res = await base44.functions.invoke('hybridMessage', { input: testInput, session_id: null });
    const round_trip_ms = Date.now() - t0;
    const data = res?.data || {};

    return Response.json({
        ok: !!data.reply,
        request_id: data.request_id,
        mode: data.mode,
        round_trip_ms,
        execution_receipt: data.execution_receipt || null,
        sanitizer_delta: data.execution_receipt?.sanitizer_delta || null,
        latency_breakdown: data.execution_receipt?.latency_breakdown || null,
    });
});