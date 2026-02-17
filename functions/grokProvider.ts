import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_API_KEY = Deno.env.get('XAI_API_KEY');

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { input, session_id, file_urls, limit = 20 } = body;

        if (!GROK_API_KEY) {
            throw new Error('XAI_API_KEY not configured. Please set it in app settings.');
        }

        // Load conversation history
        const recentRecords = await base44.asServiceRole.entities.Record.filter(
            { session_id, status: "active" },
            '-seq',
            limit
        );

        // Build messages array - start with system
        const messages = [
            {
                role: "system",
                content: "You're CAOS - a helpful AI assistant. You can search the web, analyze images, and remember conversations. Talk naturally - no need to introduce yourself or list capabilities unless asked. Be casual and conversational."
            }
        ];

        // Add conversation history (reverse to get chronological order)
        const sortedRecords = recentRecords.reverse();
        for (const record of sortedRecords) {
            messages.push({
                role: record.role,
                content: record.message
            });
        }

        // Add current user message with images if present
        if (file_urls?.length > 0) {
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: input },
                    ...file_urls.map(url => ({
                        type: "image_url",
                        image_url: { url }
                    }))
                ]
            });
        } else {
            messages.push({
                role: "user",
                content: input
            });
        }

        // Define tools
        const tools = [
            {
                type: "function",
                function: {
                    name: "search_internet",
                    description: "Search the web for real-time information when the user asks to look something up, check current info, or find data",
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
                    name: "recall_memory",
                    description: "Search through past conversation history when the user references something said before",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { 
                                type: "string", 
                                description: "Keywords to search for in past messages" 
                            },
                            limit: { 
                                type: "number", 
                                description: "Max results to return",
                                default: 10
                            }
                        },
                        required: ["query"]
                    }
                }
            }
        ];

        // Call Grok
        const requestBody = {
            model: 'grok-2-latest',
            messages,
            tools,
            tool_choice: 'auto',
            temperature: 0.7
        };

        console.log('Calling Grok API...');
        console.log('Messages count:', messages.length);
        console.log('Last message:', messages[messages.length - 1]);

        let response = await fetch(GROK_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Grok API error response:', errorText);
            let errorMessage = response.statusText;
            try {
                const error = JSON.parse(errorText);
                errorMessage = error.error?.message || errorMessage;
            } catch (e) {
                errorMessage = errorText;
            }
            throw new Error(`Grok API error (${response.status}): ${errorMessage}`);
        }

        let result = await response.json();

        // Handle tool calls
        if (result.choices[0].message.tool_calls) {
            const toolMessages = [result.choices[0].message];
            
            for (const toolCall of result.choices[0].message.tool_calls) {
                const toolResult = await executeTool(
                    toolCall.function.name,
                    JSON.parse(toolCall.function.arguments),
                    base44,
                    session_id
                );
                
                toolMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: JSON.stringify(toolResult)
                });
            }

            // Call Grok again with tool results
            response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'grok-2-latest',
                    messages: [...messages, ...toolMessages],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Grok API error: ${error.error?.message || response.statusText}`);
            }

            result = await response.json();
        }

        const aiReply = result.choices[0].message.content;

        // Store user message
        const now = new Date();
        const seq = recentRecords.length > 0 ? Math.max(...recentRecords.map(r => r.seq)) + 1 : 1;
        
        await base44.asServiceRole.entities.Record.create({
            record_id: `${session_id}_${seq}_${now.getTime()}`,
            session_id,
            lane_id: user.email,
            tier: 'session',
            seq,
            ts_snapshot_iso: now.toISOString(),
            ts_snapshot_ms: now.getTime(),
            role: "user",
            message: input,
            anchors: [
                { class: "session", value: session_id },
                { class: "lane", value: user.email }
            ],
            token_count: Math.ceil(input.length / 4),
            status: "active"
        });

        // Store AI response
        const aiSeq = seq + 1;
        await base44.asServiceRole.entities.Record.create({
            record_id: `${session_id}_${aiSeq}_${Date.now()}`,
            session_id,
            lane_id: user.email,
            tier: 'session',
            seq: aiSeq,
            ts_snapshot_iso: new Date().toISOString(),
            ts_snapshot_ms: Date.now(),
            role: "assistant",
            message: aiReply,
            anchors: [
                { class: "session", value: session_id },
                { class: "lane", value: user.email }
            ],
            token_count: Math.ceil(aiReply.length / 4),
            status: "active"
        });

        return Response.json({
            reply: aiReply,
            session: session_id,
            usage: result.usage
        });

    } catch (error) {
        console.error('Grok provider error:', error);
        return Response.json({ 
            error: error.message,
            reply: "I encountered an error. Please try again."
        }, { status: 500 });
    }
});

async function executeTool(name, args, base44, session_id) {
    switch (name) {
        case 'search_internet':
            return await searchInternet(args.query, base44);
        
        case 'recall_memory':
            return await recallMemory(args.query, args.limit || 10, session_id, base44);
        
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}

async function searchInternet(query, base44) {
    try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: query,
            add_context_from_internet: true
        });
        return { results: result };
    } catch (error) {
        return { error: error.message };
    }
}

async function recallMemory(query, limit, session_id, base44) {
    try {
        const records = await base44.asServiceRole.entities.Record.filter(
            { session_id, status: "active" },
            '-created_date',
            Math.min(limit * 3, 100) // Get more records to search through
        );
        
        // Simple keyword search
        const queryLower = query.toLowerCase();
        const matches = records
            .filter(r => r.message.toLowerCase().includes(queryLower))
            .slice(0, limit);
        
        return {
            found: matches.length,
            messages: matches.map(m => ({
                role: m.role,
                content: m.message,
                timestamp: m.ts_snapshot_iso
            }))
        };
    } catch (error) {
        return { error: error.message };
    }
}