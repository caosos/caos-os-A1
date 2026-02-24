import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { runHybridPipeline } from './runHybridPipeline.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { input: rawInput, session_id, trace } = body;
        // Call extracted pipeline
        const result = await runHybridPipeline(rawInput, {
            base44,
            user,
            session_id,
            trace
        });

        return Response.json(result);

    } catch (error) {
        console.error('🔥 [HTTP_HANDLER_ERROR]', { error: error.message });
        return Response.json({
            error: 'HTTP_HANDLER_FAILURE',
            details: error.message
        }, { status: 500 });
    }
});