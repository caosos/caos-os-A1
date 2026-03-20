/**
 * MEMORY ANCHOR EXTRACTION
 * 
 * Extracts durable facts from conversation and persists them as anchors.
 * These are "always remember" facts that should be recalled in every context.
 */

export async function extractMemoryAnchors({ base44, userId, userMessage, assistantMessage }) {
    try {
        // Load current profile
        const profiles = await base44.asServiceRole.entities.UserProfile.filter(
            { user_email: userId },
            '-updated_date',
            1
        );
        
        if (!profiles[0]) {
            console.warn('⚠️ [ANCHOR_EXTRACTION] No profile found');
            return { ok: false, reason: 'no_profile' };
        }
        
        const profile = profiles[0];
        const existingAnchors = profile.memory_anchors || [];
        
        // Anchor extraction patterns (high-confidence durable facts)
        const anchorPatterns = [
            // Personal names
            { pattern: /(?:named|name is|called|call (?:me|him|her)|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g, type: 'person' },
            // Dates/birthdays
            { pattern: /(?:birthday|born on|anniversary)\s+(?:is\s+)?(?:on\s+)?([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi, type: 'date' },
            // Places
            { pattern: /(?:work at|employed at|live in|from|located in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, type: 'place' },
            // Preferences
            { pattern: /(?:I (?:like|love|prefer|enjoy|hate|dislike))\s+([a-z][a-z\s]+?)(?:\.|,|$)/gi, type: 'preference' },
            // Family
            { pattern: /(?:my (?:son|daughter|child|kid|wife|husband|partner|father|mother|dad|mom|brother|sister)(?:'s name)?)\s+(?:is\s+)?([A-Z][a-z]+)/gi, type: 'family' },
            // Projects
            { pattern: /(?:working on|building|creating|developing)\s+([A-Z][A-Za-z0-9\s]+?)(?:\.|,|$)/g, type: 'project' }
        ];
        
        const extractedAnchors = [];
        const conversationText = `${userMessage}\n${assistantMessage}`;
        
        for (const { pattern, type } of anchorPatterns) {
            let match;
            while ((match = pattern.exec(conversationText)) !== null) {
                const anchor = match[1]?.trim();
                if (anchor && anchor.length > 2 && anchor.length < 100) {
                    extractedAnchors.push({ text: anchor, type, source: 'pattern' });
                }
            }
        }
        
        // Use OpenAI for additional extraction (if key available)
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (openaiKey && extractedAnchors.length < 3) {
            try {
                const prompt = `Extract durable facts about the user that should ALWAYS be remembered. Return JSON array.

User: ${userMessage}
Assistant: ${assistantMessage}

Return format: [{"fact": "Michael works at Brookdale", "type": "work"}, ...]

Only extract:
- Names of people (family, friends, colleagues)
- Birthdays, anniversaries, important dates
- Places (work, home, locations)
- Strong preferences (loves/hates)
- Important projects or goals
- Family relationships

Return empty array if no durable facts found.`;

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: 'You extract durable facts from conversations. Output JSON only.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.2,
                        max_tokens: 500,
                        response_format: { type: 'json_object' }
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const extracted = JSON.parse(data.choices[0]?.message?.content || '{"facts": []}');
                    if (extracted.facts && Array.isArray(extracted.facts)) {
                        extracted.facts.forEach(f => {
                            extractedAnchors.push({ text: f.fact, type: f.type || 'general', source: 'llm' });
                        });
                    }
                }
            } catch (llmError) {
                console.warn('⚠️ [LLM_ANCHOR_EXTRACTION_FAILED]', llmError.message);
            }
        }
        
        if (extractedAnchors.length === 0) {
            return { ok: true, anchors_added: 0 };
        }
        
        // Deduplicate and merge with existing
        const newAnchors = [];
        for (const anchor of extractedAnchors) {
            const isDuplicate = existingAnchors.some(existing => 
                existing.toLowerCase().includes(anchor.text.toLowerCase()) ||
                anchor.text.toLowerCase().includes(existing.toLowerCase())
            );
            
            if (!isDuplicate) {
                newAnchors.push(anchor.text);
                
                // Also create LearnedFact for retrieval
                await base44.asServiceRole.entities.LearnedFact.create({
                    user_id: userId,
                    fact_type: 'user_fact',
                    category: anchor.type,
                    subject: anchor.text.split(' ')[0], // First word as subject
                    fact_content: anchor.text,
                    confidence: anchor.source === 'llm' ? 0.9 : 0.85,
                    learned_at: new Date().toISOString(),
                    tags: [anchor.type, 'anchor']
                });
            }
        }
        
        if (newAnchors.length > 0) {
            const updatedAnchors = [...existingAnchors, ...newAnchors].slice(0, 50); // Cap at 50
            
            await base44.asServiceRole.entities.UserProfile.update(profile.id, {
                memory_anchors: updatedAnchors
            });
            
            console.log('✅ [MEMORY_ANCHORS_ADDED]', { count: newAnchors.length, anchors: newAnchors });
        }
        
        return { ok: true, anchors_added: newAnchors.length };
        
    } catch (error) {
        console.error('🚨 [ANCHOR_EXTRACTION_FAILED]', error.message);
        return { ok: false, reason: error.message };
    }
}