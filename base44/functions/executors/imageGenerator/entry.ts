/**
 * CAOS IMAGE TOOL EXECUTOR
 * 
 * Generates images using Core.GenerateImage integration.
 * MUST be authorized by Selector before execution.
 * 
 * Intent patterns that trigger IMAGE mode:
 * - "draw"
 * - "create an image"
 * - "generate an image"
 * - "illustrate"
 * - "render"
 * - "make a picture"
 */

export async function imageGeneratorExecutor(params, base44) {
    const { user_input, selector_decision } = params;

    console.log('🎨 [IMAGE_EXECUTOR_INVOKED]', { 
        tools_allowed: selector_decision?.tools_allowed 
    });

    // CRITICAL: Verify selector authorized IMAGE tool
    if (!selector_decision || !selector_decision.tools_allowed.includes('IMAGE')) {
        throw new Error('IMAGE_NOT_AUTHORIZED: Selector did not authorize image generation');
    }

    // Extract prompt from user input
    const prompt = extractImagePrompt(user_input);

    if (!prompt || prompt.length < 5) {
        throw new Error('IMAGE_PROMPT_TOO_SHORT: Cannot generate image from minimal input');
    }

    console.log('🎨 [IMAGE_GENERATION_START]', { prompt: prompt.substring(0, 100) });

    try {
        // Call Core.GenerateImage integration
        const result = await base44.integrations.Core.GenerateImage({
            prompt: prompt,
            existing_image_urls: null // Could support reference images later
        });

        if (!result || !result.url) {
            throw new Error('IMAGE_GENERATION_FAILED: No URL returned');
        }

        console.log('✅ [IMAGE_GENERATED]', { url: result.url });

        return {
            executor: 'imageGenerator',
            success: true,
            image_url: result.url,
            prompt_used: prompt,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('🚨 [IMAGE_GENERATION_ERROR]', error.message);
        throw new Error(`IMAGE_GENERATION_FAILED: ${error.message}`);
    }
}

/**
 * Extract clean prompt from user input
 * Removes trigger words and formats for image generation
 */
function extractImagePrompt(userInput) {
    // Remove common trigger words
    const triggerPatterns = [
        /^draw\s+/i,
        /^create\s+(an?\s+)?image\s+(of\s+)?/i,
        /^generate\s+(an?\s+)?image\s+(of\s+)?/i,
        /^illustrate\s+/i,
        /^render\s+/i,
        /^make\s+(a\s+)?picture\s+(of\s+)?/i
    ];

    let prompt = userInput.trim();

    for (const pattern of triggerPatterns) {
        prompt = prompt.replace(pattern, '');
    }

    return prompt.trim();
}

/**
 * Format image result for response
 */
export function formatImageResult(result) {
    return {
        mode: 'IMAGE',
        content: `![Generated Image](${result.image_url})

**Prompt:** ${result.prompt_used}

Generated at ${new Date(result.timestamp).toLocaleString()}`,
        image_url: result.image_url
    };
}