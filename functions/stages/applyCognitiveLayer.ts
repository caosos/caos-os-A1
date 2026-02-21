/**
 * CAOS STAGE 5: APPLY COGNITIVE LAYER
 * 
 * Responsibility: Optional narrative expansion for GEN mode.
 * Must NOT modify RETRIEVAL results.
 * Must NOT access database.
 * Must NOT alter state.
 * CRITICAL: Enforce thread list containment - only executeTool may produce them.
 * 
 * Input: FormattedResult
 * Output: FinalResponse with content and mode
 */

// Pattern detection for thread list fabrication
const THREAD_LIST_PATTERNS = [
    /complete thread list/i,
    /saved threads:/i,
    /your threads:/i,
    /here are.*threads/i,
    /threads? found:/i,
    /\- [a-zA-Z0-9][^\n]{5,}$/m  // Markdown bullet with thread title shape
];

// Pattern detection for search simulation
const SEARCH_SIMULATION_PATTERNS = [
    /after an extensive search/i,
    /search through/i,
    /searched the content/i,
    /found in your threads/i,
    /based on my search/i,
    /scanning your threads/i,
    /looked through all/i,
    /searching through all/i,
    /searching for/i
];

function containsThreadListPattern(payload) {
    if (!payload || typeof payload !== 'string') return false;
    return THREAD_LIST_PATTERNS.some(pattern => pattern.test(payload));
}

export function applyCognitiveLayer(formattedResult) {
    const { mode, payload, metadata } = formattedResult;

    console.log('🧠 [COGNITIVE_LAYER] Mode:', mode);

    // RETRIEVAL mode: return as-is
    if (mode === 'RETRIEVAL') {
        return {
            mode: 'RETRIEVAL',
            content: payload
        };
    }

    // GEN mode: HARD CONSTRAINT - no thread lists
    if (mode === 'GEN') {
        // CRITICAL VALIDATION: GEN mode cannot fabricate thread lists
        // Thread lists may ONLY originate from executeTool → RETRIEVAL pipeline
        if (containsThreadListPattern(payload)) {
            console.error('🚨 [PIPELINE_VIOLATION]: GEN_MODE_THREAD_LIST_FABRICATION');
            throw {
                error: 'PIPELINE_VIOLATION_GEN_LIST',
                mode: 'GEN',
                reason: 'GEN mode attempted to fabricate thread list',
                details: 'Thread lists must originate from executeTool only. This is a routing bypass.',
                state: 'ARCHITECTURE_FREEZE_VIOLATION'
            };
        }

        // In actual implementation, call LLM here
        // For now, return placeholder
        return {
            mode: 'GEN',
            content: payload
        };
    }

    // Unknown mode
    throw {
        error: 'COGNITIVE_LAYER_FAILURE',
        mode,
        details: 'Unknown response mode'
    };
}