/**
 * SYSTEM HEALTH ENDPOINT
 * 
 * Public health check endpoint for monitoring.
 * Returns system status without sensitive data.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const startTime = Date.now();

    try {
        const base44 = createClientFromRequest(req);

        // Check database connectivity
        let db_healthy = false;
        try {
            await base44.asServiceRole.entities.BootReceipt.filter({}, '-boot_timestamp_ms', 1);
            db_healthy = true;
        } catch (dbError) {
            console.error('⚠️ [DB_HEALTH_CHECK_FAILED]', dbError.message);
        }

        // Check OpenAI API key
        const openai_configured = !!Deno.env.get('OPENAI_API_KEY');

        // System status
        const status = db_healthy && openai_configured ? 'healthy' : 'degraded';

        const health = {
            status,
            timestamp: new Date().toISOString(),
            checks: {
                database: db_healthy ? 'pass' : 'fail',
                openai_api: openai_configured ? 'configured' : 'missing'
            },
            uptime_ms: performance.now(),
            latency_ms: Date.now() - startTime
        };

        return Response.json(health, {
            status: status === 'healthy' ? 200 : 503
        });

    } catch (error) {
        console.error('🔥 [HEALTH_CHECK_ERROR]', error.message);

        return Response.json({
            status: 'unhealthy',
            error: 'HEALTH_CHECK_FAILED',
            timestamp: new Date().toISOString()
        }, { status: 503 });
    }
});