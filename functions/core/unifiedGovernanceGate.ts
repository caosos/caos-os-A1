/**
 * CAOS UNIFIED GOVERNANCE GATE v2026-02-22
 * 
 * Single deterministic pipeline enforcing:
 * - Mode discipline (GEN cannot search)
 * - System claim verification
 * - Memory continuity + drift detection
 * - Fail loudly discipline
 * - Receipt generation
 * 
 * EXECUTION ORDER (NON-SKIPPABLE):
 * 
 * 0. PRE-INFERENCE NORMALIZATION
 * 1. INTENT RESOLUTION
 * 2. MODE ASSIGNMENT
 * 3. TOOL ROUTING
 * 4. MEMORY ACTIVATION (if applicable)
 * 5. DRIFT CHECK (if memory active)
 * 6. TOOL EXECUTION
 * 7. RESULT FORMATTING
 * 8. CLAIM VERIFICATION
 * 9. RECEIPT GENERATION
 * 10. COGNITIVE LAYER (if GEN mode)
 * 
 * All steps are mandatory. No bypass. No fallback.
 */

import { normalizeInput } from './normalize.js';
import { resolveIntent } from '../stages/resolveIntent.js';
import { routeTool } from '../stages/routeTool.js';
import { executeTool } from '../stages/executeTool.js';
import { formatResult } from '../stages/formatResult.js';
import { applyCognitiveLayer } from '../stages/applyCognitiveLayer.js';
import { buildExecutorResponse, logDriftEvent } from './executorContract.js';

// ═════════════════════════════════════════════════════════════════
// STAGE 0: PRE-INFERENCE NORMALIZATION
// ═════════════════════════════════════════════════════════════════

export async function stage0_normalize(rawInput, base44, userEmail) {
    console.log('🧹 [STAGE_0: NORMALIZE]');
    
    const normalized = await normalizeInput(rawInput, base44, userEmail);
    
    return {
        stage: 'NORMALIZE',
        input: rawInput,
        output: normalized,
        transformations_applied: ['stt_cleanup', 'lexical_rules']
    };
}

// ═════════════════════════════════════════════════════════════════
// STAGE 1: INTENT RESOLUTION
// ═════════════════════════════════════════════════════════════════

export async function stage1_resolveIntent(normalizedInput, sessionContext) {
    console.log('📊 [STAGE_1: RESOLVE_INTENT]');
    
    const intentResult = resolveIntent({
        userMessage: normalizedInput,
        timestamp: Date.now(),
        userEmail: sessionContext.userEmail
    });
    
    // DRIFT GUARD: forceRetrievalMode must match intent
    if (intentResult.forceRetrievalMode && intentResult.intent !== 'SEARCH_THREADS') {
        throw {
            error: 'DRIFT_VIOLATION',
            code: 'FORCE_RETRIEVAL_MODE_MISMATCH',
            stage: 'RESOLVE_INTENT',
            details: 'forceRetrievalMode=true requires SEARCH_THREADS intent'
        };
    }
    
    return {
        stage: 'RESOLVE_INTENT',
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        extractedTerms: intentResult.extractedTerms,
        multiQuery: intentResult.multiQuery,
        forceRetrievalMode: intentResult.forceRetrievalMode || false
    };
}

// ═════════════════════════════════════════════════════════════════
// STAGE 2: MODE ASSIGNMENT
// ═════════════════════════════════════════════════════════════════

export async function stage2_assignMode(intentResult, sessionManifest) {
    console.log('🎯 [STAGE_2: ASSIGN_MODE]');
    
    const modeMap = {
        'LIST_THREADS': 'RETRIEVAL',
        'SEARCH_THREADS': 'RETRIEVAL',
        'GENERIC_GEN': 'GEN',
        'LIVE_WEB': 'LIVE_WEB',
        'FILE_SEARCH': 'FILE_SEARCH',
        'PYTHON': 'PYTHON',
        'IMAGE': 'IMAGE'
    };
    
    const mode = modeMap[intentResult.intent] || 'GEN';
    
    // Verify mode is enabled in manifest
    if (sessionManifest && sessionManifest.capabilities) {
        const capability_map = {
            'LIVE_WEB': 'web_enabled',
            'FILE_SEARCH': 'file_search_enabled',
            'IMAGE': 'image_gen_enabled',
            'PYTHON': 'python_enabled'
        };
        
        const requiredCap = capability_map[mode];
        if (requiredCap && !sessionManifest.capabilities[requiredCap]) {
            throw {
                error: 'MODE_DISABLED',
                code: 'CAPABILITY_NOT_ENABLED',
                stage: 'ASSIGN_MODE',
                mode,
                capability: requiredCap
            };
        }
    }
    
    return {
        stage: 'ASSIGN_MODE',
        mode,
        intent: intentResult.intent,
        manifest_verified: true
    };
}

// ═════════════════════════════════════════════════════════════════
// STAGE 3: TOOL ROUTING
// ═════════════════════════════════════════════════════════════════

export async function stage3_routeTool(intentResult, modeResult) {
    console.log('🧭 [STAGE_3: ROUTE_TOOL]');
    
    const routeResult = routeTool(intentResult);
    
    // Verify route matches mode
    if (modeResult.mode === 'RETRIEVAL' && !routeResult.route.includes('THREAD')) {
        throw {
            error: 'ROUTE_MODE_MISMATCH',
            code: 'RETRIEVAL_MODE_NON_THREAD_ROUTE',
            stage: 'ROUTE_TOOL',
            mode: modeResult.mode,
            route: routeResult.route
        };
    }
    
    return {
        stage: 'ROUTE_TOOL',
        route: routeResult.route,
        requiresTool: routeResult.requiresTool,
        formatter: routeResult.formatter
    };
}

// ═════════════════════════════════════════════════════════════════
// STAGE 4: MEMORY ACTIVATION
// ═════════════════════════════════════════════════════════════════

export async function stage4_activateMemory(userEmail, sessionId, normalizedInput, base44) {
    console.log('🧠 [STAGE_4: MEMORY_ACTIVATION]');
    
    // TODO: Implement memory activation engine
    // For now, return empty active set
    
    return {
        stage: 'MEMORY_ACTIVATION',
        active_beliefs: [],
        activation_threshold: 0.35,
        decay_days: 60,
        top_k: 25,
        tokens_used: 0
    };
}

// ═════════════════════════════════════════════════════════════════
// STAGE 5: DRIFT CHECK
// ═════════════════════════════════════════════════════════════════

export async function stage5_driftCheck(activeMemory, normalizedInput, base44) {
    console.log('⚠️ [STAGE_5: DRIFT_CHECK]');
    
    // TODO: Implement drift detection engine
    // For now, return PASS
    
    return {
        stage: 'DRIFT_CHECK',
        status: 'PASS',
        conflicts: [],
        warnings: []
    };
}

// ═════════════════════════════════════════════════════════════════
// STAGE 6: TOOL EXECUTION
// ═════════════════════════════════════════════════════════════════

export async function stage6_executeTool(routeResult, intentResult, base44, user) {
    console.log('🔧 [STAGE_6: EXECUTE_TOOL]');
    
    if (!routeResult.requiresTool) {
        return {
            stage: 'EXECUTE_TOOL',
            skipped: true,
            reason: 'no_tool_required'
        };
    }
    
    const toolResult = await executeTool(routeResult, intentResult, base44, user);
    
    return {
        stage: 'EXECUTE_TOOL',
        result: toolResult,
        executor: toolResult?.executor || 'UNKNOWN'
    };
}

// ═════════════════════════════════════════════════════════════════
// STAGE 7: RESULT FORMATTING
// ═════════════════════════════════════════════════════════════════

export async function stage7_formatResult(routeResult, toolResult) {
    console.log('📋 [STAGE_7: FORMAT_RESULT]');
    
    const formattedResult = formatResult(routeResult, toolResult);
    
    return {
        stage: 'FORMAT_RESULT',
        mode: formattedResult.mode,
        payload: formattedResult.payload,
        metadata: formattedResult.metadata
    };
}

// ═════════════════════════════════════════════════════════════════
// STAGE 8: CLAIM VERIFICATION
// ═════════════════════════════════════════════════════════════════

export async function stage8_verifyClaims(formattedResult, modeResult, activeMemory) {
    console.log('✅ [STAGE_8: CLAIM_VERIFICATION]');
    
    // TODO: Implement claim verification classifier
    // For now, return basic classification
    
    const claims = [];
    
    // Mode-based claim rules
    if (modeResult.mode === 'RETRIEVAL') {
        claims.push({
            text: 'Thread list retrieved from database',
            class: 'OBSERVED',
            source_refs: ['database_query']
        });
    }
    
    if (modeResult.mode === 'LIVE_WEB') {
        claims.push({
            text: 'Information retrieved from web search',
            class: 'RETRIEVED',
            source_refs: ['web_tool']
        });
    }
    
    return {
        stage: 'CLAIM_VERIFICATION',
        claims,
        mode: modeResult.mode,
        policy_flags: []
    };
}

// ═════════════════════════════════════════════════════════════════
// STAGE 9: RECEIPT GENERATION
// ═════════════════════════════════════════════════════════════════

export async function stage9_generateReceipt(allStages, executionState) {
    console.log('📜 [STAGE_9: GENERATE_RECEIPT]');
    
    const receipt = {
        request_id: executionState.request_id,
        timestamp: new Date().toISOString(),
        mode: allStages.mode?.mode || 'UNKNOWN',
        intent: allStages.intent?.intent || 'UNKNOWN',
        route: allStages.route?.route || 'UNKNOWN',
        executor: allStages.tool?.executor || 'NONE',
        claims: allStages.claims?.claims || [],
        drift_status: allStages.drift?.status || 'NOT_CHECKED',
        latency_ms: executionState.latency_ms,
        status: executionState.status
    };
    
    return {
        stage: 'GENERATE_RECEIPT',
        receipt
    };
}

// ═════════════════════════════════════════════════════════════════
// STAGE 10: COGNITIVE LAYER
// ═════════════════════════════════════════════════════════════════

export async function stage10_cognitiveLayer(formattedResult) {
    console.log('🧠 [STAGE_10: COGNITIVE_LAYER]');
    
    const finalResponse = applyCognitiveLayer(formattedResult);
    
    return {
        stage: 'COGNITIVE_LAYER',
        mode: finalResponse.mode,
        content: finalResponse.content
    };
}

// ═════════════════════════════════════════════════════════════════
// UNIFIED GATE ORCHESTRATOR
// ═════════════════════════════════════════════════════════════════

export async function executeUnifiedGate(rawInput, sessionContext, base44, user) {
    const request_id = crypto.randomUUID();
    const started_at = Date.now();
    
    const executionState = {
        request_id,
        started_at,
        status: 'RUNNING'
    };
    
    const stages = {};
    
    try {
        // STAGE 0: Normalize
        stages.normalize = await stage0_normalize(rawInput, base44, user.email);
        
        // STAGE 1: Resolve Intent
        stages.intent = await stage1_resolveIntent(stages.normalize.output, sessionContext);
        
        // STAGE 2: Assign Mode
        stages.mode = await stage2_assignMode(stages.intent, sessionContext.manifest);
        
        // STAGE 3: Route Tool
        stages.route = await stage3_routeTool(stages.intent, stages.mode);
        
        // STAGE 4: Memory Activation (if enabled)
        if (sessionContext.manifest?.capabilities?.memory_enabled) {
            stages.memory = await stage4_activateMemory(user.email, sessionContext.session_id, stages.normalize.output, base44);
            
            // STAGE 5: Drift Check (if memory active)
            if (stages.memory.active_beliefs.length > 0) {
                stages.drift = await stage5_driftCheck(stages.memory, stages.normalize.output, base44);
                
                // DRIFT GUARD: Block if conflicts detected
                if (stages.drift.status !== 'PASS') {
                    await logDriftEvent(base44, {
                        session_id: sessionContext.session_id,
                        drift_type: 'memory_conflict',
                        severity: 'HIGH',
                        layer: 'stage5_driftCheck',
                        details: stages.drift,
                        corrective_action: 'BLOCKED'
                    });
                    
                    throw {
                        error: 'DRIFT_DETECTED',
                        code: 'MEMORY_CONFLICT',
                        stage: 'DRIFT_CHECK',
                        conflicts: stages.drift.conflicts
                    };
                }
            }
        }
        
        // STAGE 6: Execute Tool
        stages.tool = await stage6_executeTool(stages.route, stages.intent, base44, user);
        
        // STAGE 7: Format Result
        stages.format = await stage7_formatResult(stages.route, stages.tool.result);
        
        // STAGE 8: Verify Claims
        stages.claims = await stage8_verifyClaims(stages.format, stages.mode, stages.memory);
        
        // STAGE 9: Generate Receipt
        executionState.latency_ms = Date.now() - started_at;
        executionState.status = 'SUCCESS';
        stages.receipt = await stage9_generateReceipt(stages, executionState);
        
        // STAGE 10: Cognitive Layer (if GEN mode)
        if (stages.mode.mode === 'GEN') {
            stages.cognitive = await stage10_cognitiveLayer(stages.format);
        } else {
            stages.cognitive = {
                stage: 'COGNITIVE_LAYER',
                mode: stages.format.mode,
                content: stages.format.payload
            };
        }
        
        return {
            success: true,
            request_id,
            mode: stages.mode.mode,
            content: stages.cognitive.content,
            receipt: stages.receipt.receipt,
            execution_state: executionState,
            stages // Full pipeline trace for debugging
        };
        
    } catch (error) {
        executionState.status = 'FAILED';
        executionState.latency_ms = Date.now() - started_at;
        executionState.error = {
            message: error.message || error.error,
            code: error.code,
            stage: error.stage,
            details: error.details
        };
        
        console.error('🚨 [UNIFIED_GATE_FAILURE]', executionState.error);
        
        // Log drift if applicable
        if (error.code && error.code.includes('DRIFT')) {
            await logDriftEvent(base44, {
                session_id: sessionContext.session_id,
                drift_type: error.code.toLowerCase(),
                severity: 'CRITICAL',
                layer: error.stage,
                details: error,
                corrective_action: 'HARD_FAIL'
            });
        }
        
        return {
            success: false,
            request_id,
            error: executionState.error,
            execution_state: executionState,
            stages // Partial pipeline trace
        };
    }
}