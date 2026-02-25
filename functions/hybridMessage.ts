import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { runHybridPipeline } from './runHybridPipeline.js';
import { postTurnMemoryUpdate } from './core/memoryUpdate.js';
import { validateRouteInvocation, generateRouteReceipt } from './core/routeRegistry.js';

Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();

    try {
        console.log('🚀 [HYBRID_MESSAGE_START]', { request_id });
        
        const base44 = createClientFromRequest(req);
        console.log('✅ [CLIENT_CREATED]');
        
        const user = await base44.auth.me();
        console.log('✅ [USER_AUTHENTICATED]', { email: user?.email });

        // Validate route authorization
        const route_validation = validateRouteInvocation('prod.message.hybrid', {
            authenticated: !!user,
            user
        });

        if (!route_validation.allowed) {
            console.log('❌ [ROUTE_DENIED]', { reason: route_validation.deny_reason });
            return Response.json({
                error: 'ROUTE_DENIED',
                deny_reason: route_validation.deny_reason,
                details: route_validation.details,
                route_receipt: generateRouteReceipt({
                    route_id: 'prod.message.hybrid',
                    request_id,
                    allowed: false,
                    deny_reason: route_validation.deny_reason,
                    details: route_validation.details,
                    elapsed_ms: Date.now() - startTime
                })
            }, { status: 403 });
        }
        
        console.log('✅ [ROUTE_VALIDATED]');

        const body = await req.json();
        const { input: rawInput, session_id, trace } = body;
        
        console.log('📥 [REQUEST_BODY]', { 
            hasInput: !!rawInput, 
            inputLength: rawInput?.length,
            session_id,
            trace
        });
        
        // Call extracted pipeline
        console.log('🔄 [CALLING_PIPELINE]', { session_id });
        const result = await runHybridPipeline(rawInput, {
            base44,
            user,
            session_id,
            trace
        });
        console.log('✅ [PIPELINE_COMPLETE]', { 
            hasReply: !!result?.reply,
            hasError: !!result?.error,
            mode: result?.mode
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

        console.log('📤 [RETURNING_RESPONSE]', { request_id });
        return Response.json(result);

    } catch (error) {
        console.error('🔥 [HTTP_HANDLER_ERROR]', { 
            request_id,
            error: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // Return graceful error to frontend
        return Response.json({
            reply: "I encountered an error. The system has logged this issue for review.",
            error: 'HTTP_HANDLER_FAILURE',
            error_details: error.message,
            request_id,
            mode: 'ERROR',
            degradation: {
                type: 'handler_error',
                details: error.message
            }
        }, { status: 200 }); // Return 200 with error payload instead of 500
    }
});