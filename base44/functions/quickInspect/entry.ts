import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { normalizeInput } from './core/normalize.js';
import { resolveIntent } from './stages/resolveIntent.js';
import { routeTool } from './stages/routeTool.js';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    const testInput = "search through my threads and gather an understanding of what we've been doing";
    const normalized = await normalizeInput(testInput, base44, user?.email);
    const intentResult = resolveIntent({
        userMessage: normalized,
        timestamp: Date.now(),
        userEmail: user?.email || 'test',
        sessionId: 'inspect'
    });
    const routeResult = routeTool(intentResult);

    return Response.json({
        raw: testInput,
        normalized,
        intent: intentResult,
        route: routeResult
    });
});