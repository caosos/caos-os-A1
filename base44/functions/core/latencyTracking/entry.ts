/**
 * LATENCY TRACKING SYSTEM
 * 
 * Instruments all pipeline stages with precise timing.
 * Required for DiagnosticReceipt contract.
 * 
 * Contract: MEMORY/RECALL CHANGESET § 6 (Latency Transparency)
 */

/**
 * Create latency tracker for a request
 */
export function createLatencyTracker(request_id) {
    const stages = {};
    const start_time = performance.now();

    return {
        /**
         * Mark stage start
         */
        start(stage_name) {
            if (!stages[stage_name]) {
                stages[stage_name] = { start: performance.now() };
            }
        },

        /**
         * Mark stage end
         */
        end(stage_name) {
            if (stages[stage_name] && !stages[stage_name].end) {
                stages[stage_name].end = performance.now();
                stages[stage_name].duration_ms = 
                    stages[stage_name].end - stages[stage_name].start;
            }
        },

        /**
         * Get breakdown
         */
        getBreakdown() {
            const total_ms = performance.now() - start_time;
            
            const breakdown = {
                boot_validation_ms: stages.boot?.duration_ms || 0,
                context_load_ms: stages.context?.duration_ms || 0,
                selector_ms: stages.selector?.duration_ms || 0,
                recall_ms: stages.recall?.duration_ms || 0,
                normalize_ms: stages.normalize?.duration_ms || 0,
                tool_execution_ms: stages.tool?.duration_ms || 0,
                inference_ms: stages.inference?.duration_ms || 0,
                render_ms: stages.render?.duration_ms || 0,
                commit_ms: stages.commit?.duration_ms || 0,
                total_ms
            };

            // Calculate unaccounted time (overhead)
            const accounted = Object.values(breakdown)
                .filter((v, i) => i < Object.keys(breakdown).length - 1)
                .reduce((sum, v) => sum + v, 0);
            
            breakdown.overhead_ms = total_ms - accounted;

            return breakdown;
        },

        /**
         * Get stage durations
         */
        getStages() {
            return Object.entries(stages).reduce((acc, [name, data]) => {
                acc[name] = data.duration_ms || null;
                return acc;
            }, {});
        },

        /**
         * Check if any stage exceeded threshold
         */
        checkThresholds(thresholds = {}) {
            const violations = [];
            
            for (const [stage, threshold_ms] of Object.entries(thresholds)) {
                const duration = stages[stage]?.duration_ms;
                if (duration && duration > threshold_ms) {
                    violations.push({
                        stage,
                        duration_ms: duration,
                        threshold_ms,
                        exceeded_by_ms: duration - threshold_ms
                    });
                }
            }

            return violations;
        }
    };
}

/**
 * Default latency thresholds (ms)
 */
export const DEFAULT_THRESHOLDS = {
    boot: 50,
    context: 100,
    selector: 200,
    recall: 500,
    normalize: 50,
    tool: 2000,
    inference: 5000,
    render: 500,
    commit: 300
};

/**
 * Log latency breakdown
 */
export function logLatencyBreakdown(request_id, breakdown) {
    console.log('⏱️ [LATENCY_BREAKDOWN]', {
        request_id,
        ...breakdown
    });

    // Warn on high latency
    if (breakdown.total_ms > 10000) {
        console.warn('⚠️ [HIGH_LATENCY_WARNING]', {
            request_id,
            total_ms: breakdown.total_ms
        });
    }
}

/**
 * Create latency receipt
 */
export function createLatencyReceipt(request_id, tracker) {
    const breakdown = tracker.getBreakdown();
    const violations = tracker.checkThresholds(DEFAULT_THRESHOLDS);

    return {
        request_id,
        breakdown,
        violations,
        high_latency: breakdown.total_ms > 10000,
        timestamp_utc: new Date().toISOString()
    };
}