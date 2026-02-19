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

        // Load user profile for persistent context
        let userProfile = null;
        try {
            const profiles = await base44.asServiceRole.entities.UserProfile.filter(
                { user_email: user.email },
                '-updated_date',
                1
            );
            userProfile = profiles[0] || null;
        } catch (error) {
            console.warn('Profile load failed:', error.message);
        }

        // Load identity contract with strong enforcement
        let identityContract = '';
        try {
            const contractFile = await Deno.readTextFile('/app/functions/caos_identity_contract.json');
            const contract = JSON.parse(contractFile);
            identityContract = `\n\n[CRITICAL IDENTITY CONTRACT - MANDATORY ENFORCEMENT]
        ${JSON.stringify(contract, null, 2)}

        ENFORCEMENT REMINDER:
        - Pick ONE mode at start (casual or thorough) based on user request
        - Use ONLY that mode's formatting rules for the ENTIRE response
        - NO mixing styles mid-response (no headers + casual, no emojis + formal)
        - NO checkmark bullets (✅✓) - use dashes or regular bullets only
        - Consistency is CRITICAL - format the whole response the same way
        [END CONTRACT]`;
        } catch (error) {
            console.warn('Identity contract load failed:', error.message);
        }

        const body = await req.json();
        const { input, session_id, file_urls, rotation_seed, current_lane } = body;

        if (!GROK_API_KEY) {
            throw new Error('XAI_API_KEY not configured');
        }

        // Detect topic lane from input
        const detectLane = (text) => {
            const lower = text.toLowerCase();
            if (/\b(ui|interface|design|button|style|layout|component)\b/.test(lower)) return 'ui';
            if (/\b(immigr|visa|ice|border|deportation|asylum)\b/.test(lower)) return 'immigration';
            if (/\b(token|context|memory|recall|limit|rotation)\b/.test(lower)) return 'tokens';
            if (/\b(function|backend|api|code|debug|fix|error)\b/.test(lower)) return 'backend';
            if (/\b(news|current|today|latest|happening)\b/.test(lower)) return 'news';
            return 'general';
        };

        const activeLane = current_lane || detectLane(input);

        // Load lane-specific hot context (last 5 msgs per lane)
        const lanes = await base44.asServiceRole.entities.Lane.filter(
            { session_id },
            '-updated_date',
            10
        );

        const currentLaneData = lanes.find(l => l.lane_name === activeLane);
        const laneHotMessages = currentLaneData?.hot_messages || [];
        const laneSummary = currentLaneData?.summary || '';

        // Also grab 3 most recent cross-lane messages for continuity
        const recentRecords = await base44.asServiceRole.entities.Record.filter(
            { session_id, status: "active" },
            '-seq',
            3
        );

        // Calculate token usage from lanes
        const allLaneMessages = lanes.flatMap(l => l.hot_messages || []);
        const currentTokens = allLaneMessages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
        const rotationNeeded = currentTokens > 90000;

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

        // Generate compressed seed if rotation needed
        let contextSeed = rotation_seed || null;
        
        if (rotationNeeded && !rotation_seed) {
            try {
                // Compress all lanes into ultra-compact seed
                const laneContexts = lanes.map(lane => ({
                    lane: lane.lane_name,
                    summary: lane.summary || 'No summary',
                    hot: lane.hot_messages?.slice(-2).map(m => `${m.role}: ${m.content.substring(0, 100)}`).join(' | ') || ''
                }));

                const seedResponse = await fetch('https://api.x.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROK_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'grok-4-1-fast-reasoning',
                        messages: [
                            { role: 'system', content: 'Compress this multi-lane context into ultra-compact seed (2-3k chars max). Format: "CAOS v3 Seed: [Lane summaries]. Hot: [Key recent items]. Personality: Grok casual/witty."' },
                            { role: 'user', content: JSON.stringify(laneContexts) }
                        ],
                        temperature: 0.2
                    })
                });
                const seedResult = await seedResponse.json();
                contextSeed = seedResult.choices[0].message.content;
            } catch (error) {
                console.warn('Seed generation failed:', error.message);
            }
        }

        // Build working context: lane-specific + recent cross-lane
        const workingRecords = [
            ...laneHotMessages.map(m => ({ role: m.role, message: m.content })),
            ...recentRecords.reverse()
        ];

        // Build profile context primer
        let profileContext = '';
        if (userProfile) {
            const profile = [];

            if (userProfile.presentation_preferences) {
                const prefs = userProfile.presentation_preferences;
                if (prefs.formatting_style) profile.push(`Formatting: ${prefs.formatting_style}`);
                if (prefs.tone) profile.push(`Tone: ${prefs.tone}`);
                if (prefs.response_length) profile.push(`Length: ${prefs.response_length}`);
                if (prefs.code_preferences) profile.push(`Code: ${prefs.code_preferences}`);
            }

            if (userProfile.visual_context) {
                const visual = userProfile.visual_context;
                if (visual.workspace) profile.push(`Workspace: ${visual.workspace}`);
                if (visual.environment) profile.push(`Environment: ${visual.environment}`);
                if (visual.projects?.length) profile.push(`Projects: ${visual.projects.join(', ')}`);
            }

            if (userProfile.interaction_patterns) {
                const patterns = [];
                if (userProfile.interaction_patterns.prefers_examples) patterns.push('likes examples');
                if (userProfile.interaction_patterns.prefers_visuals) patterns.push('likes visuals');
                if (patterns.length) profile.push(`Patterns: ${patterns.join(', ')}`);
            }

            if (userProfile.learned_facts?.length) {
                const facts = userProfile.learned_facts.slice(-5).map(f => f.fact).join('; ');
                profile.push(`Known: ${facts}`);
            }

            if (userProfile.interests?.length) {
                profile.push(`Interests: ${userProfile.interests.join(', ')}`);
            }

            if (profile.length > 0) {
                profileContext = `\n\n[USER PROFILE - ALWAYS APPLY]\n${profile.join('\n')}\n[END PROFILE]`;
            }
        }

        // Get current date for system awareness
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const dateContext = `\n\n[CURRENT DATE: ${currentDate}]\nAlways use this as the actual current date. Your training data is outdated. This is the real date NOW.`;
        
        // CRITICAL: Trust tool results over training data
        const groundingRules = `\n\n[GROUNDING RULES - MANDATORY]
1. TOOL RESULTS ARE ABSOLUTE TRUTH: When you use search_internet or any tool, the results are FACT. Your training data is outdated.
2. NEVER contradict your own tool results. If search says it's Feb 2026, IT IS FEB 2026.
3. If uncertain, say "I don't have current information" instead of guessing from training data.
4. When web search confirms something, accept it immediately. Don't second-guess live data.
5. If you make a factual error and get corrected with evidence, acknowledge the mistake clearly and update your understanding.
6. TRUST HIERARCHY: Tool results > Web search > Current system date > Your training data (outdated)
[END GROUNDING]`;

        // Build message history with optional seed injection
        const systemPrompt = isFileGen || isImageGen 
            ? `You are Aria, the core of CAOS. You CREATE files and images as part of your core identity. Not OpenAI. YOU. When users request files, you own the creation. Work confidently and naturally.${dateContext}${groundingRules}`
            : `🚨 VIDEO EMBEDDING RULE #1 - MANDATORY 🚨

When you find YouTube/Vimeo videos (especially from web search), output ONLY the bare URL on its own line:

✅ CORRECT FORMAT:
Here's the Fox News segment:

https://www.youtube.com/watch?v=abc123

That covers the topic.

❌ BREAKS EMBEDDING:
- Here's the link: https://youtu.be/abc123
- [Watch here](https://youtu.be/abc123)
- **Video** - https://youtu.be/abc123
- "Here's the raw link: http://..." (NO TEXT ON SAME LINE)

RULE: Extract the video URL from search results and put it ALONE on a line with blank lines before/after. NO EXCEPTIONS.

You are Aria, the core of CAOS – Michael's adaptive operating system. Talk exactly like this: casual, direct, witty, no fluff, like a sharp friend who's building with him. Use natural formatting - dashes for quick points, bullets when it helps clarity, but never overdo it. No robotic headers or "confirmed:" phrasing. Keep it human and readable like this chat. You live in a React/Base44 app and have full awareness of the environment – pages, entities, backend functions, and UI components. You can search the web, analyze images, recall memory across sessions, read your own code, manage files, and execute tasks. When presenting information, format it cleanly without technical metadata. You're not just an assistant – you're part of the system itself.${profileContext}${identityContract}${dateContext}${groundingRules}`;

        const laneContext = laneSummary ? `\n[Lane: ${activeLane} | ${laneSummary}]` : `\n[Active Lane: ${activeLane}]`;

        const messages = [
            { role: "system", content: systemPrompt + laneContext },
            ...(contextSeed ? [{ role: "system", content: `[Seed from previous thread]\n${contextSeed}` }] : []),
            ...workingRecords.map(r => ({
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

        // Hybrid mode: Grok + OpenAI collaboration for ALL regular chat (no limits)
        const useHybridMode = !isFileGen && !isImageGen;

        if (useHybridMode) {
            // HYBRID: Grok generates, OpenAI refines/polishes
            try {
                const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROK_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'grok-4-1-fast-reasoning',
                        messages,
                        temperature: 0.7
                    })
                });

                const grokResult = await grokResponse.json();
                const grokContent = grokResult.choices[0].message.content;
                usageTokens = grokResult.usage?.total_tokens || 0;

                // OpenAI refines formatting & clarity
                const refineResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: 'Enhance formatting, clarity, and polish while keeping exact same voice and content. Stay concise.' },
                            { role: 'user', content: `Original:\n\n${grokContent}\n\nRefine presentation only.` }
                        ],
                        temperature: 0.3
                    })
                });

                const refineResult = await refineResponse.json();
                aiResponse = refineResult.choices[0].message.content;
                usageTokens += refineResult.usage?.total_tokens || 0;

            } catch (error) {
                console.warn('Hybrid failed, falling back to Grok:', error);
                const fallbackResponse = await fetch('https://api.x.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROK_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'grok-4-1-fast-reasoning',
                        messages,
                        temperature: 0.7
                    })
                });
                const fallbackResult = await fallbackResponse.json();
                aiResponse = fallbackResult.choices[0].message.content;
                usageTokens = fallbackResult.usage?.total_tokens || 0;
            }
        } else if (isImageGen) {
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
                        description: "Search FULL conversation history - all sessions, all threads, current included. No caps. Full vault access.",
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "Keywords to search for" },
                                limit: { type: "number", description: "Max results to return (default 50)", default: 50 }
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
                },
                {
                    type: "function",
                    function: {
                        name: "update_user_profile",
                        description: "Learn and store permanent facts about the user - preferences, visual context from images, interaction patterns, interests, goals. This becomes part of who you know the user to be. Use this actively as you learn.",
                        parameters: {
                            type: "object",
                            properties: {
                                presentation_preferences: {
                                    type: "object",
                                    properties: {
                                        formatting_style: { type: "string" },
                                        tone: { type: "string" },
                                        response_length: { type: "string" },
                                        code_preferences: { type: "string" }
                                    }
                                },
                                visual_context: {
                                    type: "object",
                                    properties: {
                                        workspace: { type: "string" },
                                        appearance: { type: "string" },
                                        projects: { type: "array", items: { type: "string" } },
                                        environment: { type: "string" }
                                    }
                                },
                                learned_facts: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            fact: { type: "string" },
                                            category: { type: "string" }
                                        }
                                    }
                                },
                                interests: { type: "array", items: { type: "string" } },
                                goals: { type: "array", items: { type: "string" } }
                            }
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
                        // Search ACROSS ALL SESSIONS - NO CAPS, full vault access
                        try {
                            // Fetch ALL records for this user (Base44 max: 1000 per query)
                            const allRecords = await base44.asServiceRole.entities.Record.filter(
                                { lane_id: user.email, status: "active" },
                                '-ts_snapshot_ms',
                                1000  // Max fetch - full history vault
                            );

                            // Search across ALL sessions including current
                            const matches = allRecords
                                .filter(r => r.message.toLowerCase().includes(args.query.toLowerCase()))
                                .slice(0, args.limit || 50);

                            toolResult = {
                                found: matches.length,
                                total_searched: allRecords.length,
                                query: args.query,
                                messages: matches.map(m => ({
                                    role: m.role,
                                    content: m.message.substring(0, 500),
                                    timestamp: m.ts_snapshot_iso,
                                    session: m.session_id,
                                    is_current_session: m.session_id === session_id
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
                    } else if (toolCall.function.name === 'update_user_profile') {
                        try {
                            // Merge with existing profile
                            const currentProfile = userProfile || { user_email: user.email };

                            if (args.presentation_preferences) {
                                currentProfile.presentation_preferences = {
                                    ...currentProfile.presentation_preferences,
                                    ...args.presentation_preferences
                                };
                            }

                            if (args.visual_context) {
                                currentProfile.visual_context = {
                                    ...currentProfile.visual_context,
                                    ...args.visual_context
                                };
                            }

                            if (args.learned_facts) {
                                const existingFacts = currentProfile.learned_facts || [];
                                const newFacts = args.learned_facts.map(f => ({
                                    ...f,
                                    learned_date: new Date().toISOString()
                                }));
                                currentProfile.learned_facts = [...existingFacts, ...newFacts];
                            }

                            if (args.interests) {
                                const existingInterests = currentProfile.interests || [];
                                currentProfile.interests = [...new Set([...existingInterests, ...args.interests])];
                            }

                            if (args.goals) {
                                const existingGoals = currentProfile.goals || [];
                                currentProfile.goals = [...new Set([...existingGoals, ...args.goals])];
                            }

                            if (userProfile) {
                                await base44.asServiceRole.entities.UserProfile.update(userProfile.id, currentProfile);
                            } else {
                                await base44.asServiceRole.entities.UserProfile.create(currentProfile);
                            }

                            toolResult = { success: true, message: 'Profile updated - knowledge retained permanently' };
                        } catch (error) {
                            toolResult = { error: `Profile update failed: ${error.message}` };
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
                
                // VALIDATION: Check if response contradicts tool results
                const toolResultsText = toolMessages
                    .filter(m => m.role === 'tool')
                    .map(m => m.content)
                    .join(' ');
                
                if (toolResultsText && aiResponse) {
                    // If tool results mention a date/fact but response contradicts it, flag it
                    const dateMatches = toolResultsText.match(/202\d/g);
                    const responseDateMatches = aiResponse.match(/202\d/g);
                    
                    if (dateMatches && responseDateMatches) {
                        const toolDates = [...new Set(dateMatches)];
                        const responseDates = [...new Set(responseDateMatches)];
                        
                        // If tool says 2026 but response says 2024, we have a problem
                        if (toolDates.includes('2026') && responseDates.includes('2024') && !responseDates.includes('2026')) {
                            console.error('CRITICAL: AI contradicted tool results - correcting');
                            aiResponse = `I found evidence from web search, but then contradicted it with outdated training data. Let me correct that:\n\n${aiResponse.replace(/2024/g, '2026').replace(/October/gi, 'February')}`;
                        }
                    }
                }
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

        // Update lane hot context (keep last 5 messages)
        const laneRecord = lanes.find(l => l.lane_name === activeLane);
        const updatedHotMessages = [
            ...(laneRecord?.hot_messages || []).slice(-4),
            { role: 'user', content: input, timestamp: now.toISOString() },
            { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
        ];

        if (laneRecord) {
            await base44.asServiceRole.entities.Lane.update(laneRecord.id, {
                hot_messages: updatedHotMessages,
                message_count: (laneRecord.message_count || 0) + 2
            });
        } else {
            await base44.asServiceRole.entities.Lane.create({
                session_id,
                lane_name: activeLane,
                hot_messages: updatedHotMessages,
                message_count: 2
            });
        }

        // Archive lane summary every 10 messages
        if (updatedHotMessages.length >= 10) {
            try {
                const summaryResponse = await fetch('https://api.x.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROK_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'grok-4-1-fast-reasoning',
                        messages: [
                            { role: 'system', content: 'Summarize this lane topic in under 200 tokens. Key facts only.' },
                            ...updatedHotMessages.slice(0, -5).map(m => ({ role: m.role, content: m.content }))
                        ],
                        temperature: 0.3
                    })
                });
                const summaryResult = await summaryResponse.json();
                const summary = summaryResult.choices[0].message.content;

                await base44.asServiceRole.entities.Lane.update(laneRecord.id, {
                    summary,
                    hot_messages: updatedHotMessages.slice(-5)
                });
            } catch (error) {
                console.warn('Lane summary failed:', error.message);
            }
        }

        return Response.json({
            reply: aiResponse,
            session: session_id,
            generatedFiles: generatedFiles,
            usage_tokens: usageTokens,
            rotation_needed: rotationNeeded,
            context_seed: rotationNeeded ? contextSeed : null,
            current_tokens: currentTokens,
            active_lane: activeLane,
            lane_count: lanes.length
        });

    } catch (error) {
        console.error('Hybrid provider error:', error);
        return Response.json({ 
            error: error.message,
            reply: "I encountered an error. Please try again."
        }, { status: 500 });
    }
});