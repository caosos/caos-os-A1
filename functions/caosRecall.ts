import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { session_id, anchor_filters, limit = 50 } = body;

        // Build query for anchor matching
        let records = await base44.asServiceRole.entities.Record.filter(
            { session_id, status: "active" },
            '-ts_snapshot_ms',
            limit
        );

        // Filter by anchors if provided
        if (anchor_filters && anchor_filters.length > 0) {
            records = records.filter(record => {
                const recordAnchors = record.anchors || [];
                return anchor_filters.every(filter => 
                    recordAnchors.some(anchor => 
                        anchor.class === filter.class && 
                        (!filter.value || anchor.value === filter.value)
                    )
                );
            });
        }

        return Response.json({
            records,
            count: records.length,
            session_id
        });

    } catch (error) {
        console.error('Recall error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});