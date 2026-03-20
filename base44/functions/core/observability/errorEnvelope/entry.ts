/**
 * errorEnvelope.js — Canonical deterministic error envelope builder
 * ODEL v1 | CAOS_v1
 *
 * Usage:
 *   import { buildDeterministicErrorEnvelope } from './errorEnvelope.js';
 *   const envelope = buildDeterministicErrorEnvelope(err, { stage, model_used, request_id, session_id, user_email });
 */

export const SYSTEM_VERSION = 'CAOS_v1';

/**
 * Classify a machine-readable error_code from the error message + stage.
 */
function classifyErrorCode(message = '', stage = '') {
    const m = message.toLowerCase();
    if (m.includes('rate limit') || m.includes('429'))             return 'RATE_LIMIT_EXCEEDED';
    if (m.includes('context_length') || m.includes('max token'))   return 'CONTEXT_LENGTH_EXCEEDED';
    if (m.includes('unauthorized') || m.includes('401'))           return 'AUTH_FAILURE';
    if (m.includes('timeout') || m.includes('timed out'))          return 'TIMEOUT';
    if (m.includes('no response') || m.includes('empty'))          return 'EMPTY_RESPONSE';
    if (m.includes('network') || m.includes('fetch'))              return 'NETWORK_ERROR';
    if (m.includes('quota') || m.includes('insufficient'))         return 'QUOTA_EXCEEDED';
    if (stage === 'OPENAI_CALL')                                   return 'OPENAI_CALL_FAILED';
    if (stage === 'MEMORY_WRITE')                                  return 'MEMORY_WRITE_FAILED';
    if (stage === 'HISTORY_LOAD' || stage === 'PROFILE_LOAD')     return 'DATA_LOAD_FAILED';
    return 'INTERNAL_ERROR';
}

/**
 * Map error_code to a public-safe user message. No internals exposed.
 */
export function derivePublicMessage(error_code) {
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
 * Strip file paths from stack traces. Keep function names + line numbers.
 */
function sanitizeStack(stack = '') {
    return stack
        .split('\n')
        .slice(0, 8)
        .map(line => line.replace(/file:\/\/[^\s)]+/g, '<file>').trim())
        .join('\n');
}

/**
 * Build a canonical ErrorEnvelope.
 *
 * @param {Error} err
 * @param {object} ctx
 * @param {string} ctx.stage        — pipeline stage (from stageTracker)
 * @param {string} ctx.request_id
 * @param {string} [ctx.session_id]
 * @param {string} [ctx.user_email]
 * @param {string} [ctx.model_used]
 * @param {number} [ctx.latency_ms]
 * @param {boolean} [ctx.retry_attempted]
 * @returns {object} ErrorEnvelope — matches ErrorLog entity shape
 */
export function buildDeterministicErrorEnvelope(err, ctx = {}) {
    const error_id   = crypto.randomUUID();
    const stage      = ctx.stage || 'EXECUTION_HOST';
    const error_code = classifyErrorCode(err?.message || '', stage);

    return {
        // ErrorLog existing fields
        user_email:      ctx.user_email      || null,
        conversation_id: ctx.session_id      || null,
        error_type:      'server_error',
        error_message:   err?.message        || 'Unknown error',
        stack_trace:     sanitizeStack(err?.stack || ''),
        request_payload: { request_id: ctx.request_id || null },
        retry_count:     0,
        resolved:        false,

        // ODEL v1 new fields
        error_id,
        stage,
        error_code,
        model_used:      ctx.model_used      || null,
        system_version:  SYSTEM_VERSION,
        retry_attempted: ctx.retry_attempted || false,
        latency_ms:      ctx.latency_ms      || null,
    };
}