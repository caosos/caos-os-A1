/**
 * CAOS STAGE 2: ROUTE TOOL
 * 
 * Responsibility: Pure mapping from intent to route and formatter.
 * No database access. No branching logic outside intent mapping.
 * 
 * Input: IntentResult
 * Output: RouteResult with route name and formatter
 */

export function routeTool(intentResult) {
    const { intent, extractedTerms, multiQuery } = intentResult;

    console.log('🧭 [ROUTE_TOOL] Input intent:', intent);

    if (intent === 'SESSION_METADATA') {
        return {
            route: 'SESSION_METADATA_PIPELINE',
            requiresTool: true,
            formatter: 'SESSION_METADATA_FORMATTER',
            reason: 'session_metadata_request'
        };
    }

    if (intent === 'LIST_THREADS') {
        return {
            route: 'THREAD_LIST_PIPELINE',
            requiresTool: true,
            formatter: 'LIST_FORMATTER',
            reason: 'explicit_list_request'
        };
    }

    // FAIL LOUD: SEARCH_THREADS with no extracted terms
    if (intent === 'SEARCH_THREADS' && extractedTerms.length === 0) {
        console.error('🚨 [ROUTE_HARD_FAIL]: SEARCH_TERMS_MISSING');
        throw {
            mode: 'ERROR',
            code: 'SEARCH_TERMS_MISSING',
            message: "Search requires at least one target term. Example: 'list mentions of Brookdale'.",
            debug: {
                intent,
                normalizedInput: intentResult.userMessage || '',
                extractedTerms: [],
                requestId: intentResult.requestId || 'unknown'
            }
        };
    }

    if (intent === 'SEARCH_THREADS' && extractedTerms.length > 0) {
        // Determine if multi-search or single search
        const searchRoute = multiQuery ? 'THREAD_MULTI_SEARCH_PIPELINE' : 'THREAD_SEARCH_PIPELINE';
        
        return {
            route: searchRoute,
            requiresTool: true,
            formatter: 'SEARCH_REPORT_FORMATTER',
            reason: multiQuery ? 'multi_topic_search' : 'single_topic_search'
        };
    }

    // GENERIC_GEN route - only for non-search intents
    return {
        route: 'GENERATION_PIPELINE',
        requiresTool: false,
        formatter: 'GEN_FORMATTER',
        reason: 'generic_generation'
    };
}