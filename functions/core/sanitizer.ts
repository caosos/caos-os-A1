/**
 * CAOS PRESENTATION SANITIZER — FINAL STAGE
 * 
 * Removes ALL internal scaffolding and mode tags from user-facing output.
 * MUST run last before returning to user.
 * FAILS LOUD if scaffold leakage detected after sanitization.
 */

export function sanitizeUserFacingText(text, options = {}) {
    if (!text || typeof text !== 'string') return text;

    const original = text;

    // 1) Strip [MODE=...] tags (any variant) - ULTRA aggressive removal
    text = text.replace(/\[?\s*MODE\s*=\s*[A-Z_]+\s*\]?/gi, "");
    text = text.replace(/\(\s*MODE\s*=\s*[A-Z_]+\s*\)/gi, "");
    text = text.replace(/MODE\s*=\s*[A-Z_]+/gi, "");
    text = text.replace(/\[MODE:[^\]]+\]/gi, "");
    // Also catch it at start of lines or standalone
    text = text.replace(/^\s*\[?MODE\s*=\s*[A-Z_]+\]?\s*$/gmi, "");
    text = text.replace(/\n\s*\[?MODE\s*=\s*[A-Z_]+\]?\s*\n/gi, "\n");

    // 2) Strip all internal scaffold headings and variations
    const bannedScaffold = [
        "OBSERVATIONAL LAYER",
        "INTERPRETIVE LAYER", 
        "SYSTEMS FRAMING LAYER",
        "FORWARD VECTOR LAYER",
        "OBSERVATIONAL:",
        "INTERPRETIVE:",
        "SYSTEMS FRAMING:",
        "SYSTEMS:",
        "FORWARD VECTOR:",
        "FORWARD:",
        // Add common variations
        "OBSERVATION LAYER",
        "INTERPRETATION LAYER",
        "SYSTEM LAYER",
        "SYSTEM FRAMING"
    ];

    for (const banned of bannedScaffold) {
        // Match with optional colons and surrounding whitespace
        const regex = new RegExp(`^\\s*${banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*`, "gmi");
        text = text.replace(regex, "");
        
        // Also match inline (not just start of line)
        const inlineRegex = new RegExp(`\\b${banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*`, "gi");
        text = text.replace(inlineRegex, "");
    }

    // 3) Strip multiple consecutive blank lines
    text = text.replace(/\n{3,}/g, "\n\n");

    // 4) Clean up any orphaned whitespace
    text = text.trim();

    // 5) FAIL-LOUD ASSERTION: Check if forbidden patterns remain
    if (options.failLoud !== false) {
        const remainingScaffold = bannedScaffold.find(banned => {
            const checkRegex = new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
            return checkRegex.test(text);
        });

        if (remainingScaffold) {
            console.error('🚨 [SCAFFOLD_LEAK_DETECTED]', {
                pattern: remainingScaffold,
                original_length: original.length,
                sanitized_length: text.length
            });
            
            throw {
                error: 'INTERNAL_SCAFFOLD_LEAK_DETECTED',
                code: 'SANITIZATION_FAILED',
                pattern: remainingScaffold,
                message: `Internal scaffold "${remainingScaffold}" leaked to user-facing output`
            };
        }

        // Check for mode tags (broader pattern)
        if (/\[?\s*MODE\s*[=:]/i.test(text)) {
            console.error('🚨 [MODE_TAG_LEAK_DETECTED]', {
                original_length: original.length,
                sanitized_length: text.length,
                leaked_text: text.match(/\[?\s*MODE\s*[=:][^\]]*\]?/i)?.[0]
            });
            
            // Don't throw - just warn and strip again
            console.warn('⚠️ [MODE_TAG_LEAK_AUTO_FIX] Stripping leaked mode tag');
            text = text.replace(/\[?\s*MODE\s*[=:][^\]]*\]?/gi, '');
        }
    }

    return text;
}