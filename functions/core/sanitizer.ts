/**
 * CAOS PRESENTATION SANITIZER
 * 
 * Removes leaked scaffolding and mode tags from user-facing output.
 * MUST run last before returning to user.
 */

export function sanitizeUserFacingText(text) {
    if (!text || typeof text !== 'string') return text;

    // Strip [MODE=GEN] / [MODE=RETRIEVAL] lines
    text = text.replace(/^\s*\[MODE=.*?\]\s*\n?/gmi, "");

    // Strip scaffold headings if they leaked
    const bannedScaffold = [
        "OBSERVATIONAL LAYER",
        "INTERPRETIVE LAYER",
        "SYSTEMS FRAMING LAYER",
        "FORWARD VECTOR LAYER",
        "OBSERVATIONAL:",
        "INTERPRETIVE:",
        "SYSTEMS:",
        "FORWARD:"
    ];

    for (const banned of bannedScaffold) {
        const regex = new RegExp(`^\\s*${banned}\\s*:?\\s*\\n?`, "gmi");
        text = text.replace(regex, "");
    }

    // Strip multiple consecutive blank lines (cleanup artifact)
    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
}