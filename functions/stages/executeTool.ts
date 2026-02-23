/**
 * CAOS STAGE 3: EXECUTE TOOL
 * 
 * Responsibility: Execute deterministic database queries.
 * ONLY stage allowed to access database.
 * Exactly one database scan per request. No fallbacks.
 * 
 * Input: RouteResult, IntentResult, base44 SDK
 * Output: ToolResult with matches and metadata
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export async function executeTool(routeResult, intentResult, base44) {
    const { route, requiresTool } = routeResult;
    const { extractedTerms, multiQuery, intent } = intentResult;

    console.log('🔧 [EXECUTE_TOOL] Route:', route);

    if (!requiresTool) {
        return null; // No tool execution for GEN pipeline
    }

    // HARD FAIL: SEARCH with zero terms
    if (route === 'THREAD_SEARCH_PIPELINE' && extractedTerms.length === 0) {
        console.error('🚨 [EXECUTION_HARD_FAIL]: EMPTY_FILTER_ON_SEARCH');
        throw {
            error: 'EXECUTION_VALIDATION_FAILURE',
            reason: 'EMPTY_FILTER_ON_SEARCH_ROUTE',
            details: 'SEARCH route with no extracted terms',
            user_visible: 'Execution failed: No search terms extracted from query'
        };
    }

    // HARD FAIL: YOUTUBE_SEARCH without executor
    if (intent === 'YOUTUBE_SEARCH') {
        console.error('🚨 [EXECUTION_HARD_FAIL]: YOUTUBE_EXECUTOR_UNAVAILABLE');
        throw {
            error: 'TOOL_UNAVAILABLE',
            reason: 'YOUTUBE_SEARCH_NOT_IMPLEMENTED',
            details: 'YouTube search intent detected but executor not wired',
            user_visible: 'Execution failed: YouTube search tool not available'
        };
    }

    // ========== LIST_THREADS PIPELINE ==========
    if (route === 'THREAD_LIST_PIPELINE') {
        try {
            const conversations = await base44.asServiceRole.entities.Conversation.filter(
                { created_by: intentResult.userEmail },
                '-last_message_time',
                100
            );

            return {
                type: 'LIST',
                threads: conversations,
                count: conversations.length,
                executionId: `exec_${Date.now()}`
            };
        } catch (error) {
            console.error('🚨 [EXECUTION_ERROR] LIST_THREADS:', error);
            throw {
                error: 'EXECUTION_DATABASE_FAILURE',
                details: error.message
            };
        }
    }

    // ========== THREAD_SEARCH_PIPELINE ==========
    if (route === 'THREAD_SEARCH_PIPELINE' && extractedTerms.length === 1) {
        try {
            const searchTerm = extractedTerms[0].toLowerCase();
            const conversations = await base44.asServiceRole.entities.Conversation.filter(
                { created_by: intentResult.userEmail },
                '-last_message_time',
                100
            );

            // Deterministic filtering
            const matches = conversations.filter(c => {
                const titleMatch = c.title?.toLowerCase().includes(searchTerm);
                const summaryMatch = c.summary?.toLowerCase().includes(searchTerm);
                const keywordMatch = c.keywords?.some(k => k.toLowerCase().includes(searchTerm));
                return titleMatch || summaryMatch || keywordMatch;
            });

            // Track which fields had matches
            const matchFields = new Set();
            matches.forEach(m => {
                if (m.title?.toLowerCase().includes(searchTerm)) matchFields.add('title');
                if (m.summary?.toLowerCase().includes(searchTerm)) matchFields.add('summary');
                if (m.keywords?.some(k => k.toLowerCase().includes(searchTerm))) matchFields.add('keywords');
            });

            return {
                type: 'SEARCH',
                query_terms: extractedTerms,
                matches,
                match_fields: [...matchFields],
                match_type: matches.length === 0 ? 'none' : matches.length === 1 ? 'exact' : 'partial',
                count: matches.length,
                search_scope: {
                    total_indexed: conversations.length,
                    content_indexed: true
                },
                executionId: `exec_${Date.now()}`
            };
        } catch (error) {
            console.error('🚨 [EXECUTION_ERROR] THREAD_SEARCH_PIPELINE:', error);
            throw {
                error: 'EXECUTION_DATABASE_FAILURE',
                details: error.message
            };
        }
    }

    // ========== THREAD_MULTI_SEARCH_PIPELINE ==========
    if (route === 'THREAD_MULTI_SEARCH_PIPELINE' && extractedTerms.length > 1) {
        try {
            const conversations = await base44.asServiceRole.entities.Conversation.filter(
                { created_by: intentResult.userEmail },
                '-last_message_time',
                200
            );

            // Search for each term separately
            const multiResults = {};
            const allMatchFields = new Set();

            for (const term of extractedTerms) {
                const termLower = term.toLowerCase();
                const matches = conversations.filter(c => {
                    const titleMatch = c.title?.toLowerCase().includes(termLower);
                    const summaryMatch = c.summary?.toLowerCase().includes(termLower);
                    const keywordMatch = c.keywords?.some(k => k.toLowerCase().includes(termLower));

                    if (titleMatch) allMatchFields.add('title');
                    if (summaryMatch) allMatchFields.add('summary');
                    if (keywordMatch) allMatchFields.add('keywords');

                    return titleMatch || summaryMatch || keywordMatch;
                });

                multiResults[term] = {
                    count: matches.length,
                    threads: matches.map(m => m.title).filter(Boolean)
                };
            }

            const totalMatches = Object.values(multiResults).reduce((sum, r) => sum + r.count, 0);

            return {
                type: 'MULTI_SEARCH',
                query_terms: extractedTerms,
                multiResults,
                match_fields: [...allMatchFields],
                match_type: totalMatches === 0 ? 'none' : 'partial',
                count: totalMatches,
                search_scope: {
                    total_indexed: conversations.length,
                    content_indexed: true,
                    topics: extractedTerms.length
                },
                executionId: `exec_${Date.now()}`
            };
        } catch (error) {
            console.error('🚨 [EXECUTION_ERROR] THREAD_MULTI_SEARCH_PIPELINE:', error);
            throw {
                error: 'EXECUTION_DATABASE_FAILURE',
                details: error.message
            };
        }
    }

    throw {
        error: 'EXECUTION_INVALID_ROUTE',
        route,
        details: 'Unknown route in executeTool'
    };
}