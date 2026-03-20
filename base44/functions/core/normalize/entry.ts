/**
 * CAOS PRE-INFERENCE NORMALIZATION LAYER
 * 
 * Execution Order: STT → Normalize → Context Assembly → hybridMessage → Model
 * 
 * Responsibilities:
 * - Apply lexical rules (chaos → CAOS)
 * - Clean STT artifacts
 * - Normalize before anchor creation
 * - Normalize before memory storage
 * - Normalize before hash computation
 */

import { createHash } from "node:crypto";

// ─────────────────────────────────────────────
// LEXICAL RULE APPLICATION ENGINE
// ─────────────────────────────────────────────

export async function applyLexicalRules(text, base44, userEmail = null) {
    if (!text || typeof text !== 'string') return text;

    // Fetch active lexical rules (sorted by priority)
    const rules = await base44.asServiceRole.entities.LexicalRule.filter(
        { enabled: true },
        'priority',
        100
    );

    let normalized = text;

    for (const rule of rules) {
        // Check scope
        if (rule.scope === 'user' && !userEmail) continue;
        if (rule.scope === 'user' && rule.user_email !== userEmail) continue;

        // Apply each alias → canonical replacement
        for (const alias of rule.aliases) {
            const pattern = buildReplacementPattern(alias, rule.replacement_type);
            normalized = normalized.replace(pattern, rule.canonical_term);
        }
    }

    return normalized;
}

// ─────────────────────────────────────────────
// PATTERN BUILDERS
// ─────────────────────────────────────────────

function buildReplacementPattern(alias, type) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    switch (type) {
        case 'exact':
            return new RegExp(escaped, 'g');
        case 'case_sensitive':
            return new RegExp(escaped, 'g');
        case 'word_boundary':
        default:
            return new RegExp(`\\b${escaped}\\b`, 'gi');
    }
}

// ─────────────────────────────────────────────
// STT ARTIFACT CLEANUP
// ─────────────────────────────────────────────

export function cleanSTTArtifacts(text) {
    if (!text || typeof text !== 'string') return text;

    let cleaned = text;

    // Remove common STT artifacts
    cleaned = cleaned.replace(/\[inaudible\]/gi, '');
    cleaned = cleaned.replace(/\[unclear\]/gi, '');
    cleaned = cleaned.replace(/um+\b/gi, '');
    cleaned = cleaned.replace(/uh+\b/gi, '');
    cleaned = cleaned.replace(/\blike\b(?=\s+\blike\b)/gi, ''); // Repeated "like like"
    
    // Collapse multiple spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    
    // Trim
    cleaned = cleaned.trim();

    return cleaned;
}

// ─────────────────────────────────────────────
// URL ECHO DETECTION
// ─────────────────────────────────────────────

function detectURLEcho(text) {
    if (!text || typeof text !== 'string') return null;
    
    // Detect pasted URLs (YouTube, articles, etc.)
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlPattern);
    
    if (matches && matches.length > 0) {
        // Check if the text is ONLY a URL (or URL with minimal context)
        const textWithoutUrls = text.replace(urlPattern, '').trim();
        const remainingWords = textWithoutUrls.split(/\s+/).filter(w => w.length > 0);
        
        // If fewer than 3 words remain, this is likely just a pasted link
        if (remainingWords.length < 3) {
            return {
                type: 'URL_ONLY',
                urls: matches,
                instruction: 'ANALYZE_DONT_ECHO'
            };
        }
    }
    
    return null;
}

// ─────────────────────────────────────────────
// FULL NORMALIZATION PIPELINE
// ─────────────────────────────────────────────

export async function normalizeInput(text, base44, userEmail = null) {
    if (!text || typeof text !== 'string') return text;

    // Stage 0: Detect URL echo attempts
    const urlEcho = detectURLEcho(text);
    if (urlEcho) {
        console.log('🚨 [URL_ECHO_DETECTED]', urlEcho);
        // Append analysis instruction to prevent echo
        return `${text}\n\n[SYSTEM: Analyze this content, do not repeat the URL verbatim. Provide context or findings.]`;
    }

    // Stage 1: Clean STT artifacts
    let normalized = cleanSTTArtifacts(text);

    // Stage 2: Apply lexical rules
    normalized = await applyLexicalRules(normalized, base44, userEmail);

    return normalized;
}

// ─────────────────────────────────────────────
// HASH UTILITIES (for integrity checks)
// ─────────────────────────────────────────────

export function computeHash(content) {
    return createHash('sha256').update(content).digest('hex');
}

export function computeChainHash(content, prevHash) {
    const combined = `${prevHash || ''}:${content}`;
    return computeHash(combined);
}