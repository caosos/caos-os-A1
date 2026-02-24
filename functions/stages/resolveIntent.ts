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

// INTENT GUARDRAILS: Strong patterns for GEN vs RETRIEVAL
const GEN_STRONG_PATTERNS = [
    /talk about/i,
    /where are we/i,
    /how are we doing/i,
    /how's it going/i,
    /reflect/i,
    /in the first person/i,
    /write (me )?a story/i,
    /tell me about (yourself|you|us)/i,
    /tell me what you know about me/i,
    /what do you know about me/i,
    /talk like/i,
    /sound like/i,
    /speak as/i
];

const RETRIEVAL_STRONG_PATTERNS = [
    /^list (my )?threads/i,
    /^show (my )?threads/i,
    /search threads/i,
    /find thread/i,
    /mentions of .* in threads/i,
    /list mentions of/i
];

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

    const msg = userMessage.trim();

    // STEP 0: Check strong GEN patterns first (highest priority)
    if (GEN_STRONG_PATTERNS.some(r => r.test(msg))) {
        return {
            intent: 'GENERIC_GEN',
            confidence: 1.0,
            reason: 'gen_strong_pattern',
            extractedTerms: [],
            multiQuery: false
        };
    }

    // STEP 0.5: Check strong RETRIEVAL patterns
    if (RETRIEVAL_STRONG_PATTERNS.some(r => r.test(msg))) {
        // Continue to extraction logic below
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

    // STEP 1.6: Detect SESSION_METADATA intent (highest priority - pre-search)
    const sessionMetadataPatterns = [
        /when did (we|I) start/i,
        /what time did (we|I) begin/i,
        /how long (have|did) (we|I) (been|talk|speak|chat)/i,
        /session start time/i,
        /conversation duration/i,
        /started (this )?session/i,
        /start of (this |our )?(conversation|session|chat)/i,
        /how long is (this |our )?(conversation|session)/i
    ];
    
    if (sessionMetadataPatterns.some(p => p.test(userMessage))) {
        return {
            intent: 'SESSION_METADATA',
            confidence: 1.0,
            reason: 'session_metadata_pattern_detected',
            extractedTerms: [],
            multiQuery: false
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

    // STEP 2B: Detect YOUTUBE/VIDEO intent (force tool execution)
    const youtubeKeywords = ['youtube', 'video', 'find video', 'show video', 'news today'];
    const hasYouTubeIntent = youtubeKeywords.some(kw => userMessage.toLowerCase().includes(kw));
    
    if (hasYouTubeIntent) {
        const terms = extractTopicsFromSearchQuery(userMessage);
        return {
            intent: 'YOUTUBE_SEARCH',
            confidence: 1.0,
            reason: 'youtube_keyword_detected',
            extractedTerms: terms,
            multiQuery: false,
            forceToolExecution: true
        };
    }

    // FIX 3: PRIORITY - Detect SEARCH/ANALYZE intent (NOT list intent)
    // These patterns mean "search through" or "analyze", not "list threads"
    const analyzeThreadsPatterns = [
        /look (through|in|at)\s+(my\s+)?(threads|conversations)/i,
        /search\s+(through\s+)?(my\s+)?(threads|conversations)/i,
        /find (in|from)\s+(my\s+)?(threads|conversations)/i,
        /learn (from|about)\s+(my\s+)?(threads|conversations)/i,
        /tell me (about|what).*\s+(threads|conversations)/i,
        /read (through|my)\s+(threads|conversations)/i,
        /go through (my\s+)?(threads|conversations)/i,
        /analyze (my\s+)?(threads|conversations)/i
    ];
    
    if (analyzeThreadsPatterns.some(pattern => pattern.test(userMessage))) {
        const terms = extractTopicsFromSearchQuery(userMessage);
        return {
            intent: 'SEARCH_THREADS',
            confidence: 0.95,
            reason: 'analyze_threads_pattern',
            extractedTerms: terms.length > 0 ? terms : ['*'],
            multiQuery: false,
            forceRetrievalMode: false, // Allow GEN to synthesize/analyze
            forceToolExecution: true
        };
    }
    
    // Standard search keywords (but not when it's about analyzing/looking through)
    const searchKeywords = ['search for', 'find thread', 'mention', 'mentions', 'list mentions', 'contain', 'contains', 'run that search', 'in any of'];
    const hasSearchIntent = searchKeywords.some(kw => userMessage.toLowerCase().includes(kw));

    if (hasSearchIntent) {
        const terms = extractTopicsFromSearchQuery(userMessage);
        return {
            intent: 'SEARCH_THREADS',
            confidence: 0.95,
            reason: 'search_keyword_detected',
            extractedTerms: terms,
            multiQuery: false,
            forceRetrievalMode: true
        };
    }

    // STEP 2D: Detect implicit list patterns (STRICT - must clearly want a list)
    const implicitListPatterns = [
        /^show (me )?(my )?threads$/i,
        /^what threads do i have$/i,
        /^where are my threads$/i,
        /^display (all )?(my )?threads$/i,
        /^(get|fetch) (all )?(my )?threads$/i,
        /^list (my )?threads$/i,
        /^threads$/i  // Just "threads" alone
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

    // PHASE ONE LOCK: Default to conversational generation
    // Only extract terms if explicit retrieval verb was already detected
    // This prevents retrieval bleed on narrative/reflective prompts
    
    return {
        intent: 'GENERIC_GEN',
        confidence: 0.85,
        reason: 'default_conversational_path',
        extractedTerms: [],
        multiQuery: false
    };
}