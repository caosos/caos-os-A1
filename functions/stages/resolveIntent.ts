/**
 * CAOS STAGE 1: RESOLVE INTENT
 * 
 * Responsibility: Deterministic classification and term extraction.
 * No database access. No fallback. No LLM.
 * 
 * Input: userMessage, sessionContext, timestamp
 * Output: IntentResult with extracted terms and confidence
 */

// Topic keyword dictionary
const TOPIC_KEYWORDS = [
    'christmas', 'birthday', 'brookdale', 'maintenance', 'thanksgiving',
    'anniversary', 'wedding', 'vacation', 'project', 'meeting', 'discussion'
];

// Retrieval trigger phrases
const RETRIEVAL_TRIGGERS = [
    'talk about', 'mentions', 'mention', 'contain', 'contains', 'containing',
    'related to', 'about', 'regarding', 'with', 'that talk about', 'that mention'
];

// Stop words for filtering
const STOP_WORDS = new Set([
    'threads', 'thread', 'show', 'me', 'the', 'names', 'of', 'that',
    'which', 'are', 'do', 'you', 'have', 'for', 'in', 'is', 'a', 'an'
]);

// Explicit list patterns
const EXPLICIT_LIST_PATTERN = /^list (my )?threads$/i;
const SHOW_ALL_PATTERN = /^show (my )?threads$/i;

export function resolveIntent(input) {
    const { userMessage, timestamp } = input;
    
    if (!userMessage || typeof userMessage !== 'string') {
        return {
            intent: 'GENERIC_GEN',
            confidence: 0.0,
            reason: 'invalid_input',
            extractedTerms: [],
            multiQuery: false
        };
    }

    // STEP 1: Normalize input
    const normalized = userMessage.toLowerCase()
        .replace(/[^a-z0-9,\s]/g, '')
        .trim();

    // STEP 2: Check explicit list patterns
    if (EXPLICIT_LIST_PATTERN.test(userMessage) || SHOW_ALL_PATTERN.test(userMessage)) {
        return {
            intent: 'LIST_THREADS',
            confidence: 1.0,
            reason: 'explicit_list_pattern',
            extractedTerms: [],
            multiQuery: false
        };
    }

    // STEP 3: Extract topic segment using triggers
    let topicSegment = '';
    let extractionReason = 'none';

    // Try comma-separated first
    if (normalized.includes(',')) {
        const commaPart = normalized.split('show me the thread')[1] || normalized;
        topicSegment = commaPart;
        extractionReason = 'comma_split';
    } else if (normalized.includes(' and ')) {
        // Try " and " split
        const triggerMatch = RETRIEVAL_TRIGGERS.find(t => normalized.includes(t));
        if (triggerMatch) {
            const idx = normalized.indexOf(triggerMatch);
            topicSegment = normalized.substring(idx + triggerMatch.length);
            extractionReason = 'and_split';
        }
    } else {
        // Try single trigger phrase extraction
        const triggerMatch = RETRIEVAL_TRIGGERS.find(t => normalized.includes(t));
        if (triggerMatch) {
            const idx = normalized.indexOf(triggerMatch);
            topicSegment = normalized.substring(idx + triggerMatch.length);
            extractionReason = 'trigger_phrase';
        }
    }

    // STEP 4: Clean segments
    let extractedTerms = topicSegment
        .split(/,|and/)
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .filter(t => !STOP_WORDS.has(t))
        .filter((t, idx, arr) => arr.indexOf(t) === idx); // Remove duplicates

    // STEP 5: Final validation
    if (extractedTerms.length === 0) {
        // No terms extracted - generic generation
        return {
            intent: 'GENERIC_GEN',
            confidence: 0.65,
            reason: 'no_terms_extracted',
            extractedTerms: [],
            multiQuery: false
        };
    }

    // Determine if multi-query
    const multiQuery = extractedTerms.length > 1;
    const intent = multiQuery ? 'SEARCH_THREADS' : 'SEARCH_THREADS';

    return {
        intent,
        confidence: 0.95,
        reason: extractionReason,
        extractedTerms,
        multiQuery,
        extractorDebug: {
            normalized_query: normalized,
            extraction_reason: extractionReason,
            topic_segment: topicSegment
        }
    };
}