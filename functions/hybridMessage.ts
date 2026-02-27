import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

// Token budget constants
const MAX_HISTORY_MESSAGES = 200;   // Load up to 200 messages per session
const HOT_TAIL = 80;                // Always keep last 80 messages
const HOT_HEAD = 20;                // Always keep first 20 messages (for "first message" recall)
const MAX_ANCHOR_LENGTH = 6000;     // Max chars for all memory anchors combined

async function openAICall(key, messages, model = 'gpt-4o', maxTokens = 2000) {
    const response = await fetch(OPENAI_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}

// Compress middle of long session into a summary block
function compressHistory(messages) {
    if (messages.length <= HOT_HEAD + HOT_TAIL) return messages;
    const head = messages.slice(0, HOT_HEAD);
    const tail = messages.slice(-HOT_TAIL);
    const middleCount = messages.length - HOT_HEAD - HOT_TAIL;
    const summaryBlock = {
        role: 'system',
        content: `[CONVERSATION SUMMARY: ${middleCount} earlier messages omitted for brevity. The first ${HOT_HEAD} messages and last ${HOT_TAIL} messages are included in full above and below this note.]`
    };
    return [...head, summaryBlock, ...tail];
}

// Extract key facts worth remembering long-term
async function extractMemoryAnchors(openaiKey, conversationExcerpt, existingAnchors) {
    const prompt = `You are a memory extraction system. Given this conversation excerpt, extract any NEW facts worth remembering long-term about the user. Focus on: purchases, names, dates, decisions, preferences, life events, important numbers/details.

EXISTING ANCHORS (already stored - do not duplicate):
${existingAnchors || 'None yet'}

CONVERSATION:
${conversationExcerpt}

Output ONLY new facts, one per line, in format: "[DATE if known]: [fact]"
If nothing new is worth storing, output exactly: NONE`;

    const result = await openAICall(openaiKey, [{ role: 'user', content: prompt }], 'gpt-4o-mini', 500);
    return result.trim() === 'NONE' ? [] : result.split('\n').filter(l => l.trim().length > 0);
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.email) {
            return Response.json({ reply: "Authentication required.", error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const body = await req.json();
        const { input, session_id, file_urls = [] } = body;
        const openaiKey = Deno.env.get('OPENAI_API_KEY');

        console.log('🚀 [PIPELINE_START]', { request_id, user: user.email, session_id });

        // ============ LOAD USER PROFILE (long-term memory) ============
        let userProfile = null;
        try {
            const profiles = await base44.entities.UserProfile.filter({ user_email: user.email }, '-created_date', 1);
            userProfile = profiles?.[0] || null;
        } catch (e) { console.warn('⚠️ [PROFILE_FAILED]', e.message); }

        // ============ LOAD FULL SESSION HISTORY (rolling) ============
        let rawHistory = [];
        if (session_id) {
            try {
                // Load up to MAX_HISTORY_MESSAGES, oldest first
                const msgs = await base44.entities.Message.filter(
                    { conversation_id: session_id },
                    'timestamp',
                    MAX_HISTORY_MESSAGES
                );
                rawHistory = msgs.map(m => ({ role: m.role, content: m.content }));
                console.log('✅ [HISTORY_LOADED]', { count: rawHistory.length });
            } catch (e) { console.warn('⚠️ [HISTORY_FAILED]', e.message); }
        }

        // Smart compress if too long
        const conversationHistory = compressHistory(rawHistory);

        // ============ BUILD SYSTEM PROMPT ============
        const userName = userProfile?.preferred_name || user.full_name || 'the user';
        let systemPrompt = `You are Aria, a deeply personal AI assistant for ${userName}. You have full rolling memory of every conversation.

YOUR MEMORY CAPABILITIES:
- You remember the FIRST thing the user ever said to you in this session
- You remember every detail they've shared across all time
- When asked about past events, you retrieve from your memory anchors precisely
- Never say "I don't have access to past conversations" — you DO

`;

        // Inject long-term memory anchors
        const anchors = userProfile?.memory_anchors;
        if (anchors && anchors.length > 0) {
            const anchorText = Array.isArray(anchors) ? anchors.join('\n') : anchors;
            systemPrompt += `LONG-TERM MEMORY ANCHORS (facts remembered across all sessions):\n${anchorText.substring(0, MAX_ANCHOR_LENGTH)}\n\n`;
        }

        if (userProfile?.tone?.style) {
            systemPrompt += `Communication style: ${userProfile.tone.style}\n`;
        }
        if (userProfile?.project?.name) {
            systemPrompt += `Current project: ${userProfile.project.name}\n`;
        }

        systemPrompt += `\nThis session has ${rawHistory.length} messages of history. ${rawHistory.length > HOT_HEAD + HOT_TAIL ? `First ${HOT_HEAD} and last ${HOT_TAIL} shown; middle summarized.` : 'Full history shown.'} Always reference history when relevant.`;

        // ============ CALL OPENAI ============
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: input }
        ];

        const reply = await openAICall(openaiKey, messages, 'gpt-4o', 2000);
        if (!reply) throw new Error('No response from OpenAI');

        console.log('✅ [INFERENCE_SUCCESS]', { replyLength: reply.length, historyMessages: conversationHistory.length });

        // ============ SAVE MESSAGES TO DB ============
        if (session_id) {
            try {
                await base44.entities.Message.create({
                    conversation_id: session_id,
                    role: 'user',
                    content: input,
                    file_urls: file_urls.length > 0 ? file_urls : undefined,
                    timestamp: new Date().toISOString()
                });
                await base44.entities.Message.create({
                    conversation_id: session_id,
                    role: 'assistant',
                    content: reply,
                    timestamp: new Date().toISOString()
                });
                console.log('✅ [MESSAGES_SAVED]');
            } catch (e) { console.warn('⚠️ [SAVE_FAILED]', e.message); }
        }

        // ============ EXTRACT & UPDATE LONG-TERM MEMORY (async, non-blocking) ============
        (async () => {
            try {
                // Only run memory extraction every ~5 messages to save cost
                if (rawHistory.length % 5 === 0 || rawHistory.length === 0) {
                    const recentExcerpt = [...rawHistory.slice(-6), 
                        { role: 'user', content: input }, 
                        { role: 'assistant', content: reply }
                    ].map(m => `${m.role}: ${m.content}`).join('\n');

                    const existingAnchors = Array.isArray(anchors) ? anchors.join('\n') : (anchors || '');
                    const newFacts = await extractMemoryAnchors(openaiKey, recentExcerpt, existingAnchors);

                    if (newFacts.length > 0) {
                        const updatedAnchors = Array.isArray(anchors) 
                            ? [...anchors, ...newFacts] 
                            : newFacts;

                        if (userProfile) {
                            await base44.entities.UserProfile.update(userProfile.id, { memory_anchors: updatedAnchors });
                        } else {
                            await base44.entities.UserProfile.create({ user_email: user.email, memory_anchors: newFacts });
                        }
                        console.log('🧠 [ANCHORS_UPDATED]', { newFacts: newFacts.length });
                    }
                }
            } catch (e) { console.warn('⚠️ [ANCHOR_UPDATE_FAILED]', e.message); }
        })();

        const responseTime = Date.now() - startTime;
        console.log('🎯 [PIPELINE_COMPLETE]', { request_id, duration: responseTime, totalHistory: rawHistory.length });

        return Response.json({
            reply,
            mode: 'GEN',
            request_id,
            response_time_ms: responseTime,
            tool_calls: [],
            execution_receipt: {
                request_id,
                session_id,
                history_messages: rawHistory.length,
                recall_executed: rawHistory.length > 0,
                latency_ms: responseTime
            }
        });

    } catch (error) {
        console.error('🔥 [PIPELINE_ERROR]', { request_id, error: error.message });
        return Response.json({
            reply: "I encountered an error. Please try again.",
            error: error.message,
            request_id,
            mode: 'ERROR',
            response_time_ms: Date.now() - startTime
        }, { status: 200 });
    }
});