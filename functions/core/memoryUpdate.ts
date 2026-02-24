/**
 * CAOS MEMORY UPDATE SYSTEM
 * 
 * Runs after assistant turn completion.
 * Updates ThreadMemory and UserProfileMemory with evolving summaries.
 */

export async function postTurnMemoryUpdate({
    base44,
    userId,
    threadId,
    userMessage,
    assistantMessage,
    traceId
}) {
    try {
        // 1) Load existing memories (or init defaults)
        const threadMems = await base44.asServiceRole.entities.ThreadMemory.filter(
            { user_id: userId, thread_id: threadId },
            '-version',
            1
        );
        const threadMem = threadMems[0] || {
            user_id: userId,
            thread_id: threadId,
            summary_short: '',
            summary_context: '',
            open_loops: '',
            preferences_inferred: {},
            version: 0
        };

        const userMems = await base44.asServiceRole.entities.UserProfileMemory.filter(
            { user_id: userId },
            '-version',
            1
        );
        const userMem = userMems[0] || {
            user_id: userId,
            profile_summary: '',
            recent_state: '',
            active_projects: [],
            interaction_style: {},
            hard_rules: {},
            version: 0
        };

        // 2) Build summarization prompt (INTERNAL ONLY)
        const prompt = `You are updating memory for an AI assistant named "Aria" who lives within the CAOS platform.
Goal: produce tight, concrete, evolving summaries. No fluff.

INPUTS:
- Previous thread summary_short: ${threadMem.summary_short || 'None'}
- Previous thread summary_context: ${threadMem.summary_context || 'None'}
- Previous thread open_loops: ${threadMem.open_loops || 'None'}

- Previous user profile_summary: ${userMem.profile_summary || 'None'}
- Previous user recent_state: ${userMem.recent_state || 'None'}
- Previous user hard_rules: ${JSON.stringify(userMem.hard_rules)}

NEW TURN:
User said: """${userMessage}"""
Aria replied: """${assistantMessage}"""

TASK:
Return JSON with:
{
  "thread": {
    "summary_short": "...",
    "summary_context": "- ...\\n- ...",
    "open_loops": "- ...",
    "preferences_inferred": { ... }
  },
  "user": {
    "profile_summary": "...",
    "recent_state": "...",
    "active_projects": [ ... ],
    "interaction_style": { ... },
    "hard_rules": { ... }
  }
}

RULES:
- Specificity beats abstraction.
- Keep continuity; evolve, don't reset.
- Do NOT invent facts.
- If unsure, omit rather than guess.
- summary_short must be <= 240 chars.
- summary_context must be <= 1200 chars.
- open_loops must be <= 800 chars.
- profile_summary must be <= 1200 chars.
- recent_state must be <= 1200 chars.`;

        // 3) Call LLM in memory-update mode
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiKey) {
            console.warn('⚠️ No OPENAI_API_KEY - skipping memory update');
            return { ok: false, reason: 'no_api_key' };
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',  // Cheap model ok for memory updates
                messages: [
                    { role: 'system', content: 'You are a memory update system. Output valid JSON only.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 2000,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            throw new Error(`Memory update API error: ${response.status}`);
        }

        const data = await response.json();
        const memJson = JSON.parse(data.choices[0]?.message?.content || '{}');

        // 4) Validate structure
        if (!memJson.thread || !memJson.user) {
            throw new Error('Invalid memory JSON structure');
        }

        // 5) Persist (version++)
        const newThreadVersion = threadMem.version + 1;
        const newUserVersion = userMem.version + 1;

        if (threadMem.id) {
            await base44.asServiceRole.entities.ThreadMemory.update(threadMem.id, {
                ...memJson.thread,
                version: newThreadVersion,
                last_updated_at: new Date().toISOString()
            });
        } else {
            await base44.asServiceRole.entities.ThreadMemory.create({
                user_id: userId,
                thread_id: threadId,
                ...memJson.thread,
                version: newThreadVersion,
                last_updated_at: new Date().toISOString()
            });
        }

        if (userMem.id) {
            await base44.asServiceRole.entities.UserProfileMemory.update(userMem.id, {
                ...memJson.user,
                version: newUserVersion,
                last_updated_at: new Date().toISOString()
            });
        } else {
            await base44.asServiceRole.entities.UserProfileMemory.create({
                user_id: userId,
                ...memJson.user,
                version: newUserVersion,
                last_updated_at: new Date().toISOString()
            });
        }

        console.log('✅ [MEMORY_UPDATE]', { 
            thread_version: newThreadVersion, 
            user_version: newUserVersion,
            traceId 
        });

        return { ok: true, traceId };

    } catch (error) {
        console.error('🚨 [MEMORY_UPDATE_FAILED]', error.message);
        return { ok: false, reason: error.message };
    }
}