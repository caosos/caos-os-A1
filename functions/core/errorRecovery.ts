/**
 * ERROR RECOVERY SYSTEM
 * 
 * Graceful degradation when stages fail.
 * Must log errors but keep system operational.
 * 
 * Contract: RESILIENCE FRAMEWORK (implicit)
 */

/**
 * Error severity levels
 */
export const ErrorSeverity = {
    LOW: 'LOW',           // Warning, system continues
    MEDIUM: 'MEDIUM',     // Degraded mode, partial functionality
    HIGH: 'HIGH',         // Critical, halt request but keep system up
    FATAL: 'FATAL'        // System-level failure, restart required
};

/**
 * Wrap stage execution with error recovery
 */
export async function withErrorRecovery(stageName, stageFunc, options = {}) {
    const {
        fallback = null,
        severity = ErrorSeverity.MEDIUM,
        logError = true,
        request_id = null
    } = options;

    try {
        return await stageFunc();
    } catch (error) {
        if (logError) {
            logStageError({
                stage: stageName,
                error,
                severity,
                request_id
            });
        }

        // If fallback provided, use it
        if (fallback) {
            console.warn(`⚠️ [${stageName}_FALLBACK_USED]`, { request_id });
            return typeof fallback === 'function' ? fallback(error) : fallback;
        }

        // If HIGH or FATAL, re-throw
        if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.FATAL) {
            throw error;
        }

        // Otherwise, return null and log
        console.warn(`⚠️ [${stageName}_FAILED_GRACEFULLY]`, { 
            request_id,
            error: error.message 
        });
        return null;
    }
}

/**
 * Log stage error with context
 */
export function logStageError(params) {
    const { stage, error, severity, request_id } = params;

    const logData = {
        stage,
        severity,
        request_id,
        error: error.message,
        stack: error.stack,
        timestamp_utc: new Date().toISOString()
    };

    if (severity === ErrorSeverity.FATAL) {
        console.error('🔥 [STAGE_ERROR_FATAL]', logData);
    } else if (severity === ErrorSeverity.HIGH) {
        console.error('🚨 [STAGE_ERROR_HIGH]', logData);
    } else if (severity === ErrorSeverity.MEDIUM) {
        console.warn('⚠️ [STAGE_ERROR_MEDIUM]', logData);
    } else {
        console.log('ℹ️ [STAGE_ERROR_LOW]', logData);
    }
}

/**
 * Create error recovery receipt
 */
export function createErrorReceipt(params) {
    const {
        request_id,
        stage,
        error,
        fallback_used,
        recovery_successful
    } = params;

    return {
        request_id,
        stage_failed: stage,
        error_message: error.message,
        error_code: error.code || 'UNKNOWN',
        fallback_used: !!fallback_used,
        recovery_successful: !!recovery_successful,
        timestamp_utc: new Date().toISOString()
    };
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff(func, options = {}) {
    const {
        max_attempts = 3,
        initial_delay_ms = 100,
        backoff_multiplier = 2,
        max_delay_ms = 5000
    } = options;

    let attempt = 1;
    let delay = initial_delay_ms;

    while (attempt <= max_attempts) {
        try {
            return await func();
        } catch (error) {
            if (attempt === max_attempts) {
                throw error;
            }

            console.warn(`⚠️ [RETRY_ATTEMPT_${attempt}]`, {
                error: error.message,
                next_delay_ms: delay
            });

            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * backoff_multiplier, max_delay_ms);
            attempt++;
        }
    }
}

/**
 * Safe database operation wrapper
 */
export async function safeDbOperation(operation, fallback = null) {
    try {
        return await operation();
    } catch (error) {
        console.error('🚨 [DB_OPERATION_FAILED]', {
            error: error.message,
            fallback_available: !!fallback
        });

        if (fallback) {
            return fallback;
        }

        throw error;
    }
}

/**
 * Graceful degradation for recall failures
 */
export function recallFallback(error) {
    console.warn('⚠️ [RECALL_DEGRADED]', { 
        reason: error.message,
        fallback: 'empty_context'
    });

    return {
        messages: [],
        facts: [],
        tiers_used: [],
        degraded: true,
        degradation_reason: error.message
    };
}

/**
 * Graceful degradation for tool execution failures
 */
export function toolExecutionFallback(error, intent) {
    console.warn('⚠️ [TOOL_EXECUTION_DEGRADED]', {
        intent,
        reason: error.message,
        fallback: 'gen_mode'
    });

    return {
        mode: 'GEN',
        tool_result: null,
        degraded: true,
        degradation_reason: error.message,
        fallback_used: 'direct_generation'
    };
}