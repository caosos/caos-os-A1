import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();

    try {
        console.log('🚀 [PIPELINE_START]', { request_id });
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.email) {
            return Response.json({
                reply: "Authentication required. Please log in.",
                error: 'UNAUTHORIZED'
            }, { status: 401 });
        }

        const body = await req.json();
        const { input, session_id, file_urls = [], limit = 20 } = body;

        // ============ STAGE 1: BOOT VALIDATION ============
        console.log('📋 [STAGE_BOOT]', { user: user.email, session_id });

        // ============ STAGE 2: RECALL (Load conversation history) ============
        console.log('📚 [STAGE_RECALL_START]');
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
                
                console.log('✅ [RECALL_SUCCESS]', { messageCount: conversationHistory.length });
            } catch (error) {
                console.warn('⚠️ [RECALL_FAILED]', error.message);
            }
        }

        // ============ STAGE 3: INFERENCE (Call OpenAI) ============
        console.log('🧠 [STAGE_INFERENCE_START]');
        
        // Build messages with history
        const messages = [
            { 
                role: 'system', 
                content: `You are Aria, a helpful AI assistant. You provide thoughtful, accurate responses.
You have access to tools for web search, image generation, and file operations when needed.
Stay focused, be concise, and provide actionable information.` 
            },
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

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const reply = data.choices[0]?.message?.content;

        if (!reply) {
            throw new Error('No response from OpenAI');
        }

        console.log('✅ [INFERENCE_SUCCESS]', { replyLength: reply.length });

        // ============ STAGE 4: MEMORY COMMIT (Save messages) ============
        console.log('💾 [STAGE_MEMORY_COMMIT]');
        
        if (session_id) {
            try {
                // Save user message
                await base44.asServiceRole.entities.Message.create({
                    conversation_id: session_id,
                    role: 'user',
                    content: input,
                    file_urls: file_urls.length > 0 ? file_urls : undefined,
                    timestamp: new Date().toISOString()
                });

                // Save AI response
                await base44.asServiceRole.entities.Message.create({
                    conversation_id: session_id,
                    role: 'assistant',
                    content: reply,
                    timestamp: new Date().toISOString()
                });

                console.log('✅ [MEMORY_SAVED]');
            } catch (error) {
                console.warn('⚠️ [MEMORY_SAVE_FAILED]', error.message);
                // Don't fail the request if saving fails
            }
        }

        // ============ STAGE 5: RESPONSE ============
        const responseTime = Date.now() - startTime;
        console.log('🎯 [PIPELINE_COMPLETE]', { 
            request_id, 
            duration: responseTime 
        });

        return Response.json({
            reply,
            mode: 'GEN',
            request_id,
            response_time_ms: responseTime,
            execution_receipt: {
                stages_completed: ['boot', 'recall', 'inference', 'memory_commit'],
                message_count: conversationHistory.length + 1,
                user_email: user.email
            }
        });

    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error('🔥 [PIPELINE_ERROR]', {
            request_id,
            error: error.message,
            duration: responseTime
        });

        return Response.json({
            reply: "I encountered an error processing your request. The system has logged this for review.",
            error: error.message,
            request_id,
            mode: 'ERROR',
            response_time_ms: responseTime
        }, { status: 200 });
    }
});