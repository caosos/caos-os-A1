/**
 * MODULE: core/environmentLoader
 * PURPOSE: Load cross-thread environmental awareness for Aria.
 * Gives Aria knowledge of ALL user threads — their titles, topics, summaries.
 * This is how Aria "sees" the full context of what the user has been working on.
 *
 * INPUT: { action: 'load', user_id: string }
 * OUTPUT: { active_thread_count, recent_threads, global_context, cross_thread_themes }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { action = 'load', user_id } = body;

        if (action !== 'load') {
            return Response.json({ error: 'Unknown action' }, { status: 400 });
        }

        const targetUser = user_id || user.email;

        // Load all conversations for this user
        const conversations = await base44.asServiceRole.entities.Conversation.filter(
            { created_by: targetUser },
            '-last_message_time',
            100
        );

        // Load thread memories (evolving summaries — if they exist)
        const threadMems = await base44.asServiceRole.entities.ThreadMemory.filter(
            { user_id: targetUser },
            '-last_updated_at',
            50
        ).catch(() => []);

        // Build a map of thread_id → memory
        const memMap = {};
        for (const tm of threadMems) {
            memMap[tm.thread_id] = tm;
        }

        // Build enriched thread list
        const enrichedThreads = conversations.map(c => {
            const mem = memMap[c.id];
            return {
                thread_id: c.id,
                title: c.title || 'Untitled',
                last_active: c.last_message_time,
                preview: c.last_message_preview || '',
                summary_short: mem?.summary_short || '',
                topic_tags: mem?.topic_tags || [],
                open_loops: mem?.open_loops || '',
                key_decisions: mem?.key_decisions || []
            };
        });

        // Extract all unique topic tags across threads
        const allTags = enrichedThreads.flatMap(t => t.topic_tags);
        const tagFrequency = {};
        allTags.forEach(tag => { tagFrequency[tag] = (tagFrequency[tag] || 0) + 1; });
        const topTags = Object.entries(tagFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag]) => tag);

        // Collect threads with open loops
        const threadsWithOpenLoops = enrichedThreads
            .filter(t => t.open_loops && t.open_loops.trim().length > 0)
            .slice(0, 5);

        const result = {
            active_thread_count: conversations.length,
            recent_threads: enrichedThreads.slice(0, 20),
            cross_thread_themes: topTags,
            threads_with_open_loops: threadsWithOpenLoops,
            global_context: topTags.length > 0
                ? `Active work themes: ${topTags.join(', ')}`
                : 'No cross-thread themes detected yet.'
        };

        console.log('✅ [ENV_LOADED]', {
            user: targetUser,
            thread_count: conversations.length,
            themes: topTags.slice(0, 5)
        });

        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

// Also export the helper functions for inline use by other modules
export async function loadEnvironmentState({ base44, userId }) {
    try {
        const conversations = await base44.asServiceRole.entities.Conversation.filter(
            { created_by: userId },
            '-last_message_time',
            100
        );
        const threadMems = await base44.asServiceRole.entities.ThreadMemory.filter(
            { user_id: userId },
            '-last_updated_at',
            50
        ).catch(() => []);

        const memMap = {};
        for (const tm of threadMems) { memMap[tm.thread_id] = tm; }

        const recentThreadsContext = conversations.slice(0, 10).map(c => {
            const mem = memMap[c.id];
            return {
                thread_id: c.id,
                title: c.title || 'Untitled',
                summary: mem?.summary_short || '',
                last_activity: c.last_message_time,
                topic_tags: mem?.topic_tags || []
            };
        });

        return {
            active_thread_count: conversations.length,
            recent_threads_context: recentThreadsContext,
            global_context: `User has ${conversations.length} threads.`
        };
    } catch (error) {
        console.error('⚠️ [ENV_LOAD_FAILED]', error.message);
        return { active_thread_count: 0, recent_threads_context: [], global_context: '' };
    }
}

export async function updateEnvironmentState({ base44, userId, threadId, threadMemory }) {
    // No-op: environment is now computed fresh on each load, no stale state entity needed
    console.log('✅ [ENV_UPDATE_NOOP]', { userId, threadId });
}

export function buildEnvironmentContextBlock(envState) {
    if (!envState || !envState.recent_threads_context) return '';

    const recentThreads = (envState.recent_threads_context || []).slice(0, 8);
    let block = `\n\nCROSS-THREAD AWARENESS (Aria knows these threads exist):\n`;
    block += `Total threads: ${envState.active_thread_count}\n`;

    if (recentThreads.length > 0) {
        block += `Recent threads:\n`;
        recentThreads.forEach(t => {
            const tags = t.topic_tags?.slice(0, 3).join(', ') || '';
            const summary = t.summary ? ` — ${t.summary.substring(0, 100)}` : '';
            block += `  • "${t.title}"${tags ? ` [${tags}]` : ''}${summary}\n`;
        });
    }

    if (envState.global_context) {
        block += `Cross-thread themes: ${envState.global_context}\n`;
    }

    block += `\nYou may reference past work naturally across threads when relevant. Do not list all threads unless asked.`;

    return block;
}