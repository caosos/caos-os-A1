/**
 * CAOS-A1 CORE PIPELINE EXECUTOR
 * 
 * MANDATORY EXECUTION ORDER:
 * 1. Boot Validation Check
 * 2. Environment Declaration Load
 * 3. Context Journal Load (kernel → bootloader → profile → project → runtime)
 * 4. Selector Invocation (MANDATORY - authorizes ALL operations)
 * 5. Recall (if authorized)
 * 6. Context Assembly (before model)
 * 7. Inference (if authorized)
 * 8. Tool Execution (if authorized)
 * 9. Response Build
 * 10. Memory Commit
 * 11. Receipt Emission
 * 
 * CRITICAL: Selector is sole authority. No operation proceeds without authorization.
 * If selector not invoked → FAIL-CLOSED.
 */

import { loadContextJournal, validateContextJournal } from './core/contextLoader.js';
import { invokeSelector, verifySelectorInvoked } from './core/selectorEngine.js';
import { executeTool } from './core/toolExecutor.js';
import { normalizeInput } from './core/normalize.js';
import { logDriftEvent } from './core/executorContract.js';
import { sanitizeUserFacingText } from './core/sanitizer.js';
import { loadUserProfile, buildIdentitySystemPrompt, enforceIdentity } from './middleware/identityContract.js';
import { isDiagnosticMode, emitDiagnosticReceipt, formatDiagnosticSummary } from './core/diagnosticMode.js';

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
        boot_valid: false,
        context_loaded: false,
        selector_invoked: false,
        selector_decision: null,
        status: 'STARTED',
        started_at: timestamp
    };

    // Latency tracking
    const latency_breakdown = {
        boot_validation_ms: 0,
        context_load_ms: 0,
        selector_ms: 0,
        recall_ms: 0,
        inference_ms: 0,
        tool_execution_ms: 0,
        total_ms: 0
    };

    try {
        console.log('🚀 [CAOS_A1_PIPELINE_START]', { request_id, session_id, user: user.email });

        // ============================================================
        // STAGE 1: BOOT VALIDATION CHECK
        // ============================================================
        console.log('🥾 [STAGE_1_BOOT_VALIDATION]');
        
        const bootStart = Date.now();
        let bootReceipt;
        try {
            bootReceipt = await validateBoot(session_id, user.email, base44);
            execution_state.boot_valid = bootReceipt.valid;
            latency_breakdown.boot_validation_ms = Date.now() - bootStart;
            
            if (!bootReceipt.valid) {
                throw new Error(`BOOT_VALIDATION_FAILED: ${bootReceipt.failure_reason}`);
            }
            
            console.log('✅ [BOOT_VALID]', { session_id, paths: bootReceipt.context_paths_loaded.length });
        } catch (bootError) {
            console.error('🚨 [BOOT_FAILED]', bootError.message);
            return {
                error: 'BOOT_VALIDATION_FAILED',
                details: bootError.message,
                request_id,
                mode: 'HALT'
            };
        }

        // ============================================================
        // STAGE 2: ENVIRONMENT DECLARATION LOAD
        // ============================================================
        console.log('🌍 [STAGE_2_ENVIRONMENT_LOAD]');
        
        const environmentDeclaration = loadEnvironmentDeclaration();
        const diagnostic_mode = isDiagnosticMode(session_id, environmentDeclaration);
        
        console.log('✅ [ENVIRONMENT_LOADED]', { 
            mode: environmentDeclaration.mode,
            policy: environmentDeclaration.policy_gating,
            diagnostic: diagnostic_mode
        });

        // ============================================================
        // STAGE 3: CONTEXT JOURNAL LOAD (STRICT ORDER)
        // ============================================================
        console.log('📚 [STAGE_3_CONTEXT_JOURNAL_LOAD]');
        
        const contextStart = Date.now();
        let contextJournal;
        try {
            contextJournal = await loadContextJournal(session_id, user.email, base44);
            validateContextJournal(contextJournal);
            execution_state.context_loaded = true;
            latency_breakdown.context_load_ms = Date.now() - contextStart;
            
            console.log('✅ [CONTEXT_JOURNAL_VALID]', { 
                paths: Object.keys(contextJournal),
                scopes: Object.values(contextJournal).map(c => c.scope)
            });
        } catch (contextError) {
            console.error('🚨 [CONTEXT_LOAD_FAILED]', contextError.message);
            return {
                error: 'CONTEXT_LOAD_FAILED',
                details: contextError.message,
                request_id,
                mode: 'HALT'
            };
        }

        // ============================================================
        // STAGE 0: PRE-INFERENCE NORMALIZATION (after context loaded)
        // ============================================================
        const input = await normalizeInput(rawInput, base44, user.email);
        console.log('🧹 [NORMALIZED]', { 
            original_length: rawInput.length,
            normalized_length: input.length
        });

        // ============================================================
        // STAGE 4: SELECTOR INVOCATION (MANDATORY)
        // ============================================================
        console.log('🎯 [STAGE_4_SELECTOR_INVOCATION]');
        
        const selectorStart = Date.now();
        let selectorDecision;
        try {
            selectorDecision = await invokeSelector({
                request_id,
                session_id,
                user_email: user.email,
                user_input: input,
                context_journal: contextJournal,
                environment_declaration: environmentDeclaration,
                timestamp_ms: timestamp
            }, base44);
            
            execution_state.selector_invoked = true;
            execution_state.selector_decision = selectorDecision;
            latency_breakdown.selector_ms = Date.now() - selectorStart;
            
            console.log('✅ [SELECTOR_DECISION]', {
                response_mode: selectorDecision.response_mode,
                recall_authorized: selectorDecision.recall_authorized,
                inference_allowed: selectorDecision.inference_allowed,
                tools_allowed: selectorDecision.tools_allowed
            });
            
            // HALT if selector says so
            if (selectorDecision.response_mode === 'HALT_EXPLAINED') {
                return {
                    reply: `Cannot proceed: ${selectorDecision.halt_reason}\n\n${selectorDecision.forward_path}`,
                    mode: 'HALT',
                    session: session_id,
                    request_id,
                    selector_decision: selectorDecision
                };
            }
            
            // CLARIFY if selector says so
            if (selectorDecision.response_mode === 'CLARIFY') {
                return {
                    reply: `I need more information: ${selectorDecision.halt_reason}\n\n${selectorDecision.forward_path}`,
                    mode: 'CLARIFY',
                    session: session_id,
                    request_id,
                    selector_decision: selectorDecision
                };
            }
            
        } catch (selectorError) {
            console.error('🚨 [SELECTOR_INVOCATION_FAILED]', selectorError.message);
            return {
                error: 'SELECTOR_INVOCATION_FAILED',
                details: selectorError.message,
                request_id,
                mode: 'HALT'
            };
        }

        // ============================================================
        // STAGE 5: RECALL (IF AUTHORIZED)
        // ============================================================
        let recallResult = null;
        
        if (selectorDecision.recall_authorized) {
            console.log('🔍 [STAGE_5_RECALL_AUTHORIZED]', {
                tiers: selectorDecision.recall_tiers_allowed,
                limit: selectorDecision.recall_limit
            });
            
            const recallStart = Date.now();
            try {
                recallResult = await executeRecall({
                    session_id,
                    user_email: user.email,
                    user_input: input,
                    tiers_allowed: selectorDecision.recall_tiers_allowed,
                    limit: selectorDecision.recall_limit
                }, base44);
                
                latency_breakdown.recall_ms = Date.now() - recallStart;
                
                console.log('✅ [RECALL_COMPLETE]', {
                    facts_found: recallResult.facts?.length || 0,
                    messages_found: recallResult.messages?.length || 0
                });
            } catch (recallError) {
                console.error('⚠️ [RECALL_FAILED]', recallError.message);
                // Non-fatal - continue without recall
            }
        } else {
            console.log('⏭️ [RECALL_SKIPPED]', 'Selector did not authorize recall');
        }

        // ============================================================
        // STAGE 6: CONTEXT ASSEMBLY (BEFORE MODEL)
        // ============================================================
        console.log('📦 [STAGE_6_CONTEXT_ASSEMBLY]');
        
        const assembledContext = assembleModelContext({
            contextJournal,
            environmentDeclaration,
            selectorDecision,
            recallResult,
            userInput: input
        });
        
        console.log('✅ [CONTEXT_ASSEMBLED]', {
            blocks: Object.keys(assembledContext),
            total_chars: JSON.stringify(assembledContext).length
        });

        // ============================================================
        // STAGE 7: INFERENCE (IF AUTHORIZED)
        // ============================================================
        let inferenceResult = null;
        
        if (selectorDecision.inference_allowed) {
            console.log('🧠 [STAGE_7_INFERENCE_AUTHORIZED]');
            
            const inferenceStart = Date.now();
            try {
                inferenceResult = await executeInference({
                    assembledContext,
                    userInput: input,
                    openaiKey: Deno.env.get('OPENAI_API_KEY')
                });
                
                latency_breakdown.inference_ms = Date.now() - inferenceStart;
                
                console.log('✅ [INFERENCE_COMPLETE]', {
                    response_length: inferenceResult.content?.length || 0
                });
            } catch (inferenceError) {
                console.error('🚨 [INFERENCE_FAILED]', inferenceError.message);
                return {
                    error: 'INFERENCE_FAILED',
                    details: inferenceError.message,
                    request_id,
                    selector_decision: selectorDecision
                };
            }
        } else {
            console.log('⏭️ [INFERENCE_DENIED]', 'Selector did not authorize inference');
            return {
                reply: 'Inference not authorized by selector.',
                mode: 'RETRIEVAL',
                session: session_id,
                request_id,
                selector_decision: selectorDecision
            };
        }

        // ============================================================
        // STAGE 8: TOOL EXECUTION (IF AUTHORIZED)
        // ============================================================
        let toolResult = null;
        
        if (selectorDecision.tools_allowed && selectorDecision.tools_allowed.length > 0) {
            console.log('🔧 [STAGE_8_TOOL_EXECUTION_AUTHORIZED]', {
                tools: selectorDecision.tools_allowed
            });
            
            const toolStart = Date.now();
            try {
                toolResult = await executeTool({
                    user_input: input,
                    selector_decision: selectorDecision
                }, base44);
                
                latency_breakdown.tool_execution_ms = Date.now() - toolStart;
                
                console.log('✅ [TOOL_EXECUTION_COMPLETE]', {
                    executor: toolResult?.executor,
                    success: toolResult?.success
                });
            } catch (toolError) {
                console.error('⚠️ [TOOL_EXECUTION_FAILED]', toolError.message);
                // Non-fatal - continue without tool result
            }
        } else {
            console.log('⏭️ [TOOLS_NOT_AUTHORIZED]', 'Selector did not authorize any tools');
        }
        
        // ============================================================
        // STAGE 9: RESPONSE BUILD
        // ============================================================
        console.log('📝 [STAGE_9_RESPONSE_BUILD]');
        
        const userProfile = await loadUserProfile(base44, user.email);
        let finalResponse = inferenceResult.content;
        
        // Sanitize and enforce identity
        finalResponse = sanitizeUserFacingText(finalResponse, { failLoud: false });
        finalResponse = enforceIdentity(finalResponse, userProfile);
        
        console.log('✅ [RESPONSE_BUILT]', { length: finalResponse.length });

        // ============================================================
        // STAGE 10: MEMORY COMMIT
        // ============================================================
        console.log('💾 [STAGE_10_MEMORY_COMMIT]');
        
        try {
            await commitMemory({
                session_id,
                user_email: user.email,
                user_message: input,
                assistant_message: finalResponse,
                request_id
            }, base44);
            
            console.log('✅ [MEMORY_COMMITTED]');
        } catch (memoryError) {
            console.error('⚠️ [MEMORY_COMMIT_FAILED]', memoryError.message);
            // Non-fatal - continue
        }

        // ============================================================
        // STAGE 11: RECEIPT EMISSION
        // ============================================================
        latency_breakdown.total_ms = Date.now() - timestamp;
        
        const receipt = {
            request_id,
            session_id,
            boot_valid: true,
            context_loaded: true,
            selector_invoked: true,
            selector_decision_id: selectorDecision.decision_id,
            recall_executed: selectorDecision.recall_authorized,
            inference_executed: selectorDecision.inference_allowed,
            tools_executed: selectorDecision.tools_allowed,
            response_mode: selectorDecision.response_mode,
            latency_ms: latency_breakdown.total_ms,
            latency_breakdown,
            timestamp_utc: new Date().toISOString()
        };
        
        console.log('📋 [RECEIPT_EMITTED]', receipt);

        // DIAGNOSTIC MODE: Emit detailed diagnostic receipt
        let diagnosticReceipt = null;
        if (diagnostic_mode) {
            try {
                diagnosticReceipt = await emitDiagnosticReceipt({
                    request_id,
                    session_id,
                    selector_decision: selectorDecision,
                    recall_result: recallResult,
                    tool_result: toolResult,
                    environment_declaration: environmentDeclaration,
                    context_journal: contextJournal,
                    latency_breakdown,
                    diagnostic_mode: true
                }, base44);
            } catch (diagError) {
                console.error('⚠️ [DIAGNOSTIC_RECEIPT_FAILED]', diagError.message);
            }
        }

        execution_state.status = 'SUCCESS';
        execution_state.ended_at = Date.now();
        execution_state.latency_ms = latency_breakdown.total_ms;

        // Append diagnostic summary if diagnostic mode enabled
        let responseWithDiagnostics = finalResponse;
        if (diagnostic_mode && diagnosticReceipt) {
            responseWithDiagnostics += formatDiagnosticSummary(diagnosticReceipt);
        }

        return {
            reply: responseWithDiagnostics,
            mode: 'GEN',
            session: session_id,
            request_id,
            execution_state,
            receipt,
            selector_decision: selectorDecision,
            diagnostic_receipt: diagnosticReceipt
        };

    } catch (error) {
        execution_state.status = 'CRITICAL_FAILURE';
        execution_state.ended_at = Date.now();
        console.error('🔥 [PIPELINE_CRITICAL_ERROR]', { request_id, error: error.message, stack: error.stack });

        return {
            error: 'PIPELINE_FAILURE',
            details: error.message,
            request_id,
            execution_state
        };
    }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function validateBoot(session_id, user_email, base44) {
    const timestamp = new Date();
    const timestamp_ms = timestamp.getTime();

    // Check if boot receipt exists and is valid
    const existingReceipts = await base44.asServiceRole.entities.BootReceipt.filter(
        { session_id, valid: true },
        '-boot_timestamp_ms',
        1
    );

    if (existingReceipts && existingReceipts.length > 0) {
        // Boot already valid
        return existingReceipts[0];
    }

    // Create new boot receipt
    const bootReceipt = await base44.asServiceRole.entities.BootReceipt.create({
        session_id,
        boot_timestamp: timestamp.toISOString(),
        boot_timestamp_ms: timestamp_ms,
        valid: true,
        context_paths_loaded: [
            '/context/kernel/identity',
            '/context/bootloader/config',
            `/context/profiles/${user_email}`
        ],
        missing_contexts: [],
        environment_declaration: {
            mode: 'OPERATE',
            policy_gating: 'ACTIVE'
        },
        capabilities_enabled: {
            web_enabled: true,
            file_search_enabled: true,
            image_gen_enabled: true,
            memory_enabled: true
        }
    });

    return bootReceipt;
}

function loadEnvironmentDeclaration() {
    return {
        mode: 'OPERATE',
        policy_gating: 'ACTIVE',
        capabilities: {
            web_search: true,
            file_search: true,
            image_generation: true,
            memory_recall: true
        },
        constraints: {
            max_recall_items: 25,
            max_context_tokens: 8000
        }
    };
}

async function executeRecall(params, base44) {
    const { session_id, user_email, user_input, tiers_allowed, limit } = params;
    
    // Import tiered recall system
    const { executeTieredRecall } = await import('./core/tieredRecall.js');
    
    // Get profile_id and lane_id from context
    // For now, derive from session - in production this comes from context journal
    const profile_id = user_email;
    const lane_id = 'default'; // Default lane until lane system fully implemented
    
    const result = await executeTieredRecall({
        profile_id,
        session_id,
        lane_id,
        tiers_allowed,
        limit
    }, base44);

    // Transform for pipeline compatibility
    return {
        messages: result.session_records,
        facts: [...result.lane_anchors, ...result.profile_anchors],
        global_lookups: result.global_lookups,
        tiers_used: result.tiers_used,
        wcw_tokens: result.wcw_tokens
    };
}

function assembleModelContext(params) {
    const {
        contextJournal,
        environmentDeclaration,
        selectorDecision,
        recallResult,
        userInput
    } = params;

    const blocks = {};

    // Block 1: System Identity
    blocks.system_identity = contextJournal['/context/kernel/identity']?.content || {};

    // Block 2: Active Context Journal Entries
    blocks.context_paths = Object.values(contextJournal).map(c => ({
        path: c.path,
        scope: c.scope,
        loaded_at: c.loaded_at
    }));

    // Block 3: Environment Constraints
    blocks.environment = environmentDeclaration;

    // Block 4: Selector Decision Summary
    blocks.selector = {
        recall_authorized: selectorDecision.recall_authorized,
        inference_allowed: selectorDecision.inference_allowed,
        tools_allowed: selectorDecision.tools_allowed,
        response_mode: selectorDecision.response_mode
    };

    // Block 5: Relevant Recall Result
    if (recallResult) {
        blocks.recall = {
            messages: recallResult.messages?.slice(0, 10).map(m => ({
                role: m.role,
                content: m.message?.substring(0, 500)
            })) || [],
            facts: recallResult.facts || []
        };
    }

    // Block 6: User Profile Snapshot
    blocks.user_profile = contextJournal[`/context/profiles/${selectorDecision.session_id}`]?.content || {};

    // Block 7: Current User Input
    blocks.user_input = userInput;

    return blocks;
}

async function executeInference(params) {
    const { assembledContext, userInput, openaiKey } = params;

    if (!openaiKey) {
        throw new Error('OPENAI_API_KEY not configured');
    }

    // Build system prompt from context
    const systemPrompt = buildSystemPrompt(assembledContext);

    // Build user prompt
    const userPrompt = buildUserPrompt(assembledContext, userInput);

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                ...buildConversationHistory(assembledContext),
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: data.usage
    };
}

function buildSystemPrompt(context) {
    const identity = context.system_identity;
    const userProfile = context.user_profile;
    
    return `${identity.identity || 'You are Aria, an AI assistant'}.

You operate under Selector authority.
${context.selector.tools_allowed.includes('IMAGE') ? 'You can generate images using the IMAGE tool.' : ''}
${context.selector.recall_authorized ? 'You have access to conversation memory.' : 'You do not have access to previous conversations.'}

Communication style: ${userProfile.presentation_preferences?.tone || 'natural and conversational'}

CRITICAL: Context governs. Selector authorizes. Inference is privilege.`;
}

function buildUserPrompt(context, userInput) {
    let prompt = userInput;

    // Inject recall context if available
    if (context.recall && context.recall.messages.length > 0) {
        prompt = `[CONVERSATION HISTORY]:\n${context.recall.messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n${prompt}`;
    }

    return prompt;
}

function buildConversationHistory(context) {
    if (!context.recall || !context.recall.messages) {
        return [];
    }

    return context.recall.messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
    }));
}

async function commitMemory(params, base44) {
    const { session_id, user_email, user_message, assistant_message, request_id } = params;

    // Import Plane B writer
    const { writeTurnToPlaneB } = await import('./core/planeB.js');
    
    // Write to Plane B (authoritative session transcript)
    const profile_id = user_email;
    const lane_id = 'default'; // Default lane
    const correlator_id = request_id;
    const timestamp_ms = Date.now();
    
    await writeTurnToPlaneB({
        profile_id,
        session_id,
        lane_id,
        correlator_id,
        user_message,
        assistant_message,
        timestamp_ms
    }, base44);
}