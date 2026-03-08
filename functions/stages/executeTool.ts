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

export async function executeTool(routeResult, intentResult, base44, user, request_id) {
    const { route, requiresTool } = routeResult;
    const { extractedTerms, multiQuery, intent, forceToolExecution, userMessage } = intentResult;

    console.log('🔧 [EXECUTE_TOOL] Route:', route, 'forceToolExecution:', forceToolExecution);

    // ========== REPO_READ PIPELINE (ADMIN-ONLY) ==========
    if (route === 'REPO_READ_PIPELINE') {
        if (user?.role !== 'admin') {
            console.log('🚫 [REPO_READ_DENIED] Non-admin user attempted access');
            throw {
                error: 'NO_TOOLS_AUTHORIZED',
                reason: 'ADMIN_ONLY_TOOL',
                details: 'REPO_READ requires admin role'
            };
        }

        try {
            const path = intentResult.userMessage?.match(/(?:read|get|show|cat)\s+([^\s]+)/i)?.[1] || extractedTerms?.[0];
            if (!path) {
                throw {
                    error: 'REPO_READ_INVALID_PATH',
                    details: 'No path specified for REPO_READ'
                };
            }

            const repoResult = await base44.functions.invoke('core/repoRead', { 
                path: path,
                max_bytes: 200000,
                ref: 'main'
            });
            
            console.log('✅ [REPO_READ_SUCCESS]', { path, user: user.email });
            
            return {
                type: 'REPO_READ',
                executor: 'core/repoRead',
                path: path,
                status: 'success',
                content_length: repoResult.data && repoResult.data.content ? repoResult.data.content.length : 0,
                hash: repoResult.data && repoResult.data.hash ? repoResult.data.hash : null,
                executionId: 'exec_' + Date.now()
            };
        } catch (error) {
            console.error('🚨 [REPO_READ_ERROR]:', error);
            throw {
                error: 'REPO_READ_EXECUTION_FAILED',
                details: error.message || 'Unknown error'
            };
        }
    }

    if (forceToolExecution && (extractedTerms?.includes('*') || extractedTerms?.length === 0)) {
        console.log('🔍 [ANALYZE_THREADS_TRIGGERED]', { request_id });
        throw {
            error: 'TOOL_UNAVAILABLE',
            reason: 'ANALYZE_THREADS_EXECUTOR_NOT_WIRED',
            details: 'analyzeThreads executor is not available in this deployment',
            user_visible: 'Analyze threads tool is not available yet'
        };
    }

    if (!requiresTool && !forceToolExecution) {
        return null; // No tool execution for GEN pipeline
    }

    // FIX 2: Validate extractedTerms exists and has content
    if (!extractedTerms || !Array.isArray(extractedTerms)) {
        console.error('🚨 [EXECUTION_VALIDATION]: extractedTerms missing or invalid');
        throw {
            error: 'EXECUTION_VALIDATION_FAILURE',
            reason: 'EXTRACTED_TERMS_INVALID',
            details: 'extractedTerms must be an array',
            user_visible: 'Execution failed: Invalid search parameters'
        };
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

    // ========== SESSION_METADATA PIPELINE ==========
    if (route === 'SESSION_METADATA_PIPELINE') {
        try {
            // Get current session/conversation
            const sessionId = intentResult.sessionId;
            if (!sessionId) {
                throw {
                    error: 'SESSION_METADATA_UNAVAILABLE',
                    reason: 'NO_SESSION_ID',
                    details: 'Cannot retrieve metadata without active session'
                };
            }

            // Fetch conversation record
            const conversation = await base44.asServiceRole.entities.Conversation.get(sessionId);
            
            if (!conversation) {
                throw {
                    error: 'SESSION_METADATA_UNAVAILABLE',
                    reason: 'SESSION_NOT_FOUND',
                    details: 'Session record not found in database'
                };
            }

            // Fetch messages for this session to calculate accurate metadata
            const messages = await base44.asServiceRole.entities.Message.filter(
                { conversation_id: sessionId },
                'timestamp',
                1000
            );

            const startTime = conversation.created_date;
            const lastMessageTime = conversation.last_message_time || startTime;
            const messageCount = messages.length;
            
            // Calculate duration
            const startMs = new Date(startTime).getTime();
            const lastMs = new Date(lastMessageTime).getTime();
            const durationMs = lastMs - startMs;
            
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

            // Check if user wants first message
            let firstMessage = null;
            const userMessage = intentResult.userMessage || '';
            if (/first (?:thing|message)/i.test(userMessage)) {
                const userMessages = messages.filter(m => m.role === 'user');
                if (userMessages.length > 0) {
                    firstMessage = userMessages[0].content;
                }
            }

            return {
                type: 'SESSION_METADATA',
                executor: 'get_session_metadata',
                start_time: startTime,
                last_message_time: lastMessageTime,
                duration: { hours, minutes, ms: durationMs },
                message_count: messageCount,
                first_message: firstMessage,
                executionId: 'exec_' + Date.now()
            };
        } catch (error) {
            // Fail loud - never downgrade to thread list or GEN
            console.error('🚨 [SESSION_METADATA_ERROR]:', error);
            throw {
                error: error.error || 'SESSION_METADATA_UNAVAILABLE',
                reason: error.reason || 'EXECUTION_FAILED',
                details: error.details || error.message,
                user_visible: 'Cannot retrieve session metadata at this time'
            };
        }
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
                executionId: 'exec_' + Date.now()
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

            // First pass: Filter by metadata (title, summary, keywords)
            const metadataMatches = conversations.filter(c => {
                const titleMatch = c.title && c.title.toLowerCase().includes(searchTerm);
                const summaryMatch = c.summary && c.summary.toLowerCase().includes(searchTerm);
                const keywordMatch = c.keywords && c.keywords.some(k => k.toLowerCase().includes(searchTerm));
                return titleMatch || summaryMatch || keywordMatch;
            });

            // Second pass: Search through actual message content for all conversations
            const contentMatches = [];
            
            for (const conv of conversations) {
                const messages = await base44.asServiceRole.entities.Message.filter(
                    { conversation_id: conv.id },
                    'timestamp',
                    1000
                );
                
                const matchingMessages = messages.filter(msg => 
                    msg.content && msg.content.toLowerCase().includes(searchTerm)
                );
                
                if (matchingMessages.length > 0) {
                    contentMatches.push({
                        conversation: conv,
                        matchingMessages: matchingMessages.map(msg => ({
                            role: msg.role,
                            content: msg.content,
                            timestamp: msg.timestamp
                        }))
                    });
                }
            }

            // Combine metadata and content matches (deduplicate)
            const allMatchedConvIds = new Set([
                ...metadataMatches.map(m => m.id),
                ...contentMatches.map(m => m.conversation.id)
            ]);

            // Build comprehensive match results
            const matches = Array.from(allMatchedConvIds).map(convId => {
                const metadataMatch = metadataMatches.find(m => m.id === convId);
                const contentMatch = contentMatches.find(m => m.conversation.id === convId);
                
                return {
                    conversation: metadataMatch || contentMatch.conversation,
                    matchedInMetadata: !!metadataMatch,
                    matchedInContent: !!contentMatch,
                    messageExcerpts: contentMatch && contentMatch.matchingMessages ? contentMatch.matchingMessages : []
                };
            });

            // Track which fields had matches
            const matchFields = new Set();
            if (metadataMatches.length > 0) {
                metadataMatches.forEach(m => {
                    if (m.title && m.title.toLowerCase().includes(searchTerm)) matchFields.add('title');
                    if (m.summary && m.summary.toLowerCase().includes(searchTerm)) matchFields.add('summary');
                    if (m.keywords && m.keywords.some(k => k.toLowerCase().includes(searchTerm))) matchFields.add('keywords');
                });
            }
            if (contentMatches.length > 0) {
                matchFields.add('message_content');
            }

            return {
                type: 'SEARCH',
                query_terms: extractedTerms,
                matches: matches,
                match_fields: Array.from(matchFields),
                match_type: matches.length === 0 ? 'none' : matches.length === 1 ? 'exact' : 'partial',
                count: matches.length,
                search_scope: {
                    total_indexed: conversations.length,
                    content_indexed: true,
                    messages_searched: true
                },
                executionId: 'exec_' + Date.now()
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
                    const titleMatch = c.title && c.title.toLowerCase().includes(termLower);
                    const summaryMatch = c.summary && c.summary.toLowerCase().includes(termLower);
                    const keywordMatch = c.keywords && c.keywords.some(k => k.toLowerCase().includes(termLower));

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
                multiResults: multiResults,
                match_fields: Array.from(allMatchFields),
                match_type: totalMatches === 0 ? 'none' : 'partial',
                count: totalMatches,
                search_scope: {
                    total_indexed: conversations.length,
                    content_indexed: true,
                    topics: extractedTerms.length
                },
                executionId: 'exec_' + Date.now()
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
        route: route,
        details: 'Unknown route in executeTool'
    };
}