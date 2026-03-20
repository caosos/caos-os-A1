/**
 * WCW (WORKING CONTEXT WINDOW) BUDGET MANAGEMENT
 * 
 * Enforces ≤70% utilization ceiling with self-regulation.
 * Prevents context overflow and ensures steady-state operation.
 * 
 * Contract: MEMORY/RECALL CHANGESET § 8 (WCW Utilization Budget)
 */

// Context window budget constants
const WCW_TOTAL_TOKENS = 128000; // Total context window (gpt-4o)
const WCW_UTILIZATION_CEILING = 0.70; // 70% max utilization
const WCW_TARGET_BUDGET = Math.floor(WCW_TOTAL_TOKENS * 0.60); // 60% target
const WCW_CRITICAL_THRESHOLD = Math.floor(WCW_TOTAL_TOKENS * WCW_UTILIZATION_CEILING);

/**
 * Calculate WCW utilization
 * 
 * @param {number} current_tokens - Current token usage
 * @returns {Object} Utilization metrics
 */
export function calculateWCWUtilization(current_tokens) {
    const utilization_pct = current_tokens / WCW_TOTAL_TOKENS;
    const remaining_tokens = WCW_TOTAL_TOKENS - current_tokens;
    const approaching_ceiling = utilization_pct >= 0.60; // Warning at 60%
    const at_ceiling = utilization_pct >= WCW_UTILIZATION_CEILING;

    return {
        current_tokens,
        total_tokens: WCW_TOTAL_TOKENS,
        utilization_pct,
        remaining_tokens,
        target_budget: WCW_TARGET_BUDGET,
        critical_threshold: WCW_CRITICAL_THRESHOLD,
        approaching_ceiling,
        at_ceiling,
        status: at_ceiling ? 'CRITICAL' : approaching_ceiling ? 'WARNING' : 'NOMINAL'
    };
}

/**
 * Allocate WCW budget for recall tiers
 * 
 * @param {Array<string>} tiers_allowed - Authorized recall tiers
 * @param {number} available_tokens - Available token budget
 * @returns {Object} Budget allocation per tier
 */
export function allocateWCWBudget(tiers_allowed, available_tokens = WCW_TARGET_BUDGET) {
    const allocation = {};
    
    // Default distribution percentages
    const defaults = {
        session: 0.60,  // 60% for session tail
        lane: 0.20,     // 20% for lane anchors
        profile: 0.15,  // 15% for profile anchors
        global: 0.05    // 5% for global lookups
    };

    let total_weight = 0;
    tiers_allowed.forEach(tier => {
        total_weight += defaults[tier] || 0;
    });

    // Allocate proportionally
    tiers_allowed.forEach(tier => {
        const weight = defaults[tier] || 0;
        allocation[tier] = Math.floor(available_tokens * (weight / total_weight));
    });

    console.log('💰 [WCW_BUDGET_ALLOCATED]', { 
        available_tokens,
        allocation 
    });

    return allocation;
}

/**
 * Check if WCW self-regulation is needed
 * 
 * @param {number} current_tokens - Current token usage
 * @returns {Object} Regulation decision
 */
export function checkWCWSelfRegulation(current_tokens) {
    const metrics = calculateWCWUtilization(current_tokens);

    if (metrics.at_ceiling) {
        console.error('🚨 [WCW_AT_CEILING]', {
            utilization: `${(metrics.utilization_pct * 100).toFixed(1)}%`,
            current: current_tokens,
            ceiling: WCW_CRITICAL_THRESHOLD
        });

        return {
            regulate: true,
            severity: 'CRITICAL',
            actions_required: [
                'compact_session_tail',
                'promote_stable_facts_to_anchors',
                'drop_cold_content',
                'tighten_correlator_selectivity'
            ],
            reason: 'Utilization at ceiling - immediate self-regulation required'
        };
    }

    if (metrics.approaching_ceiling) {
        console.warn('⚠️ [WCW_APPROACHING_CEILING]', {
            utilization: `${(metrics.utilization_pct * 100).toFixed(1)}%`,
            current: current_tokens,
            target: WCW_TARGET_BUDGET
        });

        return {
            regulate: true,
            severity: 'WARNING',
            actions_required: [
                'promote_stable_facts_to_anchors',
                'monitor_next_turn'
            ],
            reason: 'Utilization approaching ceiling - preemptive regulation'
        };
    }

    return {
        regulate: false,
        severity: 'NOMINAL',
        actions_required: [],
        reason: 'Utilization within normal range'
    };
}

/**
 * Generate WCW regulation receipt
 */
export function generateWCWRegulationReceipt(params) {
    const {
        request_id,
        before_tokens,
        after_tokens,
        actions_taken,
        tokens_freed
    } = params;

    const before_metrics = calculateWCWUtilization(before_tokens);
    const after_metrics = calculateWCWUtilization(after_tokens);

    return {
        request_id,
        regulation_occurred: true,
        before: {
            tokens: before_tokens,
            utilization_pct: before_metrics.utilization_pct
        },
        after: {
            tokens: after_tokens,
            utilization_pct: after_metrics.utilization_pct
        },
        tokens_freed,
        actions_taken,
        timestamp_utc: new Date().toISOString()
    };
}

/**
 * Estimate token count for content
 */
export function estimateTokens(content) {
    if (!content) return 0;
    if (typeof content === 'string') {
        return Math.ceil(content.length / 4); // Rough estimate: 4 chars ≈ 1 token
    }
    if (typeof content === 'object') {
        return Math.ceil(JSON.stringify(content).length / 4);
    }
    return 0;
}