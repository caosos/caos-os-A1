// getThreadSnippets — Same-thread retrieval for Thread Recovery (MBCR v1)
// LOCK_SIGNATURE: CAOS_MBCR_GET_THREAD_SNIPPETS_v1_2026-03-08
// PURPOSE: Given a thread_id, return matching messages by tag and/or text query.
//          Used by hybridMessage.js to inject a Thread Recovery block for same-thread recall.
// SCOPE: Same-thread ONLY (v1). No cross-thread search.
// FORBIDDEN: No LLM calls, no summarization, no writes.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { thread_id, tags = [], text_query = '', limit = 20, around = 2 } = await req.json();

        if (!thread_id) return Response.json({ error: 'thread_id required' }, { status: 400 });

        const DEV = (req.headers.get('x-caos-debug') === 'true') || (Deno.env.get('CAOS_DEBUG_MODE') === 'true');

        // ── Fetch all messages for this thread (sorted ascending for narrative order) ──
        // Fetch more than limit to allow for filtering + expansion
        const allMessages = await base44.asServiceRole.entities.Message.filter(
            { conversation_id: thread_id },
            'timestamp',
            500
        );

        if (!allMessages || allMessages.length === 0) {
            if (DEV) console.log('[MBCR_SNIPPETS] No messages found', { thread_id });
            return Response.json({ snippets: [], count: 0 });
        }

        // ── Sort ascending by created_date for deterministic narrative ordering ──
        allMessages.sort((a, b) => new Date(a.created_date || a.timestamp) - new Date(b.created_date || b.timestamp));

        const hasTags = Array.isArray(tags) && tags.length > 0;
        const hasQuery = typeof text_query === 'string' && text_query.trim().length > 0;

        // ── Find matching message indices (OR: tag match OR text match) ──
        const matchedIndices = new Set();

        for (let i = 0; i < allMessages.length; i++) {
            const msg = allMessages[i];
            let matched = false;

            if (hasTags && Array.isArray(msg.metadata_tags)) {
                const normalizedMsgTags = msg.metadata_tags.map(t => t.toUpperCase());
                const normalizedQueryTags = tags.map(t => t.toUpperCase());
                if (normalizedQueryTags.some(t => normalizedMsgTags.includes(t))) {
                    matched = true;
                }
            }

            if (!matched && hasQuery) {
                const queryLower = text_query.toLowerCase();
                if ((msg.content || '').toLowerCase().includes(queryLower)) {
                    matched = true;
                }
            }

            if (matched) matchedIndices.add(i);
        }

        // ── Expand ±around neighbors for each match ──
        const expandedIndices = new Set();
        for (const idx of matchedIndices) {
            for (let offset = -around; offset <= around; offset++) {
                const neighbor = idx + offset;
                if (neighbor >= 0 && neighbor < allMessages.length) {
                    expandedIndices.add(neighbor);
                }
            }
        }

        // ── Collect, dedupe (by id), sort ascending, apply limit ──
        const seen = new Set();
        const collected = [];
        const sortedIndices = Array.from(expandedIndices).sort((a, b) => a - b);

        for (const idx of sortedIndices) {
            const msg = allMessages[idx];
            if (seen.has(msg.id)) continue;
            seen.add(msg.id);
            collected.push(msg);
            if (collected.length >= limit) break;
        }

        // ── Shape the return payload (no full content in logs) ──
        const snippets = collected.map(m => ({
            id: m.id,
            role: m.role,
            created_date: m.created_date || m.timestamp,
            content: m.content || '',
            ...(m.metadata_tags ? { metadata_tags: m.metadata_tags } : {})
        }));

        if (DEV) {
            console.log('[MBCR_SNIPPETS]', {
                thread_id,
                tags,
                text_query: text_query ? `(${text_query.length} chars)` : null,
                total_messages: allMessages.length,
                matched_count: matchedIndices.size,
                expanded_count: expandedIndices.size,
                returned_count: snippets.length,
                returned_ids: snippets.map(s => s.id)
            });
        }

        return Response.json({ snippets, count: snippets.length });

    } catch (error) {
        console.error('[MBCR_SNIPPETS_ERROR]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});