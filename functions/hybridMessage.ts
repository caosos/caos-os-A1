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
    
    // STEP 2: Initialize execution receipt at entry - always present (standardized schema)
    const execution_receipt = {
        receipt_version: "1.0",
        receipt_id: request_id,
        timestamp_utc: new Date().toISOString(),
        entry_point: "hybridMessage",
        execution_mode: null,
        intent: {
            classification: null,
            confidence: 0.0,
            force_retrieval: false,
            reason: null
        },
        routing: {
            pipeline: null,
            formatter: null,
            requires_tool: false
        },
        tools: {
            invoked: false,
            tool_name: null,
            arguments_valid: null,
            execution_status: null
        },
        fallback: {
            triggered: false,
            fallback_type: null,
            reason: null
        },
        memory_access: {
            used: false,
            source: null
        },
        guardrails: {
            downgrade_blocked: false,
            policy_triggered: false
        },
        latency_ms: 0
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
        
        // Update receipt with intent (schema v1.0)
        execution_receipt.intent = {
            classification: intentResult.intent,
            confidence: intentResult.confidence,
            force_retrieval: intentResult.forceRetrievalMode || false,
            reason: intentResult.reason
        };

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
        
        // Update receipt with routing (schema v1.0)
        execution_receipt.routing = {
            pipeline: routeResult.route,
            formatter: routeResult.formatter,
            requires_tool: routeResult.requiresTool
        };

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

                // Update receipt with tool execution (schema v1.0)
                execution_receipt.tools = {
                    invoked: true,
                    tool_name: toolResult?.executor || toolResult?.type || 'database_filter',
                    arguments_valid: true,
                    execution_status: "SUCCESS"
                };
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

        // ========== MEMORY RECALL: Fetch conversation history and user profile ==========
        let memoryContext = '';
        
        try {
            // Fetch user profile for persistent memory
            const userProfiles = await base44.asServiceRole.entities.UserProfile.filter(
                { user_email: user.email },
                '-updated_date',
                1
            );
            const userProfile = userProfiles[0];
            
            // Fetch recent conversation history (last 10 messages)
            const recentMessages = await base44.asServiceRole.entities.Record.filter(
                { session_id, status: 'active' },
                '-seq',
                10
            );
            
            // Build memory context
            if (userProfile) {
                memoryContext += `\n\n[PERMANENT MEMORY ABOUT USER]:\n`;
                if (userProfile.presentation_preferences) {
                    memoryContext += `Communication style: ${JSON.stringify(userProfile.presentation_preferences)}\n`;
                }
                if (userProfile.learned_facts && userProfile.learned_facts.length > 0) {
                    memoryContext += `Known facts: ${userProfile.learned_facts.map(f => f.fact).join('; ')}\n`;
                }
                if (userProfile.interests && userProfile.interests.length > 0) {
                    memoryContext += `Interests: ${userProfile.interests.join(', ')}\n`;
                }
                if (userProfile.goals && userProfile.goals.length > 0) {
                    memoryContext += `Goals: ${userProfile.goals.join('; ')}\n`;
                }
            }
            
            if (recentMessages.length > 0) {
                memoryContext += `\n[RECENT CONVERSATION HISTORY]:\n`;
                recentMessages.reverse().forEach(msg => {
                    memoryContext += `${msg.role}: ${msg.message.substring(0, 500)}\n`;
                });
            }
            
            execution_receipt.memory_access = {
                used: true,
                source: userProfile ? 'user_profile + conversation_history' : 'conversation_history_only'
            };
        } catch (memError) {
            console.error('⚠️ [MEMORY_FETCH_FAILED]', { request_id, error: memError.message });
            execution_receipt.memory_access = {
                used: false,
                source: null
            };
        }

        // ========== STAGE 5: APPLY COGNITIVE LAYER ==========
        let finalResponse;
        try {
            // Enhance input with memory context for GEN mode
            const enhancedInput = formattedResult.mode === 'GEN' 
                ? `${input}${memoryContext}` 
                : input;
            
            finalResponse = applyCognitiveLayer(formattedResult, enhancedInput);
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

        // ========== FINALIZE EXECUTION RECEIPT (schema v1.0) ==========
        execution_receipt.execution_mode = finalResponse.mode;
        execution_receipt.guardrails = {
            downgrade_blocked: bypassIntentResolver || false,
            policy_triggered: forcedRoute !== null
        };
        execution_receipt.latency_ms = execution_state.latency_ms;

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
        
        // STEP 3: Even on error, return receipt if available (schema v1.0)
        execution_receipt.execution_mode = 'ERROR';
        execution_receipt.latency_ms = Date.now() - new Date(execution_receipt.timestamp_utc).getTime();
        execution_receipt.fallback = {
            triggered: true,
            fallback_type: 'CRITICAL_ERROR',
            reason: error.message
        };
        
        return Response.json({
            error: 'PIPELINE_FAILURE',
            details: error.message,
            execution_state,
            execution_receipt  // Include receipt even on error
        }, { status: 500 });
    }
});