/**
 * CAOS DIAGNOSTIC MODE
 * 
 * Two modes only:
 * - MODE: OPERATE (normal - hides internals)
 * - MODE: DIAGNOSTIC (exposes selector decisions, recall tiers, tool consideration, provenance)
 * 
 * Mode switching requires receipt.
 */

/**
 * Check if diagnostic mode is enabled for session
 */
export function isDiagnosticMode(session_id, environmentDeclaration) {
    // Can be controlled via environment or session flag
    return environmentDeclaration?.mode === 'DIAGNOSTIC';
}

/**
 * Generate diagnostic receipt if diagnostic mode enabled
 */
export async function emitDiagnosticReceipt(params, base44) {
    const {
        request_id,
        session_id,
        selector_decision,
        recall_result,
        tool_result,
        environment_declaration,
        context_journal,
        latency_breakdown,
        diagnostic_mode
    } = params;

    if (!diagnostic_mode) {
        console.log('⏭️ [DIAGNOSTIC_MODE_OFF] Skipping diagnostic receipt');
        return null;
    }

    console.log('🔬 [DIAGNOSTIC_RECEIPT_EMITTING]', { request_id, session_id });

    // Extract recall tier counts
    const recall_tier_counts = {
        session: recall_result?.messages?.length || 0,
        lane: 0, // To be implemented
        profile: recall_result?.facts?.length || 0,
        global: 0  // To be implemented
    };

    // Extract tool consideration
    const tool_consideration = [];
    if (selector_decision?.tools_allowed) {
        for (const tool of selector_decision.tools_allowed) {
            tool_consideration.push({
                tool_name: tool,
                authorized: true,
                executed: tool_result?.executor === tool.toLowerCase() || false,
                result_status: tool_result?.success ? 'SUCCESS' : 'NOT_EXECUTED'
            });
        }
    }

    // Extract provenance tags
    const provenance_tags = [];
    if (recall_result?.messages?.length > 0) {
        provenance_tags.push('session_memory');
    }
    if (recall_result?.facts?.length > 0) {
        provenance_tags.push('learned_facts');
    }
    if (tool_result?.cached) {
        provenance_tags.push('global_bin_cache');
    }
    if (tool_result?.source === 'external') {
        provenance_tags.push('external_lookup');
    }

    // Create diagnostic receipt
    const receipt = await base44.asServiceRole.entities.DiagnosticReceipt.create({
        request_id,
        session_id,
        diagnostic_mode: true,
        selector_decision: {
            decision_id: selector_decision.decision_id,
            response_mode: selector_decision.response_mode,
            recall_authorized: selector_decision.recall_authorized,
            inference_allowed: selector_decision.inference_allowed,
            tools_allowed: selector_decision.tools_allowed
        },
        recall_tier_counts,
        tool_consideration,
        environment_snapshot: {
            mode: environment_declaration.mode,
            policy_gating: environment_declaration.policy_gating,
            capabilities: environment_declaration.capabilities
        },
        provenance_tags,
        context_paths_active: Object.keys(context_journal || {}),
        latency_breakdown: latency_breakdown || {},
        created_at: new Date().toISOString()
    });

    console.log('✅ [DIAGNOSTIC_RECEIPT_EMITTED]', { receipt_id: receipt.id });

    return receipt;
}

/**
 * Format diagnostic information for user-facing display
 */
export function formatDiagnosticSummary(receipt) {
    if (!receipt) {
        return '';
    }

    return `

---
**DIAGNOSTIC MODE**

**Selector Decision:**
- Response Mode: ${receipt.selector_decision.response_mode}
- Recall: ${receipt.selector_decision.recall_authorized ? '✅ Authorized' : '❌ Denied'}
- Inference: ${receipt.selector_decision.inference_allowed ? '✅ Authorized' : '❌ Denied'}
- Tools: ${receipt.selector_decision.tools_allowed?.join(', ') || 'None'}

**Recall Tiers:**
- Session: ${receipt.recall_tier_counts.session} items
- Profile: ${receipt.recall_tier_counts.profile} facts
- Global: ${receipt.recall_tier_counts.global} cached

**Tool Execution:**
${receipt.tool_consideration.map(t => 
    `- ${t.tool_name}: ${t.executed ? '✅ Executed' : '⏭️ Not executed'} (${t.result_status})`
).join('\n') || '- No tools authorized'}

**Provenance:**
${receipt.provenance_tags.map(tag => `- ${tag}`).join('\n') || '- No external sources'}

**Context Paths:**
${receipt.context_paths_active.map(path => `- ${path}`).join('\n')}

**Latency:**
- Total: ${receipt.latency_breakdown.total_ms}ms
- Boot: ${receipt.latency_breakdown.boot_validation_ms}ms
- Context: ${receipt.latency_breakdown.context_load_ms}ms
- Selector: ${receipt.latency_breakdown.selector_ms}ms
- Recall: ${receipt.latency_breakdown.recall_ms}ms
- Inference: ${receipt.latency_breakdown.inference_ms}ms
- Tools: ${receipt.latency_breakdown.tool_execution_ms}ms

Request ID: ${receipt.request_id}
---`;
}