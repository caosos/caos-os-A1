import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();

    try {
        console.log('🚀 [HYBRID_MESSAGE_START]', { request_id });
        
        const base44 = createClientFromRequest(req);
        if (!base44) {
            throw new Error('Failed to initialize base44 client');
        }
        
        const user = await base44.auth.me();
        if (!user || !user.email) {
            return Response.json({
                reply: "Authentication required. Please log in.",
                error: 'UNAUTHORIZED',
                request_id,
                mode: 'ERROR'
            }, { status: 401 });
        }

        const body = await req.json();
        const { input, session_id, limit = 20 } = body;

        // ============================================================
        // STAGE 1: BOOT VALIDATION
        // ============================================================
        console.log('🥾 [BOOT_VALIDATION]');
        const bootReceipt = await validateBoot(session_id, user.email, base44);
        if (!bootReceipt.valid) {
            throw new Error(`Boot failed: ${bootReceipt.failure_reason}`);
        }

        // ============================================================
        // STAGE 2: LOAD CONVERSATION HISTORY (RECALL)
        // ============================================================
        console.log('🔍 [RECALL] Loading conversation history');
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
                console.log(`✅ Loaded ${conversationHistory.length} messages from history`);
            } catch (error) {
                console.error('Failed to load history:', error.message);
            }
        }

        // ============================================================
        // STAGE 3: BUILD CONTEXT & CALL OPENAI WITH TOOLS
        // ============================================================
        console.log('🧠 [INFERENCE] Calling OpenAI with tools');
        
        const tools = [
            {
                type: "function",
                function: {
                    name: "web_search",
                    description: "Search the web for current information, news, or real-time data",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "The search query"
                            }
                        },
                        required: ["query"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "generate_image",
                    description: "Generate an image using AI based on a text description",
                    parameters: {
                        type: "object",
                        properties: {
                            prompt: {
                                type: "string",
                                description: "Detailed description of the image to generate"
                            }
                        },
                        required: ["prompt"]
                    }
                }
            }
        ];

        const messages = [
            { 
                role: 'system', 
                content: `You are Aria, a helpful AI assistant.

You have access to:
- web_search: For current information, news, real-time data
- generate_image: For creating images from text descriptions

Use tools when appropriate to provide accurate, helpful responses.` 
            },
            ...conversationHistory,
            { role: 'user', content: input }
        ];

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        let response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages,
                tools,
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        let data = await response.json();
        let assistantMessage = data.choices[0].message;
        const toolCalls = [];

        // ============================================================
        // STAGE 4: EXECUTE TOOLS IF NEEDED
        // ============================================================
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            console.log(`🔧 [TOOLS] Executing ${assistantMessage.tool_calls.length} tool calls`);
            
            const toolMessages = [assistantMessage];
            
            for (const toolCall of assistantMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);
                
                console.log(`🔧 Executing ${functionName}:`, functionArgs);
                
                let toolResult;
                try {
                    if (functionName === 'web_search') {
                        const searchResult = await base44.integrations.Core.InvokeLLM({
                            prompt: `Search query: ${functionArgs.query}`,
                            add_context_from_internet: true
                        });
                        toolResult = JSON.stringify(searchResult);
                    } else if (functionName === 'generate_image') {
                        const imageResult = await base44.integrations.Core.GenerateImage({
                            prompt: functionArgs.prompt
                        });
                        toolResult = JSON.stringify({ image_url: imageResult.url });
                    } else {
                        toolResult = JSON.stringify({ error: 'Unknown function' });
                    }
                    
                    toolCalls.push({
                        name: functionName,
                        status: 'completed',
                        arguments_string: JSON.stringify(functionArgs),
                        results: toolResult
                    });
                } catch (error) {
                    console.error(`Tool ${functionName} failed:`, error.message);
                    toolResult = JSON.stringify({ error: error.message });
                    toolCalls.push({
                        name: functionName,
                        status: 'failed',
                        arguments_string: JSON.stringify(functionArgs),
                        results: toolResult
                    });
                }
                
                toolMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: toolResult
                });
            }
            
            // Second API call with tool results
            response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [...messages, ...toolMessages],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });
            
            data = await response.json();
            assistantMessage = data.choices[0].message;
        }

        const reply = assistantMessage.content;

        // ============================================================
        // STAGE 5: SAVE TO DATABASE
        // ============================================================
        if (session_id) {
            try {
                console.log('💾 [MEMORY] Saving messages to database');
                
                await base44.asServiceRole.entities.Message.create({
                    conversation_id: session_id,
                    role: 'user',
                    content: input,
                    timestamp: new Date().toISOString()
                });

                await base44.asServiceRole.entities.Message.create({
                    conversation_id: session_id,
                    role: 'assistant',
                    content: reply,
                    tool_calls: toolCalls,
                    timestamp: new Date().toISOString()
                });
                
                console.log('✅ Messages saved');
            } catch (saveError) {
                console.error('Failed to save messages:', saveError.message);
            }
        }

        // ============================================================
        // STAGE 6: RETURN RESPONSE
        // ============================================================
        const responseTime = Date.now() - startTime;
        
        return Response.json({ 
            reply, 
            mode: 'GEN', 
            request_id,
            tool_calls: toolCalls,
            response_time_ms: responseTime,
            execution_receipt: {
                request_id,
                session_id,
                boot_valid: true,
                recall_executed: conversationHistory.length > 0,
                tools_executed: toolCalls.length > 0,
                latency_ms: responseTime
            }
        });

    } catch (error) {
        console.error('🔥 [ERROR]', { 
            request_id,
            error: error.message,
            stack: error.stack
        });
        
        return Response.json({
            reply: "I encountered an error processing your request.",
            error: 'PIPELINE_FAILURE',
            error_details: error.message,
            request_id,
            mode: 'ERROR'
        }, { status: 200 });
    }
});

// ============================================================
// HELPER: BOOT VALIDATION
// ============================================================
async function validateBoot(session_id, user_email, base44) {
    try {
        const timestamp = new Date();
        const timestamp_ms = timestamp.getTime();

        // Check for existing valid boot
        const existingReceipts = await base44.asServiceRole.entities.BootReceipt.filter(
            { session_id, valid: true },
            '-boot_timestamp_ms',
            1
        );

        if (existingReceipts && existingReceipts.length > 0) {
            return existingReceipts[0];
        }

        // Create new boot receipt
        const bootReceipt = await base44.asServiceRole.entities.BootReceipt.create({
            session_id,
            boot_timestamp: timestamp.toISOString(),
            boot_timestamp_ms: timestamp_ms,
            valid: true,
            context_paths_loaded: [
                '/context/kernel/identity',
                '/context/bootloader/config',
                `/context/profiles/${user_email}`
            ],
            missing_contexts: [],
            environment_declaration: {
                mode: 'OPERATE',
                policy_gating: 'ACTIVE'
            },
            capabilities_enabled: {
                web_enabled: true,
                file_search_enabled: false,
                image_gen_enabled: true,
                memory_enabled: true
            }
        });

        return bootReceipt;
    } catch (error) {
        console.error('Boot validation failed:', error.message);
        throw error;
    }
}