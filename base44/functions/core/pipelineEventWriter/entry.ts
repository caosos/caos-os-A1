// MODULE: core/pipelineEventWriter
// PURPOSE: Fire-and-forget pipeline event persistence for observability plane v1.
// GOV: New module per Amendment A — hybridMessage receives only a call-site import.
// FEATURE FLAG: ENABLE_PIPELINE_EVENTS (set false to stop all writes instantly)
// LOCK_SIGNATURE: CAOS_PIPELINE_EVENT_WRITER_v1_2026-03-14

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ENABLE_PIPELINE_EVENTS = true;

Deno.serve(async (req) => {
    try {
        if (!ENABLE_PIPELINE_EVENTS) {
            return Response.json({ ok: true, skipped: true });
        }

        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { request_id, session_id, level = 'INFO', stage, code, message, elapsed_ms, data } = body;

        if (!request_id || !stage || !message) {
            return Response.json({ ok: false, error: 'Missing required fields: request_id, stage, message' }, { status: 400 });
        }

        await base44.asServiceRole.entities.PipelineEvent.create({
            request_id,
            session_id: session_id || null,
            level,
            stage,
            code: code || null,
            message,
            elapsed_ms: elapsed_ms ?? null,
            data: data || null
        });

        return Response.json({ ok: true });
    } catch (error) {
        // Never throw — this is observability infrastructure, must not affect caller
        console.error('[PIPELINE_EVENT_WRITER_FAILED]', error.message);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});