/**
 * CAOS CONTINUOUS LEARNING SYSTEM
 * 
 * Extracts and persists new facts from every conversation turn.
 * Builds knowledge base from searches and interactions.
 * Self-improving system that gets smarter with use.
 */

export async function extractAndPersistFacts({
    base44,
    userId,
    threadId,
    userMessage,
    assistantMessage,
    toolResults = null
}) {
    try {
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiKey) {
            console.warn('⚠️ No OPENAI_API_KEY - skipping fact extraction');
            return { ok: false, reason: 'no_api_key' };
        }

        // Build extraction prompt
        const prompt = `You are a fact extraction system for an AI assistant named Aria.
Your job: extract NEW, CONCRETE facts that should be remembered long-term.

CONVERSATION:
User: "${userMessage}"
Assistant: "${assistantMessage}"
${toolResults ? `\n\nTool Results:\n${JSON.stringify(toolResults, null, 2)}` : ''}

Extract facts in these categories:
1. USER FACTS: New information about the user (preferences, goals, background, decisions)
2. TOPIC KNOWLEDGE: New knowledge about topics discussed (technical concepts, tools, methods)
3. SEARCH RESULTS: Key findings from searches (if tool results present)
4. SYSTEM CAPABILITIES: New things learned about what the system can/can't do

Return JSON array:
[
  {
    "fact_type": "user_fact|topic_knowledge|search_result|system_capability",
    "category": "personal|work|technical|preference|etc",
    "subject": "who or what this is about",
    "fact_content": "the concrete fact (specific, not abstract)",
    "confidence": 0.0-1.0,
    "tags": ["tag1", "tag2"]
  }
]

RULES:
- Only extract NEW facts not already known
- Be specific and concrete
- No abstractions or generic statements
- If nothing new to learn, return []
- Confidence: 1.0 = user stated directly, 0.8 = strongly implied, 0.5 = inferred`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a fact extraction system. Output valid JSON array only.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 1500,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            throw new Error(`Fact extraction API error: ${response.status}`);
        }

        const data = await response.json();
        const result = JSON.parse(data.choices[0]?.message?.content || '{}');
        const facts = result.facts || result.extracted_facts || [];

        if (!Array.isArray(facts) || facts.length === 0) {
            console.log('ℹ️ [NO_NEW_FACTS]', { threadId });
            return { ok: true, facts_learned: 0 };
        }

        // Persist each fact
        let persistedCount = 0;
        for (const fact of facts) {
            try {
                await base44.asServiceRole.entities.LearnedFact.create({
                    user_id: userId,
                    fact_type: fact.fact_type,
                    category: fact.category || 'general',
                    subject: fact.subject || 'unknown',
                    fact_content: fact.fact_content,
                    confidence: fact.confidence || 0.8,
                    source_thread: threadId,
                    learned_at: new Date().toISOString(),
                    last_referenced: new Date().toISOString(),
                    reference_count: 0,
                    tags: fact.tags || []
                });
                persistedCount++;
            } catch (persistError) {
                console.error('⚠️ [FACT_PERSIST_FAILED]', persistError.message);
            }
        }

        console.log('✅ [FACTS_LEARNED]', { 
            threadId, 
            extracted: facts.length, 
            persisted: persistedCount 
        });

        return { ok: true, facts_learned: persistedCount, facts };

    } catch (error) {
        console.error('🚨 [FACT_EXTRACTION_FAILED]', error.message);
        return { ok: false, reason: error.message };
    }
}

export async function recallRelevantFacts({ base44, userId, userMessage }) {
    try {
        // Simple keyword matching for now (can be enhanced with embeddings later)
        const keywords = extractKeywords(userMessage);
        
        if (keywords.length === 0) {
            return [];
        }

        // Search for relevant facts by tags or subject
        const allFacts = await base44.asServiceRole.entities.LearnedFact.filter(
            { user_id: userId },
            '-learned_at',
            50
        );

        const relevantFacts = allFacts.filter(fact => {
            const factText = `${fact.subject} ${fact.fact_content} ${fact.tags?.join(' ')}`.toLowerCase();
            return keywords.some(keyword => factText.includes(keyword));
        });

        // Update reference counts
        for (const fact of relevantFacts.slice(0, 5)) {
            try {
                await base44.asServiceRole.entities.LearnedFact.update(fact.id, {
                    last_referenced: new Date().toISOString(),
                    reference_count: (fact.reference_count || 0) + 1
                });
            } catch (updateError) {
                console.warn('⚠️ [FACT_UPDATE_FAILED]', updateError.message);
            }
        }

        console.log('🧠 [FACTS_RECALLED]', { 
            userId, 
            keywords: keywords.slice(0, 3),
            relevant_count: relevantFacts.length 
        });

        return relevantFacts.slice(0, 10);

    } catch (error) {
        console.error('⚠️ [FACT_RECALL_FAILED]', error.message);
        return [];
    }
}

function extractKeywords(text) {
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might',
        'can', 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'this',
        'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

    return [...new Set(words)];
}

export function formatFactsForContext(facts) {
    if (!facts || facts.length === 0) {
        return '';
    }

    let context = '\n\nRELEVANT KNOWLEDGE (PREVIOUSLY LEARNED):\n';
    
    facts.forEach(fact => {
        context += `- ${fact.fact_content}`;
        if (fact.subject && fact.subject !== 'unknown') {
            context += ` [${fact.subject}]`;
        }
        context += '\n';
    });

    return context;
}