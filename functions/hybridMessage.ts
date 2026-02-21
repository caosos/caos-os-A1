import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { resolveIntent } from './stages/resolveIntent.js';
import { routeTool } from './stages/routeTool.js';
import { executeTool } from './stages/executeTool.js';
import { formatResult } from './stages/formatResult.js';
import { applyCognitiveLayer } from './stages/applyCognitiveLayer.js';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const timestamp = Date.now();
        const body = await req.json();
        const { input, session_id } = body;

        console.log('🚀 [PIPELINE_START]', { input: input.substring(0, 80), timestamp });

        // ========== STAGE 1: RESOLVE INTENT ==========
        const intentResult = resolveIntent({
            userMessage: input,
            timestamp,
            userEmail: user.email
        });

        console.log('📊 [INTENT_RESULT]', JSON.stringify(intentResult));

        // HARD GUARD: If forceRetrievalMode = true, NO GEN fallback allowed
        if (intentResult.forceRetrievalMode && intentResult.intent !== 'SEARCH_THREADS') {
            console.error('🚨 [ROUTE_VIOLATION]: forceRetrievalMode set but intent not SEARCH_THREADS');
            throw new Error('ROUTE_VIOLATION: forceRetrievalMode requires SEARCH_THREADS intent');
        }

        // ========== STAGE 2: ROUTE TOOL ==========
        const routeResult = routeTool(intentResult);

        console.log('🧭 [ROUTE_RESULT]', JSON.stringify({ route: routeResult.route, formatter: routeResult.formatter }));

        // ========== STAGE 3: EXECUTE TOOL ==========
        let toolResult = null;
        try {
            if (routeResult.requiresTool) {
                toolResult = await executeTool(routeResult, intentResult, base44, user);
            }
        } catch (execError) {
            console.error('🚨 [EXECUTION_FAILED]', execError.message);
            return Response.json({ error: execError.message || 'Execution failed' }, { status: 500 });
        }

        // ========== STAGE 4: FORMAT RESULT ==========
        let formattedResult;
        try {
            formattedResult = formatResult(routeResult, toolResult);
        } catch (formatError) {
            console.error('🚨 [FORMAT_FAILED]', formatError.message);
            return Response.json({ error: formatError.message || 'Format failed' }, { status: 500 });
        }

        // ========== STAGE 5: APPLY COGNITIVE LAYER ==========
        let finalResponse;
        try {
            finalResponse = applyCognitiveLayer(formattedResult);
        } catch (cogError) {
            console.error('🚨 [COGNITIVE_LAYER_FAILED]', cogError.error || cogError.message);
            return Response.json({ error: cogError.error || cogError.message }, { status: 500 });
        }

        console.log('✅ [PIPELINE_SUCCESS]', { 
            intent: intentResult.intent, 
            route: routeResult.route, 
            mode: finalResponse.mode 
        });

        return Response.json({
            reply: finalResponse.content,
            mode: finalResponse.mode,
            session: session_id
        });

    } catch (error) {
        console.error('🔥 [PIPELINE_CRITICAL_ERROR]', error.message);
        return Response.json({
            error: 'PIPELINE_FAILURE',
            details: error.message
        }, { status: 500 });
    }
});