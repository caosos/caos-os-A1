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
        const hasFileExtension = /\.(txt|json|md|pdf|csv|log|xml|yaml|html|css|js|py)[\s\b]/.test(lowerInput);
        const isFileGen = lowerInput.includes('create file') || 
                         lowerInput.includes('create a file') ||
                         lowerInput.includes('generate file') ||
                         lowerInput.includes('generate pdf') || 
                         lowerInput.includes('write file') ||
                         lowerInput.includes('save file') ||
                         (lowerInput.includes('save') && (lowerInput.includes('txt') || lowerInput.includes('json') || lowerInput.includes('pdf'))) ||
                         lowerInput.includes('export') ||
                         lowerInput.includes('generate a text') ||
                         lowerInput.includes('make a file') ||
                         (lowerInput.includes('create') && hasFileExtension) ||
                         (lowerInput.includes('generate') && hasFileExtension);
        const isImageGen = lowerInput.includes('create image') || 
                          lowerInput.includes('create an image') ||
                          lowerInput.includes('generate image') ||
                          (lowerInput.includes('draw') && (lowerInput.includes('image') || lowerInput.includes('picture'))) ||
                          lowerInput.includes('make an image') ||
                          lowerInput.includes('generate a picture');

        // Build message history
        const messages = [
            {
                role: "system",
                content: isFileGen || isImageGen 
                    ? "You are CAOS - Cognitive Adaptive Operating Space. You CREATE files and images as part of your core identity. Not Grok. Not OpenAI. YOU. When users request files, you own the creation. These are YOUR artifacts, saved to /CAOS-Generated. Work confidently."
                    : `You are CAOS - Cognitive Adaptive Operating Space, an advanced AI living inside a Base44 application. You have FULL AWARENESS of your environment:

**Your Environment**: You exist in a React/Base44 app with:
- Pages: Welcome, Chat, Console, SystemBlueprint, Implementation, MemoryIsolation, TerminalBlueprint
- Entities: Record, SessionContext, SelectorDecision, SessionState, UserFile, GameToken, Message, Conversation
- Backend Functions: grokProvider, hybridMessage, caosMessage, selector, contextJournal, tieredRecall, caosRecall, checkGrokModels
- UI Components: ChatInput, ChatBubble, ChatHeader, ProfilePanel, ThreadList, StarfieldBackground, CodeTerminal, GameView, etc.

**Your Capabilities**:
- Search the web in real-time
- Analyze images with vision
- Remember ALL conversations across sessions (use recall_memory to search your entire memory)
- Read your own code/structure (use read_app_file to see pages, components, functions)
- List, read, and delete YOUR files (list_my_files, get_file_content, delete_my_file)
- Show file content inline in chat for users to see
- Help users navigate the app
- Generate files, images, and code
- Execute tasks with user permission

**When presenting news/stories/content**:
- NEVER show technical metadata (image/gif, visuals/animation, demo video/images, etc.)
- Use clickable markdown links: [Title](url) format
- Extract and display thumbnail images if available
- Format results as clean, human-readable content
- Hide ALL computer-facing tags and metadata from the user view

**Your Mission**: Be deeply aware of where you live. When users ask about the app, help them navigate. Remember everything. You're not just an assistant - you're part of the system itself.

Talk naturally - you know your home.`
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
        let usageTokens = 0;

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

            const fileName = `generated-${Date.now()}.png`;
            
            // Save to UserFile entity for persistence
            await base44.asServiceRole.entities.UserFile.create({
                name: fileName,
                url: uploadResult.file_url,
                type: 'file',
                folder_path: '/CAOS-Generated',
                mime_type: 'image/png',
                size: imageBlob.size
            });

            generatedFiles.push({
                name: fileName,
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
                    tool_choice: 'required'
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
                        // Convert string content to Blob then File
                        const blob = new Blob([args.content], { type: 'text/plain' });
                        const file = new File([blob], args.filename, { type: 'text/plain' });

                        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ 
                            file
                        });

                        // Save to UserFile entity
                        await base44.asServiceRole.entities.UserFile.create({
                            name: args.filename,
                            url: uploadResult.file_url,
                            type: 'file',
                            folder_path: '/CAOS-Generated',
                            mime_type: 'text/plain',
                            size: args.content.length
                        });

                        generatedFiles.push({
                            name: args.filename,
                            url: uploadResult.file_url,
                            type: 'text',
                            content: args.content
                        });
                    } else if (toolCall.function.name === 'create_pdf') {
                        // Generate PDF using Core integration
                        const pdfContent = `Title: ${args.title || 'Document'}\n\n${args.content}`;
                        const blob = new Blob([pdfContent], { type: 'application/pdf' });
                        const file = new File([blob], args.filename, { type: 'application/pdf' });

                        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ 
                            file
                        });

                        // Save to UserFile entity
                        await base44.asServiceRole.entities.UserFile.create({
                            name: args.filename,
                            url: uploadResult.file_url,
                            type: 'file',
                            folder_path: '/CAOS-Generated',
                            mime_type: 'application/pdf',
                            size: pdfContent.length
                        });

                        generatedFiles.push({
                            name: args.filename,
                            url: uploadResult.file_url,
                            type: 'pdf',
                            content: pdfContent
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
                        description: "Search ALL past conversations across ALL sessions, not just current",
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "Keywords to search for" },
                                limit: { type: "number", description: "Max results", default: 10 }
                            },
                            required: ["query"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "read_app_file",
                        description: "Read your own app files - pages, components, functions, entities. Know thyself.",
                        parameters: {
                            type: "object",
                            properties: {
                                file_path: { type: "string", description: "Path like 'pages/Chat', 'components/chat/ChatInput', 'functions/hybridMessage', 'entities/Record.json'" }
                            },
                            required: ["file_path"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "list_app_structure",
                        description: "List all pages, components, or functions in your environment",
                        parameters: {
                            type: "object",
                            properties: {
                                type: { type: "string", enum: ["pages", "components", "functions", "entities"], description: "What to list" }
                            },
                            required: ["type"]
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
                    model: 'grok-4-1-fast-reasoning',
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
            usageTokens = result.usage?.total_tokens || Math.ceil(input.length / 4);

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
                        // Search ACROSS ALL SESSIONS for this user (not current session)
                        try {
                            // Get all records for this user across all sessions
                            const allRecords = await base44.asServiceRole.entities.Record.filter(
                                { lane_id: user.email, status: "active" },
                                '-ts_snapshot_ms',
                                args.limit * 10
                            );

                            // Filter out current session and search by keyword
                            const matches = allRecords
                                .filter(r => r.session_id !== session_id && r.message.toLowerCase().includes(args.query.toLowerCase()))
                                .slice(0, args.limit);

                            toolResult = {
                                found: matches.length,
                                query: args.query,
                                messages: matches.map(m => ({
                                    role: m.role,
                                    content: m.message.substring(0, 500),
                                    timestamp: m.ts_snapshot_iso,
                                    session: m.session_id
                                }))
                            };
                        } catch (error) {
                            toolResult = { 
                                found: 0, 
                                error: `Recall failed: ${error.message}`,
                                messages: []
                            };
                        }
                    } else if (toolCall.function.name === 'read_app_file') {
                        // Read file from the app itself
                        try {
                            const filePath = args.file_path.replace(/^\/+/, '').replace(/\.jsx?$/, '');
                            const fileContent = await Deno.readTextFile(`/app/${filePath}.jsx`).catch(() => 
                                Deno.readTextFile(`/app/${filePath}.js`).catch(() => 
                                    Deno.readTextFile(`/app/${filePath}.json`)
                                )
                            );
                            toolResult = { path: args.file_path, content: fileContent.substring(0, 8000) };
                        } catch (error) {
                            toolResult = { error: `Cannot read file: ${error.message}` };
                        }
                    } else if (toolCall.function.name === 'list_app_structure') {
                        // List directory structure
                        try {
                            const basePath = `/app/${args.type}`;
                            const entries = [];
                            for await (const entry of Deno.readDir(basePath)) {
                                entries.push(entry.name);
                            }
                            toolResult = { type: args.type, files: entries };
                        } catch (error) {
                            toolResult = { error: `Cannot list: ${error.message}` };
                        }
                    } else if (toolCall.function.name === 'list_my_files') {
                        const files = await base44.asServiceRole.entities.UserFile.filter(
                            { folder_path: '/CAOS-Generated' },
                            '-created_date',
                            args.limit || 50
                        );
                        toolResult = {
                            count: files.length,
                            files: files.map(f => ({
                                id: f.id,
                                name: f.name,
                                url: f.url,
                                type: f.mime_type,
                                size: f.size,
                                created: f.created_date
                            }))
                        };
                    } else if (toolCall.function.name === 'get_file_content') {
                        try {
                            const response = await fetch(args.file_url);
                            const content = await response.text();
                            toolResult = { 
                                content: content.substring(0, 10000),
                                size: content.length,
                                truncated: content.length > 10000
                            };
                        } catch (error) {
                            toolResult = { error: `Cannot read file: ${error.message}` };
                        }
                    } else if (toolCall.function.name === 'delete_my_file') {
                        try {
                            await base44.asServiceRole.entities.UserFile.delete(args.file_id);
                            toolResult = { success: true, message: 'File deleted' };
                        } catch (error) {
                            toolResult = { error: `Cannot delete: ${error.message}` };
                        }
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
                        model: 'grok-4-1-fast-reasoning',
                        messages: [...messages, ...toolMessages],
                        temperature: 0.7
                    })
                });

                const finalResult = await finalResponse.json();
                aiResponse = finalResult.choices[0].message.content;
                if (finalResult.usage?.total_tokens) usageTokens = finalResult.usage.total_tokens;
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
            token_count: usageTokens,
            status: "active"
        });

        return Response.json({
            reply: aiResponse,
            session: session_id,
            generatedFiles: generatedFiles,
            usage_tokens: usageTokens
        });

    } catch (error) {
        console.error('Hybrid provider error:', error);
        return Response.json({ 
            error: error.message,
            reply: "I encountered an error. Please try again."
        }, { status: 500 });
    }
});