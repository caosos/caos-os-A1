// autoTitleThread — Fire-and-forget conversation auto-titler
// Called from hybridMessage after first assistant reply.
// INVARIANT: Only titles threads with default/empty titles and ≤ 3 messages.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_TITLES = ['new conversation', 'untitled', ''];

async function generateTitle(openaiKey, userInput) {
    const response = await fetch(OPENAI_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: `Generate a short 4-6 word title for a conversation that starts with this message: "${userInput.substring(0, 300)}". Respond with ONLY the title, no quotes, no punctuation at the end, no explanation.`
                }
            ],
            temperature: 0.7,
            max_completion_tokens: 20
        })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { session_id, user_input } = await req.json();
        if (!session_id || !user_input) {
            return Response.json({ skipped: true, reason: 'missing_params' });
        }

        // Fetch the conversation
        const conversation = await base44.asServiceRole.entities.Conversation.get(session_id).catch(() => null);
        if (!conversation) return Response.json({ skipped: true, reason: 'conversation_not_found' });

        // Only title if it's still a default/blank title
        const currentTitle = (conversation.title || '').trim().toLowerCase();
        const isDefaultTitle = DEFAULT_TITLES.includes(currentTitle);
        if (!isDefaultTitle) {
            return Response.json({ skipped: true, reason: 'already_has_title', title: conversation.title });
        }

        // Only title new threads (≤ 3 messages)
        const messageCount = await base44.asServiceRole.entities.Message.filter(
            { conversation_id: session_id }, '-timestamp', 4
        ).catch(() => []);
        if (messageCount.length > 3) {
            return Response.json({ skipped: true, reason: 'too_many_messages', count: messageCount.length });
        }

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        const title = await generateTitle(openaiKey, user_input);
        if (!title) return Response.json({ skipped: true, reason: 'title_generation_failed' });

        await base44.asServiceRole.entities.Conversation.update(session_id, { title });
        console.log('✅ [AUTO_TITLE]', { session_id, title });

        return Response.json({ success: true, title });
    } catch (error) {
        console.error('❌ [AUTO_TITLE_ERROR]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});