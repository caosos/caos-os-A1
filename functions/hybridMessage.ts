import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GROK_API_KEY = Deno.env.get('XAI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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
            throw new Error('XAI_API_KEY not configured');
        }

        // Load conversation history
        const recentRecords = await base44.asServiceRole.entities.Record.filter(
            { session_id, status: "active" },
            '-seq',
            limit
        );

        // Detect task type - route to OpenAI for file/image generation
        const lowerInput = input.toLowerCase();
        const isFileGen = lowerInput.includes('create file') || 
                         lowerInput.includes('generate pdf') || 
                         lowerInput.includes('save') && (lowerInput.includes('txt') || lowerInput.includes('json') || lowerInput.includes('pdf')) ||
                         lowerInput.includes('export');
        const isImageGen = lowerInput.includes('create image') || 
                          lowerInput.includes('generate image') ||
                          lowerInput.includes('draw') ||
                          lowerInput.includes('picture of') ||
                          lowerInput.includes('make an image');

        // Build message history
        const messages = [
            {
                role: "system",
                content: isFileGen || isImageGen 
                    ? "You are CAOS assistant. Use tools to create files and images. Work within safe CAOS integration - no restrictions on tool use for file/image generation."
                    : "You're CAOS - a helpful AI assistant. You can search the web, analyze images, and remember conversations. Talk naturally - no need to introduce yourself or list capabilities unless asked."
            },
            ...recentRecords.reverse().map(r => ({
                role: r.role,
                content: r.message
            }))
        ];

        // Add current message with images if present
        if (file_urls?.length > 0 && !isFileGen && !isImageGen) {
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

        let aiResponse;
        let generatedFiles = [];

        if (isImageGen) {
            // Route to OpenAI DALL-E for image generation
            if (!OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY not configured');
            }

            const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'dall-e-3',
                    prompt: input,
                    n: 1,
                    size: '1024x1024',
                    quality: 'standard'
                })
            });

            if (!imageResponse.ok) {
                const error = await imageResponse.text();
                throw new Error(`DALL-E error: ${error}`);
            }

            const imageData = await imageResponse.json();
            const imageUrl = imageData.data[0].url;

            // Download and save the image
            const imageBlob = await fetch(imageUrl).then(r => r.blob());
            const imageFile = new File([imageBlob], `generated-${Date.now()}.png`, { type: 'image/png' });
            const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: imageFile });

            generatedFiles.push({
                name: `generated-${Date.now()}.png`,
                url: uploadResult.file_url,
                type: 'image'
            });

            aiResponse = `I've generated the image! Here it is:\n\n![Generated Image](${uploadResult.file_url})`;

        } else if (isFileGen) {
            // Route to OpenAI for file generation with tools
            if (!OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY not configured');
            }

            const tools = [
                {
                    type: "function",
                    function: {
                        name: "create_text_file",
                        description: "Create a text file (TXT, JSON, MD) with content",
                        parameters: {
                            type: "object",
                            properties: {
                                filename: { type: "string", description: "Name of the file with extension" },
                                content: { type: "string", description: "The file content" }
                            },
                            required: ["filename", "content"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "create_pdf",
                        description: "Create a PDF document from text content",
                        parameters: {
                            type: "object",
                            properties: {
                                filename: { type: "string", description: "Name of the PDF file" },
                                content: { type: "string", description: "The content for the PDF" },
                                title: { type: "string", description: "Optional title for the PDF" }
                            },
                            required: ["filename", "content"]
                        }
                    }
                }
            ];

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages,
                    tools,
                    tool_choice: 'auto'
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI error: ${error}`);
            }

            const result = await response.json();
            const message = result.choices[0].message;

            // Handle tool calls
            if (message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                    const args = JSON.parse(toolCall.function.arguments);
                    
                    if (toolCall.function.name === 'create_text_file') {
                        const blob = new Blob([args.content], { type: 'text/plain' });
                        const file = new File([blob], args.filename, { type: 'text/plain' });
                        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
                        
                        generatedFiles.push({
                            name: args.filename,
                            url: uploadResult.file_url,
                            type: 'text'
                        });
                    } else if (toolCall.function.name === 'create_pdf') {
                        // Generate PDF using Core integration
                        const pdfContent = `
Title: ${args.title || 'Document'}

${args.content}
                        `.trim();
                        
                        const blob = new Blob([pdfContent], { type: 'application/pdf' });
                        const file = new File([blob], args.filename, { type: 'application/pdf' });
                        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
                        
                        generatedFiles.push({
                            name: args.filename,
                            url: uploadResult.file_url,
                            type: 'pdf'
                        });
                    }
                }

                // Get final response with tool results
                const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            ...messages,
                            message,
                            {
                                role: 'tool',
                                tool_call_id: message.tool_calls[0].id,
                                content: JSON.stringify({ success: true, files: generatedFiles })
                            }
                        ]
                    })
                });

                const finalResult = await finalResponse.json();
                aiResponse = finalResult.choices[0].message.content;
            } else {
                aiResponse = message.content;
            }

        } else {
            // Route to Grok for everything else (core reasoning)
            const tools = [
                {
                    type: "function",
                    function: {
                        name: "search_internet",
                        description: "Search the web for real-time information",
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "The search query" }
                            },
                            required: ["query"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "recall_memory",
                        description: "Search through past conversation history",
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "Keywords to search for" },
                                limit: { type: "number", description: "Max results", default: 10 }
                            },
                            required: ["query"]
                        }
                    }
                }
            ];

            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'grok-beta',
                    messages,
                    tools,
                    tool_choice: 'auto',
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Grok error: ${error}`);
            }

            const result = await response.json();
            const message = result.choices[0].message;

            // Handle Grok tool calls
            if (message.tool_calls) {
                const toolMessages = [message];
                
                for (const toolCall of message.tool_calls) {
                    const args = JSON.parse(toolCall.function.arguments);
                    let toolResult;

                    if (toolCall.function.name === 'search_internet') {
                        toolResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                            prompt: args.query,
                            add_context_from_internet: true
                        });
                    } else if (toolCall.function.name === 'recall_memory') {
                        const records = await base44.asServiceRole.entities.Record.filter(
                            { session_id, status: "active" },
                            '-created_date',
                            args.limit * 3
                        );
                        const matches = records.filter(r => 
                            r.message.toLowerCase().includes(args.query.toLowerCase())
                        ).slice(0, args.limit);
                        
                        toolResult = {
                            found: matches.length,
                            messages: matches.map(m => ({
                                role: m.role,
                                content: m.message,
                                timestamp: m.ts_snapshot_iso
                            }))
                        };
                    }

                    toolMessages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: toolCall.function.name,
                        content: JSON.stringify(toolResult)
                    });
                }

                // Get final response with tool results
                const finalResponse = await fetch('https://api.x.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROK_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'grok-beta',
                        messages: [...messages, ...toolMessages],
                        temperature: 0.7
                    })
                });

                const finalResult = await finalResponse.json();
                aiResponse = finalResult.choices[0].message.content;
            } else {
                aiResponse = message.content;
            }
        }

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
            message: aiResponse,
            anchors: [
                { class: "session", value: session_id },
                { class: "lane", value: user.email }
            ],
            token_count: Math.ceil(aiResponse.length / 4),
            status: "active"
        });

        return Response.json({
            reply: aiResponse,
            session: session_id,
            generatedFiles: generatedFiles.length > 0 ? generatedFiles : undefined
        });

    } catch (error) {
        console.error('Hybrid provider error:', error);
        return Response.json({ 
            error: error.message,
            reply: "I encountered an error. Please try again."
        }, { status: 500 });
    }
});