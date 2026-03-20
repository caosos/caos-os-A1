/**
 * ANCHOR TRANSFORMATION TEST
 * 
 * This function proves the Base44 SDK bug:
 * - We send anchors as string[] 
 * - Base44 transforms it to {class, value}[]
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const testId = `test_${Date.now()}`;
        const timestamp = Date.now();

        // WHAT WE'RE SENDING (correct format per schema)
        const dataSent = {
            record_id: testId,
            profile_id: user.email,
            session_id: testId,
            lane_id: user.email,
            tier: 'session',
            seq: 1,
            ts_snapshot_iso: new Date(timestamp).toISOString(),
            ts_snapshot_ms: timestamp,
            role: 'user',
            message: 'Test message',
            anchors: [
                `session:${testId}`,
                `lane:${user.email}`,
                `topic:test`
            ],
            correlator_id: testId,
            token_count: 10,
            status: 'active'
        };

        console.log('📤 SENDING TO BASE44:', JSON.stringify({
            anchors: dataSent.anchors,
            anchors_type: Array.isArray(dataSent.anchors) ? 'array' : typeof dataSent.anchors,
            first_anchor_type: typeof dataSent.anchors[0]
        }, null, 2));

        // Create the record
        const created = await base44.asServiceRole.entities.Record.create(dataSent);

        console.log('📥 RECEIVED FROM BASE44:', JSON.stringify({
            anchors: created.anchors,
            anchors_type: Array.isArray(created.anchors) ? 'array' : typeof created.anchors,
            first_anchor_type: typeof created.anchors[0],
            first_anchor_value: created.anchors[0]
        }, null, 2));

        // Read it back to confirm
        const readBack = await base44.asServiceRole.entities.Record.filter(
            { record_id: testId },
            '-seq',
            1
        );

        const found = readBack[0];

        console.log('🔍 READ BACK FROM DB:', JSON.stringify({
            anchors: found.anchors,
            anchors_type: Array.isArray(found.anchors) ? 'array' : typeof found.anchors,
            first_anchor_type: typeof found.anchors[0],
            first_anchor_value: found.anchors[0]
        }, null, 2));

        // Clean up test record
        await base44.asServiceRole.entities.Record.delete(created.id);

        return Response.json({
            test_result: 'COMPLETE',
            proof: {
                what_we_sent: {
                    anchors: dataSent.anchors,
                    format: 'string[]',
                    example: dataSent.anchors[0]
                },
                what_base44_stored: {
                    anchors: found.anchors,
                    format: typeof found.anchors[0] === 'string' ? 'string[]' : 'object[]',
                    example: found.anchors[0]
                },
                bug_confirmed: typeof found.anchors[0] !== 'string'
            }
        });

    } catch (error) {
        console.error('🚨 TEST FAILED:', error.message);
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});