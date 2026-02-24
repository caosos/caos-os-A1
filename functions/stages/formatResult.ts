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

    // ========== SESSION_METADATA_FORMATTER ==========
    if (formatter === 'SESSION_METADATA_FORMATTER' && toolResult?.type === 'SESSION_METADATA') {
        const { start_time, last_message_time, duration, message_count } = toolResult;
        
        // Format start time conversationally
        const startDate = new Date(start_time);
        const now = new Date();
        const isToday = startDate.toDateString() === now.toDateString();
        
        let timeDescription;
        if (isToday) {
            const hours = startDate.getHours();
            const minutes = startDate.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            const displayMinutes = minutes.toString().padStart(2, '0');
            timeDescription = `today at ${displayHours}:${displayMinutes} ${ampm}`;
        } else {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            if (startDate.toDateString() === yesterday.toDateString()) {
                const hours = startDate.getHours();
                const minutes = startDate.getMinutes();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                const displayMinutes = minutes.toString().padStart(2, '0');
                timeDescription = `yesterday at ${displayHours}:${displayMinutes} ${ampm}`;
            } else {
                timeDescription = `on ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
            }
        }
        
        // Format duration conversationally
        let durationText;
        if (duration.hours === 0 && duration.minutes === 0) {
            durationText = 'just started';
        } else if (duration.hours === 0) {
            durationText = `${duration.minutes} minute${duration.minutes !== 1 ? 's' : ''}`;
        } else if (duration.minutes === 0) {
            durationText = `${duration.hours} hour${duration.hours !== 1 ? 's' : ''}`;
        } else {
            durationText = `${duration.hours} hour${duration.hours !== 1 ? 's' : ''} and ${duration.minutes} minute${duration.minutes !== 1 ? 's' : ''}`;
        }
        
        const payload = `You started talking to me ${timeDescription}.\n\nWe've been active for ${durationText}${message_count > 0 ? `, with ${message_count} message${message_count !== 1 ? 's' : ''} exchanged` : ''}.`;
        
        return {
            mode: 'RETRIEVAL',
            payload,
            summary: `Session metadata retrieved`,
            metadata: {
                confidence: 'HIGH',
                start_time,
                duration_ms: duration.ms
            }
        };
    }

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