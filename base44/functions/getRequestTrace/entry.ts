// MODULE: getRequestTrace
// PURPOSE: Query PipelineEvent records by request_id or session_id.
// LOCK_SIGNATURE: CAOS_GET_REQUEST_TRACE_v1_2026-03-14

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { request_id, session_id, limit = 200 } = body;

        if (!request_id && !session_id) {
            return Response.json({ error: 'Provide request_id or session_id' }, { status: 400 });
        }

        let events = [];

        if (request_id) {
            events = await base44.asServiceRole.entities.PipelineEvent.filter(
                { request_id },
                'created_date',
                limit
            );
        } else {
            events = await base44.asServiceRole.entities.PipelineEvent.filter(
                { session_id },
                '-created_date',
                limit
            );
        }

        // Sort by elapsed_ms ascending (insertion order fallback)
        events.sort((a, b) => (a.elapsed_ms ?? 0) - (b.elapsed_ms ?? 0));

        // Group by request_id for session-level queries
        const grouped = {};
        for (const e of events) {
            if (!grouped[e.request_id]) grouped[e.request_id] = [];
            grouped[e.request_id].push(e);
        }

        return Response.json({
            ok: true,
            query: { request_id, session_id },
            total: events.length,
            events,
            grouped_by_request: request_id ? null : grouped
        });
    } catch (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});