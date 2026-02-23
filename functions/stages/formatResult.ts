/**
 * CAOS STAGE 4: FORMAT RESULT
 * 
 * Responsibility: Deterministic formatting with transparency envelope.
 * No database access. No modification of tool results.
 * Enforces anti-scope-drift and transparency rules.
 * 
 * Input: RouteResult, ToolResult
 * Output: FormattedResult with mode and payload
 */

export function formatResult(routeResult, toolResult) {
    const { route, formatter } = routeResult;

    console.log('📄 [FORMAT_RESULT] Formatter:', formatter);

    // ========== LIST_FORMATTER ==========
    if (formatter === 'LIST_FORMATTER' && toolResult?.type === 'LIST') {
        const threadTitles = toolResult.threads
            .map(t => t.title)
            .filter(Boolean);

        let payload;
        if (threadTitles.length === 0) {
            payload = "You don't have any saved threads yet.";
        } else if (threadTitles.length === 1) {
            payload = `You have 1 saved thread:\n\n- ${threadTitles[0]}`;
        } else {
            payload = `You have ${threadTitles.length} saved threads:\n\n${threadTitles.map(t => `- ${t}`).join('\n')}`;
        }

        return {
            mode: 'RETRIEVAL',
            payload,
            summary: `Retrieved ${threadTitles.length} threads`,
            metadata: {
                match_count: threadTitles.length,
                confidence: 'HIGH'
            }
        };
    }

    // ========== SEARCH_REPORT_FORMATTER ==========
    if (formatter === 'SEARCH_REPORT_FORMATTER' && toolResult?.type === 'SEARCH') {
        const { query_terms, matches, match_fields, match_type, count, search_scope } = toolResult;

        const confidence = count === 0 ? 'LOW' : count === 1 ? 'HIGH' : 'MEDIUM';
        const term = query_terms[0];

        let payload;
        if (count === 0) {
            payload = `I searched ${search_scope.total_indexed} threads for "${term}" but didn't find any matches.\n\nWant to try a different search term or see all your threads?`;
        } else {
            const matchWord = count === 1 ? 'thread mentions' : 'threads mention';
            const resultLines = matches.map(m => `- ${m.title}`).join('\n');
            payload = `Found ${count} ${matchWord} "${term}":\n\n${resultLines}`;
        }

        return {
            mode: 'RETRIEVAL',
            payload,
            summary: `Found ${count} matching thread${count !== 1 ? 's' : ''}`,
            metadata: {
                match_count: count,
                confidence
            }
        };
    }

    // ========== SEARCH_REPORT_FORMATTER (MULTI_SEARCH) ==========
    if (formatter === 'SEARCH_REPORT_FORMATTER' && toolResult?.type === 'MULTI_SEARCH') {
        const { query_terms, multiResults, match_fields, match_type, count, search_scope } = toolResult;

        const confidence = count === 0 ? 'LOW' : count === 1 ? 'HIGH' : 'MEDIUM';

        let payload;
        if (count === 0) {
            const terms = query_terms.join('", "');
            payload = `I searched for "${terms}" but didn't find any matching threads.\n\nWant to try different terms?`;
        } else {
            const resultSections = Object.entries(multiResults)
                .map(([topic, result]) => {
                    if (result.count === 0) {
                        return `**${topic}**: none found`;
                    }
                    const threadList = result.threads.map(t => `  - ${t}`).join('\n');
                    const threadWord = result.count === 1 ? 'thread' : 'threads';
                    return `**${topic}** (${result.count} ${threadWord}):\n${threadList}`;
                })
                .join('\n\n');

            const topicWord = query_terms.length === 1 ? 'topic' : 'topics';
            payload = `Found ${count} matches across ${query_terms.length} ${topicWord}:\n\n${resultSections}`;
        }

        return {
            mode: 'RETRIEVAL',
            payload,
            summary: `Found ${count} matching threads across ${query_terms.length} topics`,
            metadata: {
                match_count: count,
                confidence,
                topics: query_terms.length
            }
        };
    }

    // ========== GEN_FORMATTER ==========
    if (formatter === 'GEN_FORMATTER') {
        return {
            mode: 'GEN',
            payload: '(awaiting response)',
            summary: 'Generation mode',
            metadata: {
                confidence: 'PENDING'
            }
        };
    }

    // Validation failure: unknown formatter
    throw {
        error: 'FORMAT_VALIDATION_FAILURE',
        formatter,
        details: 'Unknown formatter or mismatched ToolResult type'
    };
}