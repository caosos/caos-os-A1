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

// Pattern detection for shallow acknowledgment (YouTube contract)
const SHALLOW_YOUTUBE_PATTERNS = [
    /here is a video/i,
    /this link should take you/i,
    /try opening/i,
    /make sure your browser/i,
    /check if the link works/i,
    /video might be/i
];

// Validate YouTube URL structure
function validateYouTubeURL(content) {
    const youtubeUrlPattern = /https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}/;
    return youtubeUrlPattern.test(content);
}

function containsThreadListPattern(payload) {
    if (!payload || typeof payload !== 'string') return false;
    return THREAD_LIST_PATTERNS.some(pattern => pattern.test(payload));
}

export function applyCognitiveLayer(formattedResult, userInput = null) {
    const { mode, payload, metadata } = formattedResult;

    console.log('🧠 [COGNITIVE_LAYER] Mode:', mode);

    // ========== ECHO SUPPRESSION GUARD ==========
    if (userInput && payload) {
        // Normalize both for comparison (remove whitespace, case)
        const normalizedInput = userInput.toLowerCase().replace(/\s+/g, ' ').trim();
        const normalizedPayload = payload.toLowerCase().replace(/\s+/g, ' ').trim();
        
        // Check if output is substantially identical to input
        const similarity = normalizedPayload.includes(normalizedInput.substring(0, 100)) || 
                          normalizedInput.includes(normalizedPayload.substring(0, 100));
        
        if (similarity && normalizedInput.length > 50) {
            console.error('🚨 [ECHO_DETECTED]: Output mirrors input');
            // INSTRUMENTATION: Mark echo violation for receipt
            throw {
                error: 'ECHO_SUPPRESSION_VIOLATION',
                mode,
                reason: 'Generated output is identical to user input',
                details: 'System must analyze or transform, not echo verbatim',
                state: 'ECHO_DETECTED',
                receipt_fallback: {
                    triggered: true,
                    fallback_type: 'ECHO_SUPPRESSION',
                    reason: 'Output identical to input'
                }
            };
        }
    }

    // RETRIEVAL mode: return as-is
    if (mode === 'RETRIEVAL') {
        return {
            mode: 'RETRIEVAL',
            content: payload
        };
    }

    // GEN mode: PHASE ONE - Output structured cognition, not prose
    if (mode === 'GEN') {
        // CRITICAL VALIDATION 1: GEN mode cannot fabricate thread lists
        if (containsThreadListPattern(payload)) {
            console.error('🚨 [PIPELINE_VIOLATION]: GEN_MODE_THREAD_LIST_FABRICATION');
            throw {
                error: 'PIPELINE_VIOLATION_GEN_LIST',
                mode: 'GEN',
                reason: 'GEN mode attempted to fabricate thread list',
                details: 'Thread lists must originate from executeTool only.',
                state: 'ARCHITECTURE_FREEZE_VIOLATION',
                receipt_fallback: {
                    triggered: true,
                    fallback_type: 'ARCHITECTURE_VIOLATION',
                    reason: 'GEN mode fabricated thread list'
                }
            };
        }

        // CRITICAL VALIDATION 2: GEN mode cannot simulate search operations
        if (SEARCH_SIMULATION_PATTERNS.some(pattern => pattern.test(payload))) {
            console.error('🚨 [ROUTE_VIOLATION]: GEN_MODE_SEARCH_SIMULATION');
            throw {
                error: 'ROUTE_VIOLATION_GEN_SEARCH',
                mode: 'GEN',
                reason: 'GEN mode attempted to simulate search operation',
                details: 'Search operations must route through RETRIEVAL pipeline.',
                state: 'SEARCH_ROUTE_VIOLATION',
                receipt_fallback: {
                    triggered: true,
                    fallback_type: 'ROUTE_VIOLATION',
                    reason: 'GEN simulated search operation'
                }
            };
        }

        // Extract memory context from enhanced input if present
        const memoryMatch = userInput?.match(/\[PERMANENT MEMORY ABOUT USER\]:(.*?)(?:\[RECENT CONVERSATION HISTORY\]:|$)/s);
        const historyMatch = userInput?.match(/\[RECENT CONVERSATION HISTORY\]:(.*?)$/s);

        const memoryContext = [
            memoryMatch ? memoryMatch[1].trim() : null,
            historyMatch ? historyMatch[1].trim() : null
        ].filter(Boolean).join('\n\n');

        // PHASE ONE: Return structured cognition (renderer will create prose)
        return {
            mode: 'GEN',
            structured: true,  // Flag for renderer
            response_points: [payload],  // Base response as starting point
            tone: 'conversational',
            memory_context: memoryContext || null
        };
    }

    // Unknown mode
    throw {
        error: 'COGNITIVE_LAYER_FAILURE',
        mode,
        details: 'Unknown response mode'
    };
}