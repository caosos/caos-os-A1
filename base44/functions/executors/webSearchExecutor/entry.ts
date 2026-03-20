/**
 * CAOS WEB SEARCH EXECUTOR
 * 
 * Performs web searches with Global Bin governance.
 * MUST be authorized by Selector before execution.
 */

import { governedLookup, generateWebSearchKey } from '../core/globalBinGovernance.js';

export async function webSearchExecutor(params, base44) {
    const { user_input, selector_decision } = params;

    console.log('🔍 [WEB_SEARCH_EXECUTOR_INVOKED]');

    // CRITICAL: Verify selector authorized WEB_SEARCH tool
    if (!selector_decision || !selector_decision.tools_allowed.includes('WEB_SEARCH')) {
        throw new Error('WEB_SEARCH_NOT_AUTHORIZED: Selector did not authorize web search');
    }

    // Extract search query
    const query = extractSearchQuery(user_input);

    if (!query || query.length < 3) {
        throw new Error('SEARCH_QUERY_TOO_SHORT: Cannot search with minimal input');
    }

    console.log('🔍 [WEB_SEARCH_START]', { query: query.substring(0, 100) });

    try {
        // Use governed lookup (checks Global Bin first)
        const lookupKey = generateWebSearchKey(query);
        
        const result = await governedLookup({
            lookup_key: lookupKey,
            lookup_type: 'web_search',
            lookup_function: async () => {
                // Call InvokeLLM with web context
                return await base44.integrations.Core.InvokeLLM({
                    prompt: query,
                    add_context_from_internet: true
                });
            },
            freshness_duration_hours: 1 // Web content changes quickly
        }, base44);

        console.log('✅ [WEB_SEARCH_COMPLETE]', { 
            cached: result.cached,
            source: result.source
        });

        return {
            executor: 'webSearch',
            success: true,
            query: query,
            result: result.result,
            cached: result.cached,
            source: result.source,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('🚨 [WEB_SEARCH_ERROR]', error.message);
        throw new Error(`WEB_SEARCH_FAILED: ${error.message}`);
    }
}

/**
 * Extract search query from user input
 */
function extractSearchQuery(userInput) {
    // Remove common search trigger words
    const searchPatterns = [
        /^search\s+(for\s+)?/i,
        /^look\s+up\s+/i,
        /^find\s+(out\s+)?(about\s+)?/i,
        /^what('s|\s+is)\s+/i,
        /^tell\s+me\s+about\s+/i
    ];

    let query = userInput.trim();

    for (const pattern of searchPatterns) {
        query = query.replace(pattern, '');
    }

    return query.trim();
}

/**
 * Format web search result for response
 */
export function formatWebSearchResult(result) {
    const cacheIndicator = result.cached ? ' (cached)' : ' (fresh)';
    
    return {
        mode: 'WEB_SEARCH',
        content: `${result.result}${cacheIndicator}`,
        query: result.query,
        cached: result.cached
    };
}