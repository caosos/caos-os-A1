/**
 * PRESENTATION SILENCE ENFORCEMENT
 * 
 * Backend MUST NOT emit presentation artifacts.
 * UI owns all visual formatting.
 * 
 * Contract: MEMORY/RECALL CHANGESET § 9 (Presentation Silence)
 * Contract: C-10.1-G PRESENTATION SILENCE CONTRACT (IMMEDIATE)
 */

/**
 * FORBIDDEN PATTERNS
 * 
 * Backend responses MUST NOT contain these patterns
 */
const FORBIDDEN_PATTERNS = [
    // Backend-generated timestamps
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    /\d{1,2}\/\d{1,2}\/\d{4}/,
    /\d{1,2}:\d{2} (AM|PM)/i,
    
    // Backend status markers
    /^WROTE$/m,
    /^SAVED$/m,
    /^COMMITTED$/m,
    
    // UI-style headers
    /^={3,}/m,
    /^-{3,}/m,
    /^\*{3,}/m,
    
    // Backend diagnostic leakage
    /\[DIAGNOSTIC\]/,
    /\[MODE=/,
    /\[TIER_\d+\]/,
    
    // Object dumps
    /\[object Object\]/
];

/**
 * Check if content contains forbidden presentation artifacts
 * 
 * @param {string} content - Response content to check
 * @returns {Object} { valid: boolean, violations: Array }
 */
export function checkPresentationSilence(content) {
    if (!content || typeof content !== 'string') {
        return { valid: true, violations: [] };
    }

    const violations = [];

    for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
            violations.push({
                pattern: pattern.source,
                match: content.match(pattern)?.[0]
            });
        }
    }

    if (violations.length > 0) {
        console.error('🚨 [PRESENTATION_SILENCE_VIOLATION]', {
            violations_count: violations.length,
            violations
        });
    }

    return {
        valid: violations.length === 0,
        violations
    };
}

/**
 * Strip forbidden patterns from content (failsafe)
 * 
 * This should NOT be needed if contracts are followed,
 * but provides safety net.
 */
export function stripPresentationArtifacts(content) {
    if (!content || typeof content !== 'string') {
        return content;
    }

    let cleaned = content;

    // Strip ISO timestamps (backend should use metadata)
    cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '');
    
    // Strip status markers
    cleaned = cleaned.replace(/^(WROTE|SAVED|COMMITTED)$/gm, '');
    
    // Strip diagnostic markers
    cleaned = cleaned.replace(/\[(DIAGNOSTIC|MODE=\w+|TIER_\d+)\]/g, '');
    
    // Strip UI-style dividers
    cleaned = cleaned.replace(/^={3,}$/gm, '');
    cleaned = cleaned.replace(/^-{3,}$/gm, '');
    
    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * Validate response before returning to UI
 * 
 * FAIL-LOUD: Throws if violations detected in strict mode
 */
export function validateResponseForUI(response, options = {}) {
    const { strict = false, strip_artifacts = false } = options;

    const check = checkPresentationSilence(response);

    if (!check.valid) {
        const violation_summary = check.violations
            .map(v => `Pattern: ${v.pattern}, Match: "${v.match}"`)
            .join('; ');

        if (strict) {
            throw new Error(
                `PRESENTATION_SILENCE_VIOLATED: ${violation_summary}`
            );
        }

        console.warn('⚠️ [PRESENTATION_ARTIFACTS_DETECTED]', {
            violations: check.violations
        });

        if (strip_artifacts) {
            return stripPresentationArtifacts(response);
        }
    }

    return response;
}

/**
 * Generate presentation silence violation receipt
 */
export function generateViolationReceipt(params) {
    const { request_id, violations, cleaned } = params;

    return {
        request_id,
        violation_type: 'PRESENTATION_SILENCE',
        violations_count: violations.length,
        violations,
        cleaned: !!cleaned,
        timestamp_utc: new Date().toISOString()
    };
}