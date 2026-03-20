/**
 * ANALYZE THREADS EXECUTOR
 * 
 * Loads actual thread content and analyzes it to extract information.
 * Used when user asks to "look through threads", "learn from threads", etc.
 */

import { buildExecutorResponse } from '../core/executorContract.js';

export async function executeAnalyzeThreads({ base44, user, query, request_id }) {
    const tool = 'analyze_threads';
    const executor = 'analyze_threads_executor';
    const started_at = Date.now();

    try {
        console.log('🔍 [ANALYZE_THREADS_START]', { request_id, query });

        // Load user's conversations with messages
        const conversations = await base44.asServiceRole.entities.Conversation.filter(
            { created_by: user.email },
            '-updated_date',
            30 // Last 30 threads
        );

        if (conversations.length === 0) {
            return buildExecutorResponse({
                ok: false,
                tool,
                executor,
                started_at,
                ended_at: Date.now(),
                input: query,
                output: null,
                error_code: 'NO_THREADS_FOUND',
                error_detail: 'No conversation threads found for user'
            });
        }

        // Load messages from recent threads
        const threadsWithContent = [];
        for (const conv of conversations.slice(0, 10)) { // Analyze top 10 most recent
            const messages = await base44.asServiceRole.entities.Message.filter(
                { conversation_id: conv.id },
                '-created_date',
                20 // Last 20 messages per thread
            );

            if (messages.length > 0) {
                threadsWithContent.push({
                    thread_id: conv.id,
                    title: conv.title || 'Untitled',
                    created_at: conv.created_date,
                    message_count: messages.length,
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content?.substring(0, 1000), // Truncate long messages
                        timestamp: m.created_date
                    }))
                });
            }
        }

        // Use LLM to analyze and extract insights
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiKey) {
            console.warn('⚠️ No OPENAI_API_KEY - returning raw threads');
            return buildExecutorResponse({
                ok: true,
                tool,
                executor,
                started_at,
                ended_at: Date.now(),
                input: query,
                output: threadsWithContent,
                data: {
                    threads_analyzed: threadsWithContent.length,
                    threads: threadsWithContent
                }
            });
        }

        // Build analysis prompt
        const threadsText = threadsWithContent.map(t => {
            const msgs = t.messages.map(m => `${m.role}: ${m.content}`).join('\n');
            return `=== THREAD: ${t.title} ===\n${msgs}\n`;
        }).join('\n\n');

        const prompt = `You are analyzing conversation threads to extract insights about the user (Michael).

USER'S REQUEST: "${query}"

THREADS TO ANALYZE:
${threadsText.substring(0, 15000)}

Extract and return JSON:
{
  "summary": "2-3 sentence summary of what you learned about Michael",
  "key_insights": [
    "specific insight 1",
    "specific insight 2"
  ],
  "people_mentioned": [
    {"name": "name", "context": "how they relate to Michael"}
  ],
  "projects_discussed": ["project1", "project2"],
  "preferences_observed": ["preference1", "preference2"],
  "facts_to_remember": [
    {
      "fact_type": "user_fact",
      "category": "personal|work|relationship|preference",
      "subject": "what/who",
      "fact_content": "specific fact",
      "confidence": 0.9
    }
  ]
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are an analysis system. Return valid JSON only.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 2000,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            throw new Error(`Analysis API error: ${response.status}`);
        }

        const data = await response.json();
        const analysis = JSON.parse(data.choices[0]?.message?.content || '{}');

        // Persist extracted facts
        if (analysis.facts_to_remember && Array.isArray(analysis.facts_to_remember)) {
            for (const fact of analysis.facts_to_remember) {
                try {
                    await base44.asServiceRole.entities.LearnedFact.create({
                        user_id: user.email,
                        fact_type: fact.fact_type || 'user_fact',
                        category: fact.category || 'general',
                        subject: fact.subject || 'unknown',
                        fact_content: fact.fact_content,
                        confidence: fact.confidence || 0.8,
                        source_thread: 'thread_analysis',
                        learned_at: new Date().toISOString(),
                        last_referenced: new Date().toISOString(),
                        reference_count: 0,
                        tags: fact.tags || []
                    });
                } catch (persistError) {
                    console.error('⚠️ [FACT_PERSIST_FAILED]', persistError.message);
                }
            }
            console.log('🧠 [ANALYSIS_FACTS_STORED]', { count: analysis.facts_to_remember.length });
        }

        console.log('✅ [ANALYZE_THREADS_SUCCESS]', {
            request_id,
            threads_analyzed: threadsWithContent.length,
            facts_extracted: analysis.facts_to_remember?.length || 0
        });

        return buildExecutorResponse({
            ok: true,
            tool,
            executor,
            started_at,
            ended_at: Date.now(),
            input: query,
            output: analysis,
            data: {
                threads_analyzed: threadsWithContent.length,
                analysis
            }
        });

    } catch (error) {
        console.error('🚨 [ANALYZE_THREADS_FAILED]', error.message);
        return buildExecutorResponse({
            ok: false,
            tool,
            executor,
            started_at,
            ended_at: Date.now(),
            input: query,
            output: null,
            error_code: 'EXECUTION_FAILED',
            error_detail: error.message
        });
    }
}