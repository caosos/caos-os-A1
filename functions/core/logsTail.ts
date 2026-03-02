import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { limit = 50, levels, contains, request_id, correlation_id } = body;

        const ts_iso = new Date().toISOString();
        const new_request_id = crypto.randomUUID();
        const new_correlation_id = crypto.randomUUID();

        let query = {};
        if (levels && levels.length > 0) {
            query.error_type = { "$in": levels };
        }
        if (request_id) {
            query.request_id = request_id;
        }

        const rawLogs = await base44.entities.ErrorLog.filter(query, '-created_date', 500);

        let filteredLogs = rawLogs;
        if (contains) {
            const lowerContains = contains.toLowerCase();
            filteredLogs = rawLogs.filter(log =>
                log.error_message?.toLowerCase().includes(lowerContains) ||
                log.error_code?.toLowerCase().includes(lowerContains) ||
                log.stage?.toLowerCase().includes(lowerContains)
            );
        }

        const events = filteredLogs.slice(0, limit).map(log => ({
            ts_iso: log.created_date,
            level: log.error_type || 'error',
            event_code: log.error_code || 'UNKNOWN',
            stage: log.stage || 'UNKNOWN',
            request_id: log.error_id || log.conversation_id || 'unknown',
            correlation_id: log.conversation_id || 'unknown',
            message: log.error_message,
            payload: {
                retry_count: log.retry_count || 0,
                resolved: log.resolved || false,
                latency_ms: log.latency_ms
            }
        }));

        const encoder = new TextEncoder();
        const eventsData = encoder.encode(JSON.stringify(events));
        const hashBuffer = await crypto.subtle.digest('SHA-256', eventsData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const eventsHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return Response.json({
            request_id: new_request_id,
            correlation_id: new_correlation_id,
            tool_name: "logs.tail",
            tool_version: "LOGTAIL_v1_2026-03-02",
            ts_iso,
            source: "log_store",
            hash: `sha256:${eventsHash}`,
            events
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});