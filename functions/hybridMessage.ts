import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();

    try {
        console.log('🚀 [HYBRID_MESSAGE_START]', { request_id });
        
        const base44 = createClientFromRequest(req);
        if (!base44) {
            console.error('🚨 [CRITICAL] Failed to create base44 client');
            throw new Error('Failed to initialize base44 client');
        }
        console.log('✅ [CLIENT_CREATED]');
        
        const user = await base44.auth.me();
        if (!user || !user.email) {
            console.error('🚨 [AUTH_FAILED] User not authenticated');
            return Response.json({
                reply: "Authentication required. Please log in.",
                error: 'UNAUTHORIZED',
                request_id,
                mode: 'ERROR'
            }, { status: 401 });
        }
        console.log('✅ [USER_AUTHENTICATED]', { email: user?.email });

        const body = await req.json();
        const { input, session_id, limit = 20 } = body;

        // Load conversation history if session_id provided
        let conversationHistory = [];
        if (session_id) {
            try {
                const messages = await base44.asServiceRole.entities.Message.filter(
                    { conversation_id: session_id },
                    'timestamp',
                    limit
                );
                conversationHistory = messages.map(m => ({
                    role: m.role,
                    content: m.content
                }));
            } catch (error) {
                console.error('Failed to load conversation history:', error.message);
            }
        }

        // Build messages array with history
        const messages = [
            { role: 'system', content: 'You are Aria, a helpful AI assistant.' },
            ...conversationHistory,
            { role: 'user', content: input }
        ];

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages,
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content;

        // Save messages to database if session_id provided
        if (session_id) {
            try {
                // Save user message
                await base44.asServiceRole.entities.Message.create({
                    conversation_id: session_id,
                    role: 'user',
                    content: input,
                    timestamp: new Date().toISOString()
                });

                // Save AI response
                await base44.asServiceRole.entities.Message.create({
                    conversation_id: session_id,
                    role: 'assistant',
                    content: reply,
                    timestamp: new Date().toISOString()
                });
            } catch (saveError) {
                console.error('Failed to save messages:', saveError.message);
                // Don't fail the request if saving fails
            }
        }

        return Response.json({ reply, mode: 'GEN', request_id });

    } catch (error) {
        console.error('🔥 [HTTP_HANDLER_ERROR]', { 
            request_id,
            error: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // Return graceful error to frontend
        return Response.json({
            reply: "I encountered an error. The system has logged this issue for review.",
            error: 'HTTP_HANDLER_FAILURE',
            error_details: error.message,
            request_id,
            mode: 'ERROR',
            degradation: {
                type: 'handler_error',
                details: error.message
            }
        }, { status: 200 }); // Return 200 with error payload instead of 500
    }
});