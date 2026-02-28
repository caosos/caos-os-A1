/**
 * ErrorEnvelope — Canonical error object. Single source of truth.
 * All pipeline errors become this shape before any transport.
 */

const SYSTEM_VERSION = '2.1.0'; // hybridMessage + DCO v1

/**
 * Valid pipeline stages for layer attribution.
 */
export const STAGES = {
    AUTH:           'auth',
    PROFILE_LOAD:   'profile_load',
    MEMORY_SAVE:    'memory_save',
    HISTORY_LOAD:   'history_load',
    MEMORY_RECALL:  'memory_recall',
    HEURISTICS:     'heuristics',
    PROMPT_BUILD:   'prompt_build',
    OPENAI_CALL:    'openai_call',
    MESSAGE_SAVE:   'message_save',
    ANCHOR_UPDATE:  'anchor_update',
    EXECUTION_HOST: 'execution_host', // catch-all for unknown stage
};

/**
 * Build a canonical ErrorEnvelope from a caught error.
 *
 * @param {Error} err - The caught error object
 * @param {object} ctx - Context at point of failure
 * @param {string} ctx.stage - Which STAGES value (where it failed)
 * @param {string} ctx.request_id
 * @param {string} [ctx.session_id]
 * @param {string} [ctx.user_email]
 * @param {string} [ctx.model_used]
 * @param {number} [ctx.latency_ms]
 * @returns {object} ErrorEnvelope
 */
export function buildErrorEnvelope(err, ctx = {}) {
    const error_id = crypto.randomUUID();
    const stage    = ctx.stage || STAGES.EXECUTION_HOST;

    // Classify error_code from message patterns
    const error_code = classifyErrorCode(err.message || '', stage);

    // Public-safe message — never leaks internals
    const public_safe_message = derivePublicMessage(error_code);

    return {
        error_id,
        request_id:          ctx.request_id  || null,
        session_id:          ctx.session_id  || null,
        user_email:          ctx.user_email  || null,
        stage,
        error_code,
        error_message:       err.message     || 'Unknown error',
        stack_trace:         sanitizeStack(err.stack || ''),
        model_used:          ctx.model_used  || null,
        latency_ms:          ctx.latency_ms  || null,
        system_version:      SYSTEM_VERSION,
        created_at:          new Date().toISOString(),
        public_safe_message,
        retry_attempted:     false, // future: pass in from retry logic
    };
}

/**
 * Classify a machine-readable error code from error message + stage.
 */
function classifyErrorCode(message, stage) {
    const m = message.toLowerCase();

    if (m.includes('rate limit') || m.includes('429'))           return 'RATE_LIMIT_EXCEEDED';
    if (m.includes('context_length') || m.includes('max token')) return 'CONTEXT_LENGTH_EXCEEDED';
    if (m.includes('unauthorized') || m.includes('401'))         return 'AUTH_FAILURE';
    if (m.includes('timeout') || m.includes('timed out'))        return 'TIMEOUT';
    if (m.includes('no response') || m.includes('empty'))        return 'EMPTY_RESPONSE';
    if (m.includes('network') || m.includes('fetch'))            return 'NETWORK_ERROR';
    if (m.includes('quota') || m.includes('insufficient'))       return 'QUOTA_EXCEEDED';
    if (stage === STAGES.OPENAI_CALL)                            return 'OPENAI_CALL_FAILED';
    if (stage === STAGES.MEMORY_SAVE)                            return 'MEMORY_WRITE_FAILED';
    if (stage === STAGES.HISTORY_LOAD || stage === STAGES.PROFILE_LOAD) return 'DATA_LOAD_FAILED';
    return 'INTERNAL_ERROR';
}

/**
 * Map error codes to user-facing messages. No internals.
 */
function derivePublicMessage(error_code) {
    const MAP = {
        RATE_LIMIT_EXCEEDED:     'Service is temporarily busy. Please try again in a moment.',
        CONTEXT_LENGTH_EXCEEDED: 'Your conversation is very long. Try starting a new thread.',
        AUTH_FAILURE:            'Authentication error. Please refresh and try again.',
        TIMEOUT:                 'The request took too long. Please try again.',
        EMPTY_RESPONSE:          'No response was generated. Please try again.',
        NETWORK_ERROR:           'A network issue occurred. Please check your connection.',
        QUOTA_EXCEEDED:          'Service capacity reached. Please try again shortly.',
        OPENAI_CALL_FAILED:      'AI inference failed. Please try again.',
        MEMORY_WRITE_FAILED:     'Memory could not be saved. Your message was processed.',
        DATA_LOAD_FAILED:        'Could not load session data. Please refresh.',
        INTERNAL_ERROR:          'A processing error occurred. Please try again.',
    };
    return MAP[error_code] || 'A processing error occurred. Please try again.';
}

/**
 * Strip file paths and internal identifiers from stack traces.
 * Keeps function names and line numbers for triage.
 */
function sanitizeStack(stack) {
    return stack
        .split('\n')
        .slice(0, 8) // cap depth
        .map(line => line.replace(/file:\/\/[^\s)]+/g, '<file>').trim())
        .join('\n');
}