/**
 * CAOS SELECTOR ENGINE — SOLE AUTHORITY
 * 
 * The Selector is the ONLY entity that authorizes:
 * - Recall operations
 * - Tool execution
 * - Inference
 * - Response modes
 * 
 * NO operation may proceed without selector authorization.
 * If selector not invoked → FAIL-CLOSED.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Invoke selector to authorize operations
 * 
 * @param {Object} params
 * @param {string} params.request_id - Request identifier
 * @param {string} params.session_id - Session identifier
 * @param {string} params.user_email - User email
 * @param {string} params.user_input - User's message
 * @param {Object} params.context_journal - Loaded context paths
 * @param {Object} params.environment_declaration - Environment constraints
 * @param {number} params.timestamp_ms - Request timestamp
 * @returns {Promise<SelectorDecision>}
 */
export async function invokeSelector(params, base44) {
    const {
        request_id,
        session_id,
        user_email,
        user_input,
        context_journal,
        environment_declaration,
        timestamp_ms
    } = params;

    console.log('🎯 [SELECTOR_INVOKED]', { request_id, session_id });

    // Validate context journal is complete
    const required_scopes = ['kernel', 'bootloader', 'profile'];
    const loaded_scopes = new Set(
        Object.values(context_journal || {}).map(c => c.scope)
    );

    const context_valid = required_scopes.every(scope => loaded_scopes.has(scope));

    if (!context_valid) {
        const missing = required_scopes.filter(scope => !loaded_scopes.has(scope));
        console.error('🚨 [SELECTOR_CONTEXT_INVALID]', { missing });
        
        // Create decision record
        const decision = await base44.asServiceRole.entities.SelectorDecision.create({
            decision_id: `selector_${request_id}`,
            session_id,
            selector_invoked: true,
            context_valid: false,
            recall_authorized: false,
            recall_tiers_allowed: [],
            recall_limit: 0,
            inference_allowed: false,
            tools_allowed: [],
            response_mode: 'HALT_EXPLAINED',
            halt_reason: `Required contexts missing: ${missing.join(', ')}`,
            forward_path: 'Load required contexts and retry',
            wcw_impact_estimate: 0
        });

        return decision;
    }

    // AUTHORIZATION LOGIC
    // Default: authorize recall and inference for normal queries
    const recall_authorized = true;
    const recall_tiers_allowed = ['session', 'lane', 'profile', 'global'];
    const recall_limit = 25;
    const inference_allowed = true;
    
    // Tool authorization based on intent patterns
    const tools_allowed = [];
    const input_lower = user_input.toLowerCase();
    
    // IMAGE tool patterns
    if (/\b(draw|create an? image|generate an? image|illustrate|render|make a picture)\b/i.test(user_input)) {
        tools_allowed.push('IMAGE');
    }
    
    // WEB_SEARCH tool patterns
    if (/\b(search|look up|find|what's|current|latest|news)\b/i.test(user_input)) {
        tools_allowed.push('WEB_SEARCH');
    }
    
    // FILE_SEARCH tool patterns
    if (/\b(read|show|display|file|code)\b/i.test(user_input)) {
        tools_allowed.push('FILE_SEARCH');
    }

    // Determine response mode
    let response_mode = 'ANSWER';
    let halt_reason = null;
    let forward_path = null;

    // Check for ambiguity requiring clarification
    if (user_input.length < 5) {
        response_mode = 'CLARIFY';
        halt_reason = 'Input too short to determine intent';
        forward_path = 'Provide more detail about your request';
    }

    // Create and store selector decision
    const decision = await base44.asServiceRole.entities.SelectorDecision.create({
        decision_id: `selector_${request_id}`,
        session_id,
        selector_invoked: true,
        context_valid,
        recall_authorized,
        recall_tiers_allowed,
        recall_limit,
        inference_allowed,
        tools_allowed,
        response_mode,
        halt_reason,
        forward_path,
        wcw_impact_estimate: recall_limit * 100 // rough estimate
    });

    console.log('✅ [SELECTOR_DECISION]', {
        request_id,
        response_mode,
        recall_authorized,
        tools_allowed,
        inference_allowed
    });

    return decision;
}

/**
 * Verify selector decision exists for request
 */
export async function verifySelectorInvoked(request_id, base44) {
    const decisions = await base44.asServiceRole.entities.SelectorDecision.filter(
        { decision_id: `selector_${request_id}` },
        '-created_date',
        1
    );

    if (!decisions || decisions.length === 0) {
        throw new Error(`SELECTOR_NOT_INVOKED: No decision found for ${request_id}`);
    }

    return decisions[0];
}