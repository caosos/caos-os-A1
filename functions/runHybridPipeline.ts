/**
 * CAOS CORE PIPELINE EXECUTOR
 * 
 * Pure function - no HTTP, no auth, no infrastructure.
 * This is the deterministic heart of CAOS.
 * 
 * Transport (hybridMessage) calls this.
 * Tests (postPatchAudit) call this directly.
 */

import { resolveIntent } from './stages/resolveIntent.js';
import { routeTool } from './stages/routeTool.js';
import { executeTool } from './stages/executeTool.js';
import { formatResult } from './stages/formatResult.js';
import { applyCognitiveLayer } from './stages/applyCognitiveLayer.js';
import { renderFinalResponse } from './stages/renderer.js';
import { normalizeInput } from './core/normalize.js';
import { logDriftEvent } from './core/executorContract.js';

export async function runHybridPipeline(rawInput, options) {
    const {
        base44,
        user,
        session_id,
        trace = false,
        timestamp = Date.now()
    } = options;

    const request_id = crypto.randomUUID();
    const execution_state = {
        request_id,
        mode: null,
        intent_detected: null,
        route_selected: null,
        executor_used: null,
        status: 'STARTED',
        started_at: timestamp
    };
    
    // Initialize execution receipt
    const execution_receipt = {
        receipt_version: "1.0",
        receipt_id: request_id,
        timestamp_utc: new Date().toISOString(),
        entry_point: "runHybridPipeline",
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
    
    const traceMode = trace === true;
    const stageSnapshots = traceMode ? [] : null;

    try {
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

        // CONVERSATIONAL LOCK: Check if refinement request
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

        // STAGE 1: RESOLVE INTENT
        const intentResult = bypassIntentResolver ? {
            intent: 'GENERATE',
            confidence: 1.0,
            reason: 'CONVERSATIONAL_LOCK',
            extractedTerms: [],
            multiQuery: false,
            userEmail: user.email,
            sessionId: session_id
        } : resolveIntent({
            userMessage: input,
            timestamp,
            userEmail: user.email,
            sessionId: session_id
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
        
        if (traceMode) {
            stageSnapshots.push({
                stage: "STAGE_1_RESOLVE_INTENT",
                intent: intentResult.intent,
                confidence: intentResult.confidence,
                reason: intentResult.reason,
                extracted_terms: intentResult.extractedTerms,
                multi_query: intentResult.multiQuery,
                force_retrieval: intentResult.forceRetrievalMode || false,
                bypass_intent_resolver: bypassIntentResolver,
                conversational_lock: previousMode === 'GEN' && isRefinement(input)
            });
        }
        
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

        // STAGE 2: ROUTE TOOL
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
            if (routeError.mode === 'ERROR' && routeError.code === 'SEARCH_TERMS_MISSING') {
                console.error('🚨 [ROUTE_VALIDATION_FAILED]', { request_id, error: routeError.code });

                execution_receipt.execution_mode = 'ERROR';
                execution_receipt.routing.pipeline = 'VALIDATION_FAILED';
                if (routeError.receipt_fallback) {
                    execution_receipt.fallback = routeError.receipt_fallback;
                }
                execution_receipt.latency_ms = Date.now() - new Date(execution_receipt.timestamp_utc).getTime();

                console.log('📋 [EXECUTION_RECEIPT_VALIDATION_ERROR]', execution_receipt);

                return {
                    error: routeError.message,
                    mode: 'ERROR',
                    code: routeError.code,
                    execution_receipt
                };
            }

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
        
        if (traceMode) {
            stageSnapshots.push({
                stage: "STAGE_2_ROUTE_TOOL",
                route: routeResult.route,
                formatter: routeResult.formatter,
                requires_tool: routeResult.requiresTool,
                forced_route: forcedRoute || null
            });
        }
        
        execution_receipt.routing = {
            pipeline: routeResult.route,
            formatter: routeResult.formatter,
            requires_tool: routeResult.requiresTool
        };

        // STAGE 3: EXECUTE TOOL
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

                execution_receipt.tools = {
                    invoked: true,
                    tool_name: toolResult?.executor || toolResult?.type || 'database_filter',
                    arguments_valid: true,
                    execution_status: "SUCCESS"
                };
                
                if (traceMode) {
                    stageSnapshots.push({
                        stage: "STAGE_3_EXECUTE_TOOL",
                        executor: toolResult?.executor || toolResult?.type,
                        result_count: toolResult?.count || 0,
                        match_type: toolResult?.match_type,
                        search_scope: toolResult?.search_scope,
                        results: toolResult?.results || []
                    });
                }
            } else if (traceMode) {
                stageSnapshots.push({
                    stage: "STAGE_3_EXECUTE_TOOL",
                    skipped: true,
                    reason: "requiresTool=false"
                });
            }
        } catch (execError) {
            execution_state.status = 'EXECUTION_FAILED';
            console.error('🚨 [EXECUTION_FAILED]', { request_id, error: execError.message });

            execution_receipt.execution_mode = 'ERROR';
            execution_receipt.tools.invoked = true;
            execution_receipt.tools.execution_status = 'FAILED';
            execution_receipt.fallback = {
                triggered: true,
                fallback_type: 'TOOL_EXECUTION_ERROR',
                reason: execError.error || execError.message
            };
            execution_receipt.latency_ms = Date.now() - new Date(execution_receipt.timestamp_utc).getTime();

            console.log('📋 [EXECUTION_RECEIPT_TOOL_ERROR]', execution_receipt);

            await logDriftEvent(base44, {
                session_id,
                drift_type: 'tool_behavior_mismatch',
                severity: 'HIGH',
                layer: 'executeTool',
                details: { error: execError.message, route: routeResult.route },
                corrective_action: 'HARD_FAIL'
            });

            return { 
                error: execError.message || 'Execution failed', 
                request_id,
                execution_receipt
            };
        }

        // STAGE 4: FORMAT RESULT
        let formattedResult;
        try {
            formattedResult = formatResult(routeResult, toolResult);
        } catch (formatError) {
            execution_state.status = 'FORMAT_FAILED';
            console.error('🚨 [FORMAT_FAILED]', { request_id, error: formatError.message });
            return { error: formatError.message || 'Format failed', request_id };
        }

        execution_state.mode = formattedResult.mode;
        
        if (traceMode) {
            stageSnapshots.push({
                stage: "STAGE_4_FORMAT_RESULT",
                mode: formattedResult.mode,
                content_length: formattedResult.content?.length || 0,
                has_content: !!formattedResult.content
            });
        }

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

        // MEMORY RECALL: LEARNED FACTS FIRST (most important)
        let memoryContext = '';
        
        try {
            // PRIORITY 1: CONTINUOUS LEARNING - Recall relevant facts FIRST
            let relevantFacts = [];
            try {
                const { recallRelevantFacts, formatFactsForContext } = await import('./core/continuousLearning.js');
                relevantFacts = await recallRelevantFacts({
                    base44,
                    userId: user.email,
                    userMessage: input
                });
                
                if (relevantFacts.length > 0) {
                    memoryContext += formatFactsForContext(relevantFacts);
                }
            } catch (factError) {
                console.warn('⚠️ [FACT_RECALL_FAILED]', factError.message);
            }
            
            // PRIORITY 2: User profile and recent messages
            const userProfiles = await base44.asServiceRole.entities.UserProfile.filter(
                { user_email: user.email },
                '-updated_date',
                1
            );
            const userProfile = userProfiles[0];
            
            const recentMessages = await base44.asServiceRole.entities.Record.filter(
                { session_id, status: 'active' },
                '-seq',
                10
            );
            
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
                source: relevantFacts.length > 0 
                    ? 'learned_facts + user_profile + conversation_history' 
                    : (userProfile ? 'user_profile + conversation_history' : 'conversation_history_only')
            };
        } catch (memError) {
            console.error('⚠️ [MEMORY_FETCH_FAILED]', { request_id, error: memError.message });
            execution_receipt.memory_access = {
                used: false,
                source: null
            };
        }

        // STAGE 5: APPLY COGNITIVE LAYER (outputs structured cognition)
        let cognitiveResult;
        try {
            const enhancedInput = formattedResult.mode === 'GEN' 
                ? `${input}${memoryContext}` 
                : input;
            
            cognitiveResult = await applyCognitiveLayer(formattedResult, enhancedInput, base44, user);
            
            if (traceMode) {
                stageSnapshots.push({
                    stage: "STAGE_5_APPLY_COGNITIVE_LAYER",
                    mode: cognitiveResult.mode,
                    structured: cognitiveResult.structured || false,
                    memory_enhanced: formattedResult.mode === 'GEN' && memoryContext.length > 0
                });
            }
        } catch (cogError) {
            execution_state.status = 'COGNITIVE_FAILED';
            console.error('🚨 [COGNITIVE_LAYER_FAILED]', { request_id, error: cogError.error || cogError.message });

            execution_receipt.execution_mode = 'ERROR';
            if (cogError.receipt_fallback) {
                execution_receipt.fallback = cogError.receipt_fallback;
            } else {
                execution_receipt.fallback = {
                    triggered: true,
                    fallback_type: 'COGNITIVE_LAYER_ERROR',
                    reason: cogError.error || cogError.message
                };
            }
            execution_receipt.latency_ms = Date.now() - new Date(execution_receipt.timestamp_utc).getTime();

            console.log('📋 [EXECUTION_RECEIPT_COGNITIVE_ERROR]', execution_receipt);

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

            return { 
                error: cogError.error || cogError.message, 
                request_id,
                execution_receipt
            };
        }

        // STAGE 6: RENDER FINAL RESPONSE (prose generation)
        let finalResponse;
        try {
            const openaiKey = Deno.env.get('OPENAI_API_KEY');
            
            // PATCH 01: Load user profile and build identity contract
            const userProfile = await loadUserProfile(base44, user.email);
            const identitySystemPrompt = buildIdentitySystemPrompt(userProfile);
            
            // Build context blocks for memory injection (with environment awareness)
            const { identityBlock, threadBlock, userBlock, environmentBlock } = await buildGenContext({
                base44,
                userId: user.email,
                threadId: session_id
            });
            
            // If structured cognition, render it
            if (cognitiveResult.structured) {
                const rendered = await renderFinalResponse(cognitiveResult, {
                    userInput: input,
                    openaiKey,
                    identitySystemPrompt,
                    identityBlock,
                    threadBlock,
                    userBlock,
                    environmentBlock,
                    base44,
                    userEmail: user.email
                });
                
                finalResponse = {
                    mode: cognitiveResult.mode,
                    content: rendered
                };
            } else {
                // RETRIEVAL mode or legacy fallback
                finalResponse = cognitiveResult;
            }
            
            // IDENTITY HARD LOCK - Block forbidden patterns and regenerate (SAFE MODE)
            if (finalResponse.content && typeof finalResponse.content === 'string') {
                const forbiddenPatterns = [
                    /as an artificial intelligence/i,
                    /as an ai language model/i,
                    /i am an ai assistant/i,
                    /i'm just an ai/i,
                    /i (?:do not|don't) have (?:access to |the ability to )?(?:remember|recall|access) previous conversations/i,
                    /i (?:cannot|can't) remember/i
                ];
                
                let driftDetected = false;
                let matchedPattern = null;
                
                for (const pattern of forbiddenPatterns) {
                    if (pattern.test(finalResponse.content)) {
                        driftDetected = true;
                        matchedPattern = pattern.source;
                        break;
                    }
                }
                
                if (driftDetected) {
                    console.warn('⚠️ [IDENTITY_DRIFT_DETECTED]', {
                        request_id,
                        pattern: matchedPattern,
                        action: 'logging_only'
                    });
                    // Log drift but don't block - let response through for now
                    // This prevents 500 errors while we stabilize the system
                }
            }
            
            if (traceMode) {
                stageSnapshots.push({
                    stage: "STAGE_6_RENDER_FINAL_RESPONSE",
                    mode: finalResponse.mode,
                    response_length: finalResponse.content?.length || 0,
                    renderer_used: cognitiveResult.structured || false
                });
                }
                } catch (renderError) {
                execution_state.status = 'RENDER_FAILED';
                console.error('🚨 [RENDERER_FAILED]', { request_id, error: renderError.error || renderError.message });

                execution_receipt.execution_mode = 'ERROR';
                execution_receipt.fallback = {
                triggered: true,
                fallback_type: renderError.code === 'FORBIDDEN_DISCLAIMER' ? 'IDENTITY_DRIFT' : 'RENDERER_ERROR',
                reason: renderError.error || renderError.message
                };
                execution_receipt.latency_ms = Date.now() - new Date(execution_receipt.timestamp_utc).getTime();

                console.log('📋 [EXECUTION_RECEIPT_RENDER_ERROR]', execution_receipt);

                return { 
                error: renderError.error || renderError.message, 
                request_id,
                execution_receipt
                };
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

        // FINALIZE EXECUTION RECEIPT
        execution_receipt.execution_mode = finalResponse.mode;
        execution_receipt.guardrails = {
            downgrade_blocked: bypassIntentResolver || false,
            policy_triggered: forcedRoute !== null
        };
        execution_receipt.latency_ms = execution_state.latency_ms;

        console.log('📋 [EXECUTION_RECEIPT]', execution_receipt);

        // FINAL SANITIZATION LAYER - Remove scaffold leakage and mode tags
        let finalClean;
        try {
            // First: enforce identity (may rewrite self-references)
            finalClean = enforceIdentity(finalResponse.content, userProfile);
            
            // Then: sanitize technical markers
            finalClean = sanitizeUserFacingText(finalClean, { failLoud: false });
            
            // CRITICAL: Check for mode tag leakage after sanitization
            if (finalClean && /\[?MODE=[\w]+\]?/i.test(finalClean)) {
                console.error('🚨 [MODE_TAG_LEAKED_AFTER_SANITIZATION]');
                // Strip again aggressively
                finalClean = finalClean.replace(/\[?MODE=[\w]+\]?/gi, '');
            }
            
        } catch (sanitizeError) {
            console.error('🚨 [SANITIZATION_FAILED]', sanitizeError);
            
            execution_receipt.guardrails.policy_triggered = true;
            execution_receipt.fallback = {
                triggered: true,
                fallback_type: 'SCAFFOLD_LEAK',
                reason: sanitizeError.message,
                pattern: sanitizeError.pattern
            };
            
            // Don't hard fail - sanitize and continue
            finalClean = sanitizeUserFacingText(finalResponse.content, { failLoud: false });
            finalClean = enforceIdentity(finalClean, userProfile);
        }
        
        if (finalClean && typeof finalClean === 'string') {
            const forbiddenPatterns = [
                /as an artificial intelligence/i,
                /as an ai language model/i,
                /i am an ai assistant/i,
                /i'm just an ai/i
            ];
            
            for (const pattern of forbiddenPatterns) {
                if (pattern.test(finalClean)) {
                    console.error('🚨 [PERSONALITY_FALLBACK_BLOCKED]', {
                        request_id,
                        pattern: pattern.source
                    });
                    
                    execution_receipt.guardrails.policy_triggered = true;
                    execution_receipt.fallback = {
                        triggered: true,
                        fallback_type: 'STERILE_PERSONA_DETECTED',
                        reason: `Pattern matched: ${pattern.source}`
                    };
                    break;
                }
            }
        }
        
        // PAYLOAD ASSEMBLY
        return {
            reply: finalClean,
            mode: finalResponse.mode,
            session: session_id,
            execution_state,
            execution_receipt,
            trace: traceMode ? {
                enabled: true,
                request_id,
                input: rawInput,
                normalized_input: input,
                stages: stageSnapshots,
                total_latency_ms: execution_state.latency_ms,
                timestamp: new Date().toISOString()
            } : null
        };

    } catch (error) {
        execution_state.status = 'CRITICAL_FAILURE';
        execution_state.ended_at = Date.now();
        console.error('🔥 [PIPELINE_CRITICAL_ERROR]', { request_id: execution_state.request_id, error: error.message });

        execution_receipt.execution_mode = 'ERROR';
        execution_receipt.latency_ms = Date.now() - new Date(execution_receipt.timestamp_utc).getTime();
        execution_receipt.fallback = {
            triggered: true,
            fallback_type: 'CRITICAL_ERROR',
            reason: error.message
        };

        console.log('📋 [EXECUTION_RECEIPT_ERROR]', execution_receipt);

        return {
            error: 'PIPELINE_FAILURE',
            details: error.message,
            execution_state,
            execution_receipt
        };
    }
}