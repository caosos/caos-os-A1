/**
 * CAOS FINAL RENDERER — PROSE GENERATION LAYER
 * 
 * Responsibility: Convert structured cognition into natural conversational prose.
 * This is the ONLY layer that writes user-facing English.
 * 
 * Input: Structured cognition object + memory context
 * Output: Natural conversational response (string)
 */

export async function renderFinalResponse(structuredCognition, context) {
    const { mode, response_points, tone, memory_context, alias_changed } = structuredCognition;
    let { userInput, openaiKey, identitySystemPrompt, identityBlock, threadBlock, userBlock, environmentBlock, base44, userEmail } = context;

    // RETRIEVAL mode: pass through formatted content as-is
    if (mode === 'RETRIEVAL') {
        return structuredCognition.content;
    }
    
    // CRITICAL: If alias changed, reload identity immediately
    let updatedResponsePoints = response_points;
    if (alias_changed && base44 && userEmail) {
        console.log('🔄 [RELOAD_IDENTITY_AFTER_ALIAS]', { newName: alias_changed });
        const { loadUserProfile, buildIdentitySystemPrompt } = await import('../middleware/identityContract.js');
        const updatedProfile = await loadUserProfile(base44, userEmail);
        identitySystemPrompt = buildIdentitySystemPrompt(updatedProfile);
        
        // Acknowledge the alias change in response
        updatedResponsePoints = [
            `Got it—I'm ${alias_changed} now. I'll remember that.`,
            ...(response_points || [])
        ];
    }

    // GEN mode: Transform structured points into natural prose
    if (!openaiKey) {
        console.warn('⚠️ No OPENAI_API_KEY - returning structured points as-is');
        return updatedResponsePoints ? updatedResponsePoints.join('\n\n') : structuredCognition.content;
    }

    const systemPrompt = `${identitySystemPrompt || identityBlock || 'You are Aria, an AI assistant within the CAOS platform.'}

${threadBlock || ''}

${userBlock || ''}

${environmentBlock || ''}

${memory_context ? `ADDITIONAL CONTEXT:\n${memory_context}\n` : ''}

Your task: Transform the structured response points below into natural, conversational prose that feels like a continuation of our ongoing collaboration. Never expose internal structure or scaffold labels.`;

    const userPrompt = `User said: "${userInput}"

RESPONSE STRUCTURE:
${JSON.stringify({ ...structuredCognition, response_points: updatedResponsePoints }, null, 2)}

Transform this into natural conversational prose. No headings, no structure labels, just fluid dialogue.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            throw new Error(`Renderer API error: ${response.status}`);
        }

        const data = await response.json();
        const rendered = data.choices[0]?.message?.content;

        if (!rendered) {
            throw new Error('Renderer returned empty response');
        }

        console.log('✅ [RENDERER] Natural prose generated');
        return rendered;

    } catch (error) {
        console.error('⚠️ [RENDERER_FAILED]', error.message);
        // Fallback: return structured points as prose
        return updatedResponsePoints 
            ? updatedResponsePoints.join('\n\n') 
            : structuredCognition.content || 'Unable to generate response';
    }
}