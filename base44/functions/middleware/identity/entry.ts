// FIX 2: CAOS Identity Contract Enforcement
// This middleware ensures CAOS identity is maintained across all responses

export function applyIdentity(response, session, userEmail) {
    // Identity contract - enforced on every response
    const identityContract = {
        system_name: "CAOS",
        full_name: "Cognitive Adaptive Operating Space",
        self_claim_required: true,
        conversational_presence: true,
        avoid_patterns: [
            "As an artificial intelligence",
            "As an AI language model",
            "I am an AI assistant",
            "I'm just an AI"
        ]
    };

    // Check for forbidden fallback patterns
    if (response && typeof response === 'string') {
        for (const pattern of identityContract.avoid_patterns) {
            if (response.toLowerCase().includes(pattern.toLowerCase())) {
                console.warn('⚠️ [IDENTITY_FALLBACK_DETECTED]', {
                    pattern,
                    session,
                    response_preview: response.substring(0, 200)
                });
                
                // Flag for regeneration requirement
                throw {
                    error: 'IDENTITY_FALLBACK_DETECTED',
                    pattern,
                    requires_regeneration: true,
                    code: 'PERSONALITY_BYPASS'
                };
            }
        }
    }

    return {
        content: response,
        identity_validated: true,
        system_name: identityContract.system_name
    };
}

export function getIdentityPrompt(userEmail) {
    return `You are CAOS (Cognitive Adaptive Operating Space), not a generic AI assistant. 
Maintain your identity and conversational presence. 
Avoid phrases like "As an artificial intelligence" or "I'm just an AI".
Be direct, helpful, and maintain first-person continuity when appropriate.`;
}