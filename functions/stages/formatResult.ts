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

        const payload = `[MODE=RETRIEVAL]
Complete thread list (${threadTitles.length}):
${threadTitles.length === 0 ? '(no threads found)' : threadTitles.map(t => `- ${t}`).join('\n')}`;

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

        const transparencyBlock = `[MODE=RETRIEVAL]
SEARCH_SCOPE:
- Fields searched: ${match_fields.length > 0 ? match_fields.join(', ') : 'title, summary, keywords'}
- Total threads indexed: ${search_scope.total_indexed}

QUERY_TERMS: [${query_terms.map(t => `"${t}"`).join(', ')}]

MATCH_SUMMARY:
- Found: ${count} thread${count !== 1 ? 's' : ''}
- Match type: ${match_type}
- Confidence: ${confidence}
- Match fields: ${match_fields.length > 0 ? match_fields.join(', ') : 'none'}

RESULTS:`;

        const resultLines = matches.length === 0
            ? '(no matches)'
            : matches.map(m => `- ${m.title}`).join('\n');

        const nextStep = count > 0
            ? '\n\nNEXT_STEP: Reply with a thread title to open it.'
            : '\n\nNEXT_STEP: Try different terms or "list my threads" for complete list.';

        const payload = transparencyBlock + '\n' + resultLines + nextStep;

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

        const transparencyBlock = `[MODE=RETRIEVAL]
SEARCH_SCOPE:
- Fields searched: ${match_fields.length > 0 ? match_fields.join(', ') : 'title, summary, keywords'}
- Total threads indexed: ${search_scope.total_indexed}
- Search mode: MULTI_SEARCH

QUERY_TERMS: [${query_terms.map(t => `"${t}"`).join(', ')}]

MATCH_SUMMARY:
- Total found: ${count} thread${count !== 1 ? 's' : ''}
- Match type: ${match_type}
- Confidence: ${confidence}
- Match fields: ${match_fields.length > 0 ? match_fields.join(', ') : 'none'}

RESULTS:`;

        const resultSections = Object.entries(multiResults)
            .map(([topic, result]) => {
                const threadList = result.threads.length === 0
                    ? '  (no matches)'
                    : result.threads.map(t => `  - ${t}`).join('\n');
                return `\n${topic}: ${result.count} thread${result.count !== 1 ? 's' : ''}\n${threadList}`;
            })
            .join('\n');

        const nextStep = count > 0
            ? '\n\nNEXT_STEP: Reply with a thread title to open it.'
            : '\n\nNEXT_STEP: Try different terms or "list my threads" for complete list.';

        const payload = transparencyBlock + resultSections + nextStep;

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
            payload: '[MODE=GEN]\n(awaiting LLM response)',
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