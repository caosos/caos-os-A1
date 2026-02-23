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
    
    // STEP 2: Initialize execution receipt at entry - always present
    const execution_receipt = {
        request_id,
        timestamp_entry: Date.now(),
        entrypoint: 'hybridMessage',
        pipeline_events: [],
        intent: null,
        route: null,
        tool_execution: null,
        guardrails: {},
        mode: null,
        execution_time_ms: null,
        fallback_triggered: false
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

        // AUDIT LOG 1: Full request body at entry
        console.log('🔍 [AUDIT_1_REQUEST_BODY]', JSON.stringify({
            request_id,
            body: body,
            keys: Object.keys(body),
            rawInput_preview: rawInput?.substring(0, 200),
            session_id,
            timestamp
        }, null, 2));

        // AUDIT LOG 2: Execution flag presence
        const executionFlagPresent = body.hasOwnProperty('show_execution') || 
                                     body.hasOwnProperty('execution_mode') ||
                                     body.hasOwnProperty('execution');
        console.log('🔍 [AUDIT_2_EXECUTION_FLAG]', JSON.stringify({
            request_id,
            execution_flag_present: executionFlagPresent,
            body_keys: Object.keys(body),
            body_show_execution: body.show_execution,
            body_execution_mode: body.execution_mode,
            body_execution: body.execution
        }, null, 2));
        
        execution_receipt.pipeline_events.push({
            stage: 'ENTRY',
            timestamp: Date.now(),
            user_authenticated: true,
            session_id
        });

        console.log('🚀 [PIPELINE_START]', { 
            request_id, 
            raw_input: rawInput.substring(0, 150),
            session_id,
            timestamp 
        });

        // STAGE 0: PRE-INFERENCE NORMALIZATION
        const input = await normalizeInput(rawInput, base44, user.email);
        console.log('🧹 [NORMALIZED]', { 
            request_id, 
            original: rawInput.substring(0, 100), 
            normalized: input.substring(0, 100),
            length_change: input.length - rawInput.length
        });

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
        console.log('📊 [INTENT_RESULT]', { 
            request_id, 
            intent: intentResult.intent, 
            confidence: intentResult.confidence,
            reason: intentResult.reason,
            extracted_terms: intentResult.extractedTerms,
            multi_query: intentResult.multiQuery,
            force_retrieval: intentResult.forceRetrievalMode
        });
        
        // Update receipt with intent
        execution_receipt.intent = {
            detected: intentResult.intent,
            confidence: intentResult.confidence,
            reason: intentResult.reason,
            extracted_terms: intentResult.extractedTerms || [],
            multi_query: intentResult.multiQuery || false
        };
        execution_receipt.pipeline_events.push({
            stage: 'INTENT_RESOLUTION',
            timestamp: Date.now(),
            intent: intentResult.intent,
            bypass: bypassIntentResolver || false
        });

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
        console.log('🧭 [ROUTE_RESULT]', { 
            request_id, 
            route: routeResult.route, 
            formatter: routeResult.formatter,
            requires_tool: routeResult.requiresTool,
            forced_route: forcedRoute || null
        });
        
        // Update receipt with route
        execution_receipt.route = {
            selected: routeResult.route,
            formatter: routeResult.formatter,
            requires_tool: routeResult.requiresTool
        };
        execution_receipt.pipeline_events.push({
            stage: 'ROUTING',
            timestamp: Date.now(),
            route: routeResult.route
        });

        // ========== STAGE 3: EXECUTE TOOL ==========
        let toolResult = null;
        try {
            if (routeResult.requiresTool) {
                console.log('🔧 [EXECUTE_TOOL_ENTRY]', { 
                    request_id,
                    route: routeResult.route,
                    extracted_terms: intentResult.extractedTerms,
                    intent: intentResult.intent
                });

                toolResult = await executeTool(routeResult, intentResult, base44, user);
                execution_state.executor_used = toolResult?.executor || 'UNKNOWN';

                console.log('🔧 [EXECUTE_TOOL_RESULT]', { 
                    request_id,
                    executor: toolResult?.executor || toolResult?.type,
                    result_count: toolResult?.count || 0,
                    match_type: toolResult?.match_type,
                    search_scope: toolResult?.search_scope
                });

                // Update receipt with tool execution
                execution_receipt.tool_execution = {
                    invoked: toolResult?.type || toolResult?.executor || 'database_filter',
                    match_type: toolResult?.match_type || null,
                    match_fields: toolResult?.match_fields || [],
                    result_count: toolResult?.count || 0,
                    search_scope: toolResult?.search_scope || null
                };
                execution_receipt.pipeline_events.push({
                    stage: 'TOOL_EXECUTION',
                    timestamp: Date.now(),
                    tool: toolResult?.type,
                    count: toolResult?.count
                });
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

        execution_receipt.pipeline_events.push({
            stage: 'FORMATTING',
            timestamp: Date.now(),
            mode: formattedResult.mode
        });

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
            tool_invoked: toolResult?.executor || toolResult?.type || null,
            result_count: toolResult?.count || 0,
            fallback_triggered: false,
            latency_ms: execution_state.latency_ms
        });

        // ========== FINALIZE EXECUTION RECEIPT ==========
        execution_receipt.guardrails = {
            refinement_lock_engaged: bypassIntentResolver || false,
            empty_search_blocked: false,
            echo_suppression_triggered: false,
            forced_route: forcedRoute || null
        };
        execution_receipt.mode = finalResponse.mode;
        execution_receipt.execution_time_ms = execution_state.latency_ms;
        execution_receipt.fallback_triggered = false;
        execution_receipt.pipeline_events.push({
            stage: 'COGNITIVE_LAYER',
            timestamp: Date.now(),
            final_mode: finalResponse.mode
        });
        execution_receipt.pipeline_events.push({
            stage: 'COMPLETION',
            timestamp: Date.now()
        });

        console.log('📋 [EXECUTION_RECEIPT]', execution_receipt);

        // AUDIT LOG 3: Receipt object before return
        console.log('🔍 [AUDIT_3_RECEIPT_OBJECT]', JSON.stringify({
            request_id,
            receipt_exists: !!execution_receipt,
            receipt_keys: execution_receipt ? Object.keys(execution_receipt) : [],
            receipt_full: execution_receipt
        }, null, 2));

        const returnPayload = {
            reply: finalResponse.content,
            mode: finalResponse.mode,
            session: session_id,
            execution_state,
            execution_receipt
        };

        // AUDIT LOG 4: Final return payload
        console.log('🔍 [AUDIT_4_RETURN_PAYLOAD]', JSON.stringify({
            request_id,
            payload_keys: Object.keys(returnPayload),
            has_reply: !!returnPayload.reply,
            has_mode: !!returnPayload.mode,
            has_session: !!returnPayload.session,
            has_execution_state: !!returnPayload.execution_state,
            has_execution_receipt: !!returnPayload.execution_receipt,
            execution_receipt_present: returnPayload.hasOwnProperty('execution_receipt'),
            execution_receipt_value: returnPayload.execution_receipt !== undefined ? 'PRESENT' : 'UNDEFINED',
            full_payload: returnPayload
        }, null, 2));

        return Response.json(returnPayload);

    } catch (error) {
        execution_state.status = 'CRITICAL_FAILURE';
        execution_state.ended_at = Date.now();
        console.error('🔥 [PIPELINE_CRITICAL_ERROR]', { request_id: execution_state.request_id, error: error.message });
        
        // STEP 3: Even on error, return receipt if available
        execution_receipt.pipeline_events.push({
            stage: 'ERROR',
            timestamp: Date.now(),
            error: error.message
        });
        execution_receipt.execution_time_ms = Date.now() - execution_receipt.timestamp_entry;
        execution_receipt.mode = 'ERROR';
        
        return Response.json({
            error: 'PIPELINE_FAILURE',
            details: error.message,
            execution_state,
            execution_receipt  // Include receipt even on error
        }, { status: 500 });
    }
});