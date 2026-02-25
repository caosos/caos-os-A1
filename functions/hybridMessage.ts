import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { runHybridPipeline } from './runHybridPipeline.js';
import { postTurnMemoryUpdate } from './core/memoryUpdate.js';

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

        // POST-TURN MEMORY UPDATE: Update thread & user memories after successful response
        if (result.reply && !result.error) {
            postTurnMemoryUpdate({
                base44,
                userId: user.email,
                threadId: session_id,
                userMessage: rawInput,
                assistantMessage: result.reply,
                traceId: result.request_id
            }).catch(err => {
                console.error('⚠️ [MEMORY_UPDATE_ASYNC_FAILED]', err.message);
                // Don't block response on memory update failure
            });
            
            // CONTINUOUS LEARNING: Extract and persist new facts
            import('./core/continuousLearning.js').then(({ extractAndPersistFacts }) => {
                extractAndPersistFacts({
                    base44,
                    userId: user.email,
                    threadId: session_id,
                    userMessage: rawInput,
                    assistantMessage: result.reply,
                    toolResults: result.execution_state?.executor_used ? result : null
                }).catch(err => {
                    console.error('⚠️ [FACT_EXTRACTION_ASYNC_FAILED]', err.message);
                });
            });
            
            // MEMORY ANCHORS: Extract durable facts
            import('./core/memoryAnchors.js').then(({ extractMemoryAnchors }) => {
                extractMemoryAnchors({
                    base44,
                    userId: user.email,
                    userMessage: rawInput,
                    assistantMessage: result.reply
                }).catch(err => {
                    console.error('⚠️ [ANCHOR_EXTRACTION_ASYNC_FAILED]', err.message);
                });
            });
        }

        return Response.json(result);

    } catch (error) {
        console.error('🔥 [HTTP_HANDLER_ERROR]', { error: error.message });
        return Response.json({
            error: 'HTTP_HANDLER_FAILURE',
            details: error.message
        }, { status: 500 });
    }
});