import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { resolveIntent } from './stages/resolveIntent.js';
import { routeTool } from './stages/routeTool.js';
import { executeTool } from './stages/executeTool.js';
import { formatResult } from './stages/formatResult.js';
import { applyCognitiveLayer } from './stages/applyCognitiveLayer.js';
import { normalizeInput } from './core/normalize.js';
import { logDriftEvent } from './core/executorContract.js';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
    const request_id = crypto.randomUUID();
    const execution_state = {
        request_id,
        mode: null,
        intent_detected: null,
        route_selected: null,
        executor_used: null,
        status: 'STARTED',
        started_at: Date.now()
    };
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const timestamp = Date.now();
        const body = await req.json();
        const { input: rawInput, session_id } = body;

        console.log('🚀 [PIPELINE_START]', { request_id, input: rawInput.substring(0, 80), timestamp });

        // STAGE 0: PRE-INFERENCE NORMALIZATION
        const input = await normalizeInput(rawInput, base44, user.email);
        console.log('🧹 [NORMALIZED]', { request_id, original: rawInput.substring(0, 40), normalized: input.substring(0, 40) });

        // ========== CONVERSATIONAL LOCK: Check if refinement request ==========
        const recentRecords = await base44.asServiceRole.entities.Record.filter(
            { session_id, status: "active" },
            '-seq',
            2
        );
        const lastAssistantMessage = recentRecords.find(r => r.role === 'assistant');
        const previousMode = lastAssistantMessage?.message?.includes('[MODE=GEN]') ? 'GEN' : null;

        const isRefinement = (text) => {
            const refinementTriggers = [
                'try again', 'rewrite', 'in first person', 'sound like',
                'more natural', 'less robotic', 'like you', 'more personal',
                'less formal', 'warmer', 'more casual', 'be yourself'
            ];
            const lowerText = text.toLowerCase();
            return refinementTriggers.some(trigger => lowerText.includes(trigger));
        };

        let bypassIntentResolver = false;
        let forcedRoute = null;

        if (previousMode === 'GEN' && isRefinement(input)) {
            console.log('🔒 [CONVERSATIONAL_LOCK]', { request_id, reason: 'refinement_detected', previousMode: 'GEN' });
            bypassIntentResolver = true;
            forcedRoute = 'GENERATION_PIPELINE';
        }

        // ========== STAGE 1: RESOLVE INTENT ==========
        const intentResult = bypassIntentResolver ? {
            intent: 'GENERATE',
            confidence: 1.0,
            reason: 'CONVERSATIONAL_LOCK',
            extractedTerms: [],
            multiQuery: false,
            userEmail: user.email
        } : resolveIntent({
            userMessage: input,
            timestamp,
            userEmail: user.email
        });

        execution_state.intent_detected = intentResult.intent;
        console.log('📊 [INTENT_RESULT]', { request_id, intent: intentResult.intent, confidence: intentResult.confidence });

        // DRIFT DETECTION: GEN with SEARCH intent
        if (intentResult.forceRetrievalMode && intentResult.intent !== 'SEARCH_THREADS') {
            await logDriftEvent(base44, {
                session_id,
                drift_type: 'manifest_violation',
                severity: 'HIGH',
                layer: 'resolveIntent',
                details: { forceRetrievalMode: true, intent: intentResult.intent },
                corrective_action: 'HARD_FAIL'
            });
            throw new Error('ROUTE_VIOLATION: forceRetrievalMode requires SEARCH_THREADS intent');
        }

        // ========== STAGE 2: ROUTE TOOL ==========
        let routeResult;
        try {
            if (forcedRoute) {
                routeResult = {
                    route: forcedRoute,
                    requiresTool: false,
                    formatter: 'GEN_FORMATTER'
                };
                console.log('🔒 [FORCED_ROUTE]', { request_id, route: forcedRoute });
            } else {
                routeResult = routeTool(intentResult);
            }
        } catch (routeError) {
            // Handle structured errors from routeTool
            if (routeError.mode === 'ERROR' && routeError.code === 'SEARCH_TERMS_MISSING') {
                console.error('🚨 [ROUTE_VALIDATION_FAILED]', { request_id, error: routeError.code });
                
                // Check execution toggle to determine what to show
                const showExecution = true; // Could check localStorage or user preference
                
                const errorResponse = showExecution 
                    ? {
                        error: routeError.message,
                        debug: routeError.debug,
                        mode: 'ERROR',
                        code: routeError.code
                      }
                    : {
                        error: routeError.message,
                        mode: 'ERROR'
                      };
                
                return Response.json(errorResponse, { status: 400 });
            }
            
            // Re-throw unknown errors
            throw routeError;
        }

        execution_state.route_selected = routeResult.route;
        console.log('🧭 [ROUTE_RESULT]', { request_id, route: routeResult.route, formatter: routeResult.formatter });

        // ========== STAGE 3: EXECUTE TOOL ==========
        let toolResult = null;
        try {
            if (routeResult.requiresTool) {
                toolResult = await executeTool(routeResult, intentResult, base44, user);
                execution_state.executor_used = toolResult?.executor || 'UNKNOWN';
            }
        } catch (execError) {
            execution_state.status = 'EXECUTION_FAILED';
            console.error('🚨 [EXECUTION_FAILED]', { request_id, error: execError.message });
            await logDriftEvent(base44, {
                session_id,
                drift_type: 'tool_behavior_mismatch',
                severity: 'HIGH',
                layer: 'executeTool',
                details: { error: execError.message, route: routeResult.route },
                corrective_action: 'HARD_FAIL'
            });
            return Response.json({ error: execError.message || 'Execution failed', request_id }, { status: 500 });
        }

        // ========== STAGE 4: FORMAT RESULT ==========
        let formattedResult;
        try {
            formattedResult = formatResult(routeResult, toolResult);
        } catch (formatError) {
            execution_state.status = 'FORMAT_FAILED';
            console.error('🚨 [FORMAT_FAILED]', { request_id, error: formatError.message });
            return Response.json({ error: formatError.message || 'Format failed', request_id }, { status: 500 });
        }

        execution_state.mode = formattedResult.mode;

        // DRIFT DETECTION: Mode mismatch
        if (intentResult.intent === 'SEARCH_THREADS' && formattedResult.mode === 'GEN') {
            await logDriftEvent(base44, {
                session_id,
                drift_type: 'tool_behavior_mismatch',
                severity: 'CRITICAL',
                layer: 'formatResult',
                details: { intent: intentResult.intent, mode: formattedResult.mode },
                corrective_action: 'MODE_CORRECTION_REQUIRED'
            });
        }

        // ========== STAGE 5: APPLY COGNITIVE LAYER ==========
        let finalResponse;
        try {
            finalResponse = applyCognitiveLayer(formattedResult, input);
        } catch (cogError) {
            execution_state.status = 'COGNITIVE_FAILED';
            console.error('🚨 [COGNITIVE_LAYER_FAILED]', { request_id, error: cogError.error || cogError.message });
            
            // DRIFT DETECTION: GEN/SEARCH boundary violation
            if (cogError.error === 'ROUTE_VIOLATION_GEN_SEARCH' || cogError.error === 'PIPELINE_VIOLATION_GEN_LIST') {
                await logDriftEvent(base44, {
                    session_id,
                    drift_type: 'unauthorized_memory_write',
                    severity: 'CRITICAL',
                    layer: 'applyCognitiveLayer',
                    details: cogError,
                    corrective_action: 'HARD_FAIL'
                });
            }
            
            return Response.json({ error: cogError.error || cogError.message, request_id }, { status: 500 });
        }

        execution_state.status = 'SUCCESS';
        execution_state.ended_at = Date.now();
        execution_state.latency_ms = execution_state.ended_at - execution_state.started_at;

        console.log('✅ [PIPELINE_SUCCESS]', { 
            request_id,
            intent: intentResult.intent, 
            route: routeResult.route, 
            mode: finalResponse.mode,
            latency_ms: execution_state.latency_ms
        });

        // ========== EXECUTION RECEIPT GENERATION ==========
        const execution_receipt = {
            request_id,
            mode: finalResponse.mode,
            route: routeResult.route,
            tool_invoked: toolResult?.executor || null,
            extracted_terms: intentResult.extractedTerms || [],
            query_used: toolResult?.query_terms ? toolResult.query_terms.join(', ') : null,
            result_count: toolResult?.count || 0,
            execution_time_ms: execution_state.latency_ms,
            fallback_triggered: false,
            intent: intentResult.intent,
            confidence: intentResult.confidence
        };

        console.log('📋 [EXECUTION_RECEIPT]', execution_receipt);

        return Response.json({
            reply: finalResponse.content,
            mode: finalResponse.mode,
            session: session_id,
            execution_state,
            execution_receipt
        });

    } catch (error) {
        execution_state.status = 'CRITICAL_FAILURE';
        execution_state.ended_at = Date.now();
        console.error('🔥 [PIPELINE_CRITICAL_ERROR]', { request_id: execution_state.request_id, error: error.message });
        return Response.json({
            error: 'PIPELINE_FAILURE',
            details: error.message,
            execution_state
        }, { status: 500 });
    }
});