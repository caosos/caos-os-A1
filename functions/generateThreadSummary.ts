import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id required' }, { status: 400 });
    }

    // Fetch all messages from this conversation
    const messages = await base44.asServiceRole.entities.Message.filter(
      { conversation_id },
      'created_date',
      1000
    );

    if (messages.length === 0) {
      return Response.json({ 
        summary: 'No messages in this conversation',
        keywords: []
      });
    }

    // Extract content for summarization
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    // Generate summary with keywords using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a conversation analyzer. Summarize this thread with key points, decisions made, and outcomes. Be specific and concise. Then list 5-8 relevant keywords.

Format your response as JSON:
{
  "summary": "3-4 sentence summary with specific details, decisions, and outcomes",
  "keywords": ["keyword1", "keyword2", ...]
}`
          },
          {
            role: 'user',
            content: conversationText.substring(0, 8000) // Limit to avoid token overflow
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI error: ${error}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback if parsing fails
      parsed = {
        summary: content.substring(0, 300),
        keywords: []
      };
    }

    // Update conversation with summary and keywords
    await base44.asServiceRole.entities.Conversation.update(conversation_id, {
      summary: parsed.summary,
      keywords: parsed.keywords || [],
      message_count: messages.length
    });

    return Response.json({
      success: true,
      summary: parsed.summary,
      keywords: parsed.keywords,
      message_count: messages.length
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    return Response.json({ 
      error: error.message,
      summary: null
    }, { status: 500 });
  }
});