/**
 * CAOS EXECUTOR INTEGRITY CONTRACT
 * 
 * All executors MUST return this standardized structure.
 * Fail loudly. No silent nulls. No partial success masking.
 */

import { createHash } from "node:crypto";

// ─────────────────────────────────────────────
// EXECUTOR RESPONSE BUILDER
// ─────────────────────────────────────────────

export function buildExecutorResponse({
    ok,
    tool,
    executor,
    started_at,
    ended_at,
    input,
    output,
    error_code,
    error_detail,
    data
}) {
    const latency_ms = ended_at - started_at;
    
    return {
        ok: Boolean(ok),
        tool: tool || 'UNKNOWN',
        executor: executor || 'UNKNOWN',
        started_at: new Date(started_at).toISOString(),
        ended_at: new Date(ended_at).toISOString(),
        latency_ms,
        input_fingerprint: computeFingerprint(input),
        output_fingerprint: computeFingerprint(output || data),
        error_code: error_code || null,
        error_detail: error_detail || null,
        data: ok ? data : null
    };
}

// ─────────────────────────────────────────────
// EXECUTOR VALIDATION
// ─────────────────────────────────────────────

export function validateExecutorResponse(response) {
    const required = ['ok', 'tool', 'executor', 'started_at', 'ended_at', 'latency_ms', 'input_fingerprint', 'output_fingerprint'];
    
    for (const field of required) {
        if (response[field] === undefined || response[field] === null) {
            throw new Error(`EXECUTOR_CONTRACT_VIOLATION: Missing required field '${field}'`);
        }
    }
    
    if (response.ok === false && !response.error_code) {
        throw new Error(`EXECUTOR_CONTRACT_VIOLATION: ok=false but no error_code provided`);
    }
    
    if (response.ok === true && !response.data) {
        throw new Error(`EXECUTOR_CONTRACT_VIOLATION: ok=true but no data provided`);
    }
    
    return true;
}

// ─────────────────────────────────────────────
// FINGERPRINT UTILITIES
// ─────────────────────────────────────────────

function computeFingerprint(obj) {
    if (!obj) return 'NULL';
    const content = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// ─────────────────────────────────────────────
// DRIFT EVENT LOGGER
// ─────────────────────────────────────────────

export async function logDriftEvent(base44, {
    session_id,
    drift_type,
    severity,
    layer,
    details,
    corrective_action
}) {
    const event_id = crypto.randomUUID();
    const detected_ts = Date.now();
    
    try {
        await base44.asServiceRole.entities.DriftEvent.create({
            event_id,
            session_id,
            detected_ts,
            drift_type,
            severity,
            layer,
            details,
            corrective_action,
            resolved: false
        });
        
        console.error('🚨 [DRIFT_DETECTED]', { event_id, drift_type, severity, layer });
    } catch (error) {
        console.error('🔥 [DRIFT_LOG_FAILED]', error.message);
    }
}