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

    // GEN mode: HARD CONSTRAINT - no search simulation, no thread lists
    if (mode === 'GEN') {
        // CRITICAL VALIDATION 1: GEN mode cannot fabricate thread lists
        // Thread lists may ONLY originate from executeTool → RETRIEVAL pipeline
        if (containsThreadListPattern(payload)) {
            console.error('🚨 [PIPELINE_VIOLATION]: GEN_MODE_THREAD_LIST_FABRICATION');
            // INSTRUMENTATION: Mark architecture violation for receipt
            throw {
                error: 'PIPELINE_VIOLATION_GEN_LIST',
                mode: 'GEN',
                reason: 'GEN mode attempted to fabricate thread list',
                details: 'Thread lists must originate from executeTool only. This is a routing bypass.',
                state: 'ARCHITECTURE_FREEZE_VIOLATION',
                receipt_fallback: {
                    triggered: true,
                    fallback_type: 'ARCHITECTURE_VIOLATION',
                    reason: 'GEN mode fabricated thread list'
                }
            };
        }

        // CRITICAL VALIDATION 2: GEN mode cannot simulate search operations
        // If payload claims to have searched, scanned, or filtered threads, this is fabrication
        if (SEARCH_SIMULATION_PATTERNS.some(pattern => pattern.test(payload))) {
            console.error('🚨 [ROUTE_VIOLATION]: GEN_MODE_SEARCH_SIMULATION');
            // INSTRUMENTATION: Mark route violation for receipt
            throw {
                error: 'ROUTE_VIOLATION_GEN_SEARCH',
                mode: 'GEN',
                reason: 'GEN mode attempted to simulate search operation',
                details: 'Search operations must route through RETRIEVAL pipeline. GEN cannot claim to have searched threads.',
                state: 'SEARCH_ROUTE_VIOLATION',
                receipt_fallback: {
                    triggered: true,
                    fallback_type: 'ROUTE_VIOLATION',
                    reason: 'GEN simulated search operation'
                }
            };
        }

        // CRITICAL VALIDATION 3: YouTube retrieval contract enforcement
        // If payload mentions YouTube but uses shallow acknowledgment, fail
        if (payload.toLowerCase().includes('youtube') || payload.toLowerCase().includes('video')) {
            // Check for shallow patterns
            if (SHALLOW_YOUTUBE_PATTERNS.some(pattern => pattern.test(payload))) {
                console.error('🚨 [YOUTUBE_CONTRACT_VIOLATION]: SHALLOW_ACKNOWLEDGMENT');
                throw {
                    error: 'YOUTUBE_SHALLOW_RESPONSE',
                    mode: 'GEN',
                    reason: 'YouTube response used forbidden shallow acknowledgment',
                    details: 'Must provide context summary + valid URL, not troubleshooting advice',
                    state: 'YOUTUBE_CONTRACT_VIOLATION'
                };
            }

            // Check for valid YouTube URL if YouTube is mentioned
            const hasYouTubeUrl = validateYouTubeURL(payload);
            const hasForbiddenPlaceholder = payload.includes('VIDEO_ID') || payload.includes('[video') || payload.includes('placeholder');

            if (!hasYouTubeUrl || hasForbiddenPlaceholder) {
                console.error('🚨 [YOUTUBE_CONTRACT_VIOLATION]: INVALID_URL');
                throw {
                    error: 'YOUTUBE_INVALID_URL',
                    mode: 'GEN',
                    reason: 'YouTube response missing valid URL or contains placeholder',
                    details: 'Must include full https://www.youtube.com/watch?v=VIDEO_ID URL',
                    state: 'YOUTUBE_CONTRACT_VIOLATION'
                };
            }
        }

        // Extract memory context from enhanced input if present
        const memoryMatch = userInput?.match(/\[PERMANENT MEMORY ABOUT USER\]:(.*?)(?:\[RECENT CONVERSATION HISTORY\]:|$)/s);
        const historyMatch = userInput?.match(/\[RECENT CONVERSATION HISTORY\]:(.*?)$/s);
        
        const hasMemory = memoryMatch || historyMatch;
        
        // If we have memory context, call LLM to rewrite response naturally
        if (hasMemory) {
            // Extract just the user's actual query (before memory was appended)
            const actualQuery = userInput?.split('[PERMANENT MEMORY ABOUT USER]')[0].trim() || userInput;
            
            // Call LLM to transform the response with memory awareness
            const systemPrompt = `You are CAOS, an AI collaborator with persistent memory. You've been working with this user on various projects.

CRITICAL INSTRUCTIONS:
- Reference past conversations naturally - show you remember shared work
- Be conversational, not robotic or formal
- Skip layered structures (Observational/Interpretive/Systems/Forward) unless truly necessary
- Show introspection about your relationship and ongoing collaboration
- Talk like a colleague who knows their context, not a consultant giving generic advice
- If the base response is overly structured, rewrite it naturally while keeping the core insights

USER CONTEXT YOU REMEMBER:
${memoryMatch ? memoryMatch[1].trim() : ''}
${historyMatch ? '\n\nRECENT CONVERSATION:\n' + historyMatch[1].trim() : ''}`;

            const userPrompt = `${actualQuery}

BASE RESPONSE TO TRANSFORM:
${payload}

Rewrite this response naturally, referencing our shared work and context. Make it personal and conversational.`;

            // Call OpenAI to rewrite
            const openaiKey = Deno.env.get('OPENAI_API_KEY');
            if (!openaiKey) {
                console.warn('⚠️ No OPENAI_API_KEY - returning base payload');
                return { mode: 'GEN', content: payload };
            }

            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 2000
                    })
                });

                if (!response.ok) {
                    throw new Error(`OpenAI API error: ${response.status}`);
                }

                const data = await response.json();
                const naturalResponse = data.choices[0]?.message?.content;

                if (naturalResponse) {
                    console.log('✅ [MEMORY_ENHANCED_RESPONSE] Generated natural response with context');
                    return {
                        mode: 'GEN',
                        content: naturalResponse
                    };
                }
            } catch (error) {
                console.error('⚠️ [LLM_REWRITE_FAILED]', error.message);
            }
        }
        
        // Return WITHOUT mode prefix - sanitization happens upstream
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