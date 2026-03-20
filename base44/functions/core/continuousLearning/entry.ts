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
        const prompt = `You are a fact extraction system for Aria, a personal AI assistant.
Your CRITICAL job: extract EVERYTHING about Michael that matters personally - his life, feelings, relationships, work, goals.

CONVERSATION:
User: "${userMessage}"
Assistant: "${assistantMessage}"
${toolResults ? `\n\nTool Results:\n${JSON.stringify(toolResults, null, 2)}` : ''}

EXTRACT AGGRESSIVELY:
1. PERSONAL LIFE: People he mentions (colleagues, friends, romantic interests), relationships, feelings, social dynamics
2. WORK & CAREER: Projects, challenges, team members, workplace situations, career goals
3. PREFERENCES & STYLE: How he communicates, what he values, what frustrates him, what excites him
4. CONTEXT & BACKGROUND: His situation, his setup, technical skills, interests
5. DECISIONS & GOALS: What he's trying to achieve, choices he's making, problems he's solving

Return JSON with "facts" array:
{
  "facts": [
    {
      "fact_type": "user_fact|topic_knowledge|search_result|system_capability",
      "category": "personal|work|relationship|technical|preference|goal|decision",
      "subject": "specific person/thing/topic",
      "fact_content": "detailed, specific fact in first-person context (e.g., 'Michael likes Sarah from work')",
      "confidence": 0.0-1.0,
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

CRITICAL RULES:
- BIAS TOWARD EXTRACTION - capture everything personal
- Names, people, relationships = ALWAYS extract
- Feelings, opinions, preferences = ALWAYS extract
- Be specific: "Michael mentioned Sarah from work" not "user mentioned someone"
- Confidence: 1.0 = directly stated, 0.8 = clearly implied, 0.6 = contextually inferred
- If conversation mentions ANYONE by name or role, extract it
- Include rich tags for retrieval (names, topics, emotions)
- If nothing to extract, return {"facts": []}`;

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
        // Get ALL user facts (prioritize user_facts and personal categories)
        const allFacts = await base44.asServiceRole.entities.LearnedFact.filter(
            { user_id: userId },
            '-reference_count',
            200
        );

        if (allFacts.length === 0) {
            return [];
        }

        // Extract keywords from message
        const keywords = extractKeywords(userMessage);
        const messageLower = userMessage.toLowerCase();

        // Score each fact by relevance
        const scoredFacts = allFacts.map(fact => {
            let score = 0;
            const factText = `${fact.subject} ${fact.fact_content} ${fact.tags?.join(' ')}`.toLowerCase();
            
            // Heavy weight for personal/relationship facts
            if (fact.fact_type === 'user_fact') score += 50;
            if (fact.category === 'personal' || fact.category === 'relationship') score += 40;
            
            // Keyword matches
            keywords.forEach(keyword => {
                if (factText.includes(keyword)) score += 10;
                if (fact.subject?.toLowerCase().includes(keyword)) score += 15;
                if (fact.tags?.some(tag => tag.toLowerCase().includes(keyword))) score += 12;
            });
            
            // Exact phrase matches
            if (messageLower.includes(fact.subject?.toLowerCase())) score += 25;
            
            // Boost frequently referenced facts
            score += (fact.reference_count || 0) * 2;
            
            // Recency bonus
            const ageInDays = (Date.now() - new Date(fact.learned_at).getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays < 7) score += 15;
            else if (ageInDays < 30) score += 5;
            
            return { fact, score };
        });

        // Sort by score and take top matches
        const relevantFacts = scoredFacts
            .filter(sf => sf.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 15)
            .map(sf => sf.fact);

        // Update reference counts for recalled facts
        for (const fact of relevantFacts.slice(0, 10)) {
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
            total_facts: allFacts.length,
            keywords: keywords.slice(0, 5),
            relevant_count: relevantFacts.length,
            top_subjects: relevantFacts.slice(0, 3).map(f => f.subject)
        });

        return relevantFacts;

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

    // Group by category
    const personal = facts.filter(f => f.category === 'personal' || f.category === 'relationship');
    const work = facts.filter(f => f.category === 'work');
    const preferences = facts.filter(f => f.category === 'preference');
    const other = facts.filter(f => !personal.includes(f) && !work.includes(f) && !preferences.includes(f));

    let context = '\n\n═══ WHAT YOU REMEMBER ABOUT MICHAEL ═══\n';
    
    if (personal.length > 0) {
        context += '\n📍 PERSONAL & RELATIONSHIPS:\n';
        personal.forEach(f => context += `  • ${f.fact_content}\n`);
    }
    
    if (work.length > 0) {
        context += '\n💼 WORK & CAREER:\n';
        work.forEach(f => context += `  • ${f.fact_content}\n`);
    }
    
    if (preferences.length > 0) {
        context += '\n⚙️  PREFERENCES & STYLE:\n';
        preferences.forEach(f => context += `  • ${f.fact_content}\n`);
    }
    
    if (other.length > 0) {
        context += '\n📚 OTHER CONTEXT:\n';
        other.slice(0, 5).forEach(f => context += `  • ${f.fact_content}\n`);
    }
    
    context += '\n💡 Use this knowledge naturally in your responses. You KNOW these things about Michael.\n';

    return context;
}