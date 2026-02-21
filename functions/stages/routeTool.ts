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

    if (intent === 'LIST_THREADS') {
        return {
            route: 'THREAD_LIST_PIPELINE',
            requiresTool: true,
            formatter: 'LIST_FORMATTER',
            reason: 'explicit_list_request'
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

    // GENERIC_GEN route
    return {
        route: 'GENERATION_PIPELINE',
        requiresTool: false,
        formatter: 'GEN_FORMATTER',
        reason: 'generic_generation'
    };
}