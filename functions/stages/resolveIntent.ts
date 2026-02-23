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

// Helper: Extract topics from search query
function extractTopicsFromSearchQuery(query) {
    const stopWords = new Set([
        'search', 'find', 'run', 'that', 'in', 'any', 'of', 'the', 'threads', 'thread',
        'mention', 'mentions', 'containing', 'about', 'related'
    ]);

    const tokens = query.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2 && !stopWords.has(t));

    return [...new Set(tokens)];
}

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

    // STEP 1.5: Detect "list [search-verb] of X" as SEARCH (pre-LIST)
    const listSearchPattern = /^list\s+(mention|mentions|containing|contains|about|regarding|with|that\s+mention|that\s+contain)(\s+of)?\s+/i;
    if (listSearchPattern.test(userMessage)) {
        const terms = extractTopicsFromSearchQuery(userMessage);
        
        // FAIL LOUDLY: SEARCH intent cannot have empty terms
        if (terms.length === 0) {
            return {
                intent: 'SEARCH_THREADS',
                confidence: 0.0,
                reason: 'SEARCH_TERM_MISSING',
                error_code: 'EXTRACTION_EMPTY_ON_SEARCH_INTENT',
                extractedTerms: [],
                multiQuery: false,
                extraction_trace: {
                    normalized_input: normalized,
                    pattern_matched: 'list_search_phrase',
                    extraction_result: 'EMPTY'
                }
            };
        }
        
        return {
            intent: 'SEARCH_THREADS',
            confidence: 1.0,
            reason: 'list_search_phrase_detected',
            extractedTerms: terms,
            multiQuery: false,
            forceRetrievalMode: true
        };
    }

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

    // STEP 2B: Detect SEARCH intent first (highest priority)
    const searchKeywords = ['search', 'find', 'mention', 'mentions', 'contain', 'contains', 'about', 'run that search', 'in any of'];
    const hasSearchIntent = searchKeywords.some(kw => userMessage.toLowerCase().includes(kw));

    if (hasSearchIntent) {
        // FORCE SEARCH_THREADS for any search-related query
        // This prevents GEN mode from simulating search
        const terms = extractTopicsFromSearchQuery(userMessage);
        return {
            intent: 'SEARCH_THREADS',
            confidence: 1.0,
            reason: 'search_keyword_detected',
            extractedTerms: terms,
            multiQuery: false,
            forceRetrievalMode: true
        };
    }

    // STEP 2C: Detect implicit list patterns (high confidence)
    const implicitListPatterns = [
        /^show (my )?threads/i,
        /^what threads do i have/i,
        /^where are my threads/i,
        /^display (all )?threads/i,
        /^(get|fetch) (all )?threads/i,
        /^threads/i  // Just "threads" alone
    ];

    if (implicitListPatterns.some(p => p.test(userMessage))) {
        return {
            intent: 'LIST_THREADS',
            confidence: 0.95,
            reason: 'implicit_list_pattern',
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

    // FAIL LOUDLY: If we reached here via search intent path with empty terms
    // (Should not happen due to earlier guards, but defensive)
    if (intent === 'SEARCH_THREADS' && extractedTerms.length === 0) {
        return {
            intent: 'SEARCH_THREADS',
            confidence: 0.0,
            reason: 'SEARCH_TERM_MISSING',
            error_code: 'EXTRACTION_EMPTY_FALLTHROUGH',
            extractedTerms: [],
            multiQuery: false,
            extraction_trace: {
                normalized_input: normalized,
                extraction_reason: extractionReason,
                topic_segment: topicSegment
            }
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