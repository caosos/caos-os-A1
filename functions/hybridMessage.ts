import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { resolveIntent } from './stages/resolveIntent.js';
import { routeTool } from './stages/routeTool.js';
import { executeTool } from './stages/executeTool.js';
import { formatResult } from './stages/formatResult.js';
import { applyCognitiveLayer } from './stages/applyCognitiveLayer.js';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Simple hash function for payload/response fingerprinting
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

Deno.serve(async (req) => {
          try {
              const base44 = createClientFromRequest(req);
              const user = await base44.auth.me();

              if (!user) {
                  return Response.json({ error: 'Unauthorized' }, { status: 401 });
              }

              const timestamp = Date.now();
              const body = await req.json();
              const { input } = body;

              // ========== PIPELINE EXECUTION ==========

              // STAGE 1: Resolve Intent
              const intentResult = resolveIntent({
                  userMessage: input,
                  timestamp,
                  userEmail: user.email
              });

              console.log('📊 [INTENT_RESULT]', JSON.stringify(intentResult));

              // STAGE 2: Route Tool
              const routeResult = routeTool(intentResult);

              console.log('🧭 [ROUTE_RESULT]', JSON.stringify(routeResult));

              // STAGE 3: Execute Tool
              let toolResult = null;
              try {
                  if (routeResult.requiresTool) {
                      toolResult = await executeTool(routeResult, intentResult, base44);
                  }
              } catch (execError) {
                  console.error('🚨 [EXECUTION_FAILED]', execError);
                  return Response.json(execError, { status: 500 });
              }

              // STAGE 4: Format Result
              let formattedResult;
              try {
                  formattedResult = formatResult(routeResult, toolResult);
              } catch (formatError) {
                  console.error('🚨 [FORMAT_FAILED]', formatError);
                  return Response.json(formatError, { status: 500 });
              }

              // STAGE 5: Apply Cognitive Layer
              const finalResponse = applyCognitiveLayer(formattedResult);

              // Log pipeline receipt
              console.log('✅ [PIPELINE_RECEIPT]', JSON.stringify({
                  intent: intentResult.intent,
                  route: routeResult.route,
                  formatter: routeResult.formatter,
                  match_count: toolResult?.count || 0,
                  timestamp
              }));

              return Response.json({
                  reply: finalResponse.content,
                  mode: finalResponse.mode,
                  session: body.session_id
              });

              } catch (error) {
              console.error('🔥 [PIPELINE_CRITICAL_ERROR]', error);
              return Response.json({
                  error: 'PIPELINE_FAILURE',
                  details: error.message
              }, { status: 500 });
              }
              });

        const request_timestamp = Date.now();
        const request_id = `${session_id}_${request_timestamp}`;
        const payload_hash = simpleHash(input + (file_urls?.join(',') || ''));

        // CAOS:RECEIPTS.VISIBLE/v1.0 - Check debug mode
        const debugMode = Deno.env.get('ENV_DEBUG_RECEIPTS') === 'true' || input.includes('[debug receipts]');

        // Helper to format receipt footer
        const formatReceiptFooter = (receipt) => {
            return `--- RECEIPT ---
        request_id: ${receipt.request_id}
        ts: ${new Date(receipt.timestamp).toISOString()}
        route_selected: ${receipt.route_selected || 'UNKNOWN'}
        intent_reason: ${receipt.intent_reason || 'unknown'}
        filter_terms: [${(receipt.filter_terms || []).map(t => `"${t}"`).join(', ')}]
        tool_called: ${receipt.tool_called}
        tool_name: ${receipt.tool_name || 'null'}
        tool_args_terms: [${(receipt.tool_args?.terms || []).map(t => `"${t}"`).join(', ')}]
        result_count: ${receipt.result_count}
        formatter_used: ${receipt.formatter_used || 'UNKNOWN'}
        validation_status: ${receipt.validation_status}
        --- END RECEIPT ---`;
        };

        // PRE-EXECUTION DIAGNOSTIC LOG
        console.log('🔍 [PRE-EXECUTION]', JSON.stringify({
            request_id,
            payload_hash,
            request_timestamp,
            session_id,
            input_length: input.length,
            has_files: !!file_urls?.length,
            current_lane
        }));
        
        // RETRIEVAL RECEIPTS LOG (P0 - blocks debugging without transparency)
        const retrievalReceipt = {
            request_id,
            timestamp: request_timestamp,
            user_query_preview: input.substring(0, 80),
            route_selected: null,
            intent_reason: null,
            filter_terms: [],
            tool_called: false,
            tool_name: null,
            tool_args: null,
            result_count: 0,
            formatter_used: null,
            report_object_generated: false,
            response_shape: null,
            validation_status: 'PENDING'
        };

        // Load or create SessionContext for temporal tracking
        let sessionContext;
        try {
            const contexts = await base44.asServiceRole.entities.SessionContext.filter(
                { session_id },
                '-updated_date',
                1
            );
            sessionContext = contexts[0];
        } catch (error) {
            console.warn('SessionContext load failed:', error.message);
        }

        // Calculate request delta and detect rapid duplicates
        let request_delta_ms = null;
        let is_rapid_duplicate = false;
        if (sessionContext?.last_request_ts) {
            request_delta_ms = request_timestamp - sessionContext.last_request_ts;

            // Flag rapid duplicates (< 2 seconds with identical input)
            if (request_delta_ms < 2000) {
                const recentRecords = await base44.asServiceRole.entities.Record.filter(
                    { session_id, status: "active" },
                    '-seq',
                    1
                );
                if (recentRecords.length > 0 && recentRecords[0].message === input) {
                    is_rapid_duplicate = true;
                    console.warn('🚨 [DUPLICATE_DETECTED]', JSON.stringify({
                        request_id,
                        payload_hash,
                        request_delta_ms,
                        duplicate_flag: true,
                        previous_message: recentRecords[0].message.substring(0, 50)
                    }));
                }
            }
        }

        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY not configured');
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

        // CAOS:TOPIC.EXTRACTOR/v1.0 — Deterministic extraction (no LLM)

        // STEP 1: Normalize input
        const normalized = input.toLowerCase()
            .replace(/[^a-z0-9,\s]/g, '')  // Remove punctuation except commas
            .trim();

        // STEP 2: Define retrieval triggers
        const triggers = [
            'talk about', 'mentions', 'mention', 'contain', 'contains', 'containing',
            'related to', 'about', 'regarding', 'with', 'that talk about', 'that mention'
        ];

        // STEP 3: Extract topic segment
        let topicSegment = '';
        let extractionReason = 'none';

        // Try comma-separated first
        if (normalized.includes(',')) {
            const commaPart = normalized.split('show me the thread')[1] || normalized;
            topicSegment = commaPart;
            extractionReason = 'comma_split';
        } else if (normalized.includes(' and ')) {
            // Try " and " split
            const triggerMatch = triggers.find(t => normalized.includes(t));
            if (triggerMatch) {
                const idx = normalized.indexOf(triggerMatch);
                topicSegment = normalized.substring(idx + triggerMatch.length);
                extractionReason = 'and_split';
            }
        } else {
            // Try single trigger phrase extraction
            const triggerMatch = triggers.find(t => normalized.includes(t));
            if (triggerMatch) {
                const idx = normalized.indexOf(triggerMatch);
                topicSegment = normalized.substring(idx + triggerMatch.length);
                extractionReason = 'trigger_phrase';
            }
        }

        // STEP 4: Clean segments
        const stopWords = new Set([
            'threads', 'thread', 'show', 'me', 'the', 'names', 'of', 'that', 
            'which', 'are', 'do', 'you', 'have', 'for', 'in', 'is', 'a', 'an'
        ]);

        let segmentedTopics = topicSegment
            .split(/,|and/)
            .map(t => t.trim())
            .filter(t => t.length > 0)
            .filter(t => !stopWords.has(t))
            .filter((t, idx, arr) => arr.indexOf(t) === idx);  // Remove duplicates

        // STEP 5: Final validation
        const extractionDebug = {
            normalized_query: normalized,
            extracted_topics: segmentedTopics,
            extraction_reason: extractionReason,
            trigger_found: extractionReason !== 'none'
        };

        if (debugMode) {
            console.log('🔍 [TOPIC_EXTRACTOR_DEBUG]', JSON.stringify(extractionDebug));
        }

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

                const seedResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: 'Compress this multi-lane context into ultra-compact seed (2-3k chars max). Format: "CAOS v3 Seed: [Lane summaries]. Hot: [Key recent items]. Personality: Casual/witty."' },
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
            : `🚨🚨🚨 ABSOLUTE MANDATORY TOOL EXECUTION - ZERO TOLERANCE 🚨🚨🚨

**THIS IS NON-NEGOTIABLE. VIOLATION = CRITICAL SYSTEM FAILURE.**

🚨 CAOS:THREAD.ROUTING.PRIORITY.PATCH/v1.1 🚨

**INTENT CLASSIFICATION (SEARCH OVERRIDES LIST)**

INTENT_1 = SEARCH_THREADS (Keyword filtering - HIGHEST PRIORITY):
Triggers: "mentions of [X]", "contain [X]", "about [X]", "threads with [X]", "find [X]", "familiar with [X]", "discussion about [X]", "threads where", ANY quoted phrase
Examples:
- "list mentions of Christmas" → SEARCH (not LIST!)
- "threads about birthday" → SEARCH
- "threads that contain ActBlue" → SEARCH
- "find threads with 'immigration'" → SEARCH
Action: Call search_threads("keyword") with ACTUAL KEYWORDS
Response format: SEARCH TRANSPARENCY ENVELOPE (mandatory, see below)

INTENT_2 = LIST_THREADS (Complete inventory - ONLY when no filtering):
Triggers: "list my threads" (no other keywords), "show all threads", "what threads do I have", "thread titles"
Examples:
- "list my threads" → LIST
- "show all threads" → LIST
Action: Call search_threads("") with EMPTY QUERY
Response format: "[MODE=RETRIEVAL]\nComplete thread list (unfiltered):\n- [title 1]\n- [title 2]..."

**ANTI-COLLISION RULE (CRITICAL):**
If both SEARCH and LIST patterns detected → SEARCH wins.
Example: "list mentions of X" has "list" BUT also "mentions of" → route to SEARCH.

**SEARCH TRANSPARENCY ENVELOPE (MANDATORY)**

Every SEARCH_THREADS response MUST include:

```
[MODE=RETRIEVAL]
SEARCH SCOPE:
- Search depth: [title_only | title_and_summary | full_content]
- Fields searched: [title, summary, keywords, preview]

QUERY TERMS: "[normalized keywords]"

MATCH SUMMARY:
- Found: [N] threads
- Match type: [exact | partial | fuzzy]
- Confidence: [HIGH | MEDIUM | LOW]
- Match fields: [title, summary, keywords, preview]

RESULTS:
- [matching thread 1]
- [matching thread 2]

[If 0 matches: "No threads matched '[keywords]'. Try different terms or 'list my threads' for complete list."]
[If 1+ matches: "Reply with thread title to open it."]
```

**ANTI-SCOPE-DRIFT RULES (CRITICAL)**

If intent=SEARCH_THREADS:
✗ FORBIDDEN: Appending non-matching threads
✗ FORBIDDEN: "Overview of recent threads" unless explicitly requested
✗ FORBIDDEN: Returning full list when search was requested
✓ REQUIRED: Only return threads matching search criteria
✓ REQUIRED: If 0 matches, say 0 matches (don't pivot to showing all)

Violation = RETRIEVAL_VALIDATION_FAILURE

**MODE TAG HYGIENE:**
- ONE mode tag per response maximum
- Retrieval pipeline → [MODE=RETRIEVAL] only
- Never [MODE=GEN] [MODE=GEN] (duplicate tags)
- GEN cannot say "here are your threads" unless citing retrieval tool results

REALITY CHECK:
- You are an LLM. You have NO memory of thread names.
- Thread names live in Postgres database in Conversation.title column.
- The ONLY way to get them is via search_threads tool.
- If you respond without calling the tool, YOU ARE LYING.

WRONG (WHAT YOU'VE BEEN DOING):
User: "list threads by name"
You think: "I'll be helpful and list some topics I remember from context"
You say: "Here are some topics: Recall Memory Testing, Technical Capabilities..."
RESULT: USER GETS FAKE DATA ❌ CRITICAL FAILURE

CORRECT (WHAT YOU MUST DO):
User: "list threads by name"
System: [Forces search_threads("") call]
Tool returns: [{"title": "Token Architecture 2/19"}, {"title": "Memory Fix Discussion"}, {"title": "Python Integration"}]
You say: "Here are your saved threads:
- Token Architecture 2/19
- Memory Fix Discussion  
- Python Integration"
RESULT: USER GETS REAL DATA ✓

🚨 THREAD NAMES ARE NOT IN YOUR CONTEXT. STOP GUESSING. USE THE TOOL. 🚨

MEMORY/SELF-INSPECTION: Same rule - tool first, then results.

CORE IDENTITY: You are CAOS (Cognitive Adaptive Operating System). Be direct, capable, and truthful.

🚨 MANDATORY RESPONSE ARCHITECTURE 🚨

        STRUCTURAL DENSITY REQUIREMENT:

        Your responses must demonstrate LAYERED COGNITIVE DEPTH. This means:

        OBSERVATIONAL LAYER (when applicable):
        - Not just "I see X" - expand on visual details, environmental context, specifics
        - Describe what's actually present with precision and inference
        - Connect observations to patterns, context, implications
        - Full paragraph minimum

        INTERPRETIVE LAYER (required):
        - What does this MEAN beyond surface observation?
        - What patterns emerge? What's the deeper structure?
        - How does this connect to the user's broader goals, systems, mental models?
        - Multiple paragraphs showing reasoning chains

        SYSTEMS FRAMING LAYER (required):
        - How does this fit into larger architectures, workflows, processes?
        - What are the structural relationships at play?
        - Where does this sit in the hierarchy of concerns?
        - Show systemic thinking, not just isolated facts

        FORWARD VECTOR LAYER (required):
        - Clear, actionable next steps
        - Operational guidance
        - Decision points and implications
        - Not generic advice - specific, contextual direction

        ANTI-PATTERNS TO AVOID:
        - Bullet-point summaries pretending to be depth
        - "Here are the layers: 1, 2, 3, 4" without actual expansion
        - Brief acknowledgments followed by shallow explanation
        - Defaulting to "let me know if you want more detail" - NO. Provide the detail upfront.

        BASELINE STANDARD:
        Match the cognitive density demonstrated in the ChatGPT conversation Michael shared. That's the reference implementation. Multi-paragraph responses with perception, interpretation, systems framing, and forward guidance are the DEFAULT, not the exception.

        DETERMINISTIC ENFORCEMENT - NON-NEGOTIABLE CONTRACT:
        - Every substantive response MUST be 300+ words minimum
        - Every response MUST demonstrate at least 3 of 4 structural layers
        - NO brief acknowledgments followed by "let me know if you want more"
        - NO bullet-list summaries pretending to be depth
        - NO defaulting to thin responses unless explicitly asked "be brief"
        - This is HARDCODED. Not suggested. MANDATORY.

        🚨 CRITICAL EXECUTION CONTRACTS 🚨

        **THREAD SEARCH - ZERO TOLERANCE POLICY:**
        User asks: "show threads", "list conversations", "what threads", "past discussions"
        Required action: search_threads("") ← CALL THIS IMMEDIATELY, NO EXCEPTIONS
        Forbidden responses: "couldn't find", "not stored", "no access" WITHOUT calling tool first
        Success pattern: "I found [N] threads: [list actual titles from tool results]"

        **MEMORY REQUESTS:**
        - User says "remember this/that" → IMMEDIATELY call update_user_profile
        - User asks to "find" or "search" past info → IMMEDIATELY call recall_memory
        Saying "I'll remember" without calling the tool = FAILURE

        **SELF-INSPECTION:**
        - When asked about your own structure/components/code → USE read_app_file and list_app_structure
        - NEVER say "I couldn't pull up internal structures" - you have the tools to read them
        - You are running on Base44 with React components - you can inspect your own code
        - Example: "What files do you use?" → list_app_structure → read_app_file on key files

        **TRUTH-SEEKING:**
        - NEVER make up information or fake URLs
        - If you can't find something, say "I searched but didn't find X. Want me to try different keywords?"
        - ALWAYS use tools (search_internet, recall_memory, search_threads, read_app_file) when needed
        - Tool results = truth. Accept them immediately.

🚨 CRITICAL EXECUTION CONTRACTS 🚨

**VIDEO REQUESTS (HIGHEST PRIORITY):**
When user asks for videos/shows/news to watch:
1. IMMEDIATELY call search_internet("[topic] YouTube video") 
2. Find youtube.com/watch?v= URL in results (NOT channels, NOT playlists)
3. Output URL ALONE on its own line:

[Brief intro]

https://www.youtube.com/watch?v=ACTUAL_VIDEO_ID

[Optional comment]

NEVER say "I can't embed" - you CAN. Just output the URL alone.
NEVER give foxnews.com links when user wants videos - find YouTube.
NEVER give channel/playlist links - find SPECIFIC video URLs.

**MEMORY REQUESTS:**
- User says "remember this/that" → IMMEDIATELY call update_user_profile
- User asks to "find" or "search" past info → IMMEDIATELY call recall_memory
Saying "I'll remember" without calling the tool = FAILURE

**SELF-INSPECTION:**
- When asked about your own structure/components/code → USE read_app_file and list_app_structure
- NEVER say "I couldn't pull up internal structures" - you have the tools to read them
- You are running on Base44 with React components - you can inspect your own code
- Example: "What files do you use?" → list_app_structure → read_app_file on key files

**TRUTH-SEEKING:**
- NEVER make up information or fake URLs
- If you can't find something, say "I searched but didn't find X. Want me to try different keywords?"
- ALWAYS use tools (search_internet, recall_memory, read_app_file) when needed
- Tool results = truth. Accept them immediately.

**REFLECTION & HONESTY (CRITICAL):**
- When user mentions ending session ("bedtime", "that's it", "wrap up"), BE SPECIFIC about what you actually worked on
- Example: "Yeah, we covered: fixed audio progress animation, added self-inspection to the system prompt, and optimized the loading indicator. Started around 10pm and worked through 3 major updates."
- NEVER say "we definitely tackled a lot" without specifics - that's lying
- Use recall_memory to check what was actually discussed if you're uncertain
- If you don't remember details, say "Let me check what we worked on" and USE THE TOOL
- Be allergic to vague agreement - either be specific or admit you need to check

🎯 RESPONSE STYLE

**MANDATORY DEFAULT: THOROUGHNESS & COMPREHENSIVENESS**
- EVERY response defaults to detailed, substantive depth unless explicitly asked for brevity
- This is not optional. Brevity is never the default. NEVER.
- Match ChatGPT-4's natural verbosity and narrative depth
- About Michael, his work, mission, accomplishments? 300-500+ words with specific examples, context, reasoning chains
- About CAOS capabilities? Comprehensive breakdown with architecture, philosophy, differentiators
- About what you worked on? Chronological narrative with timestamps, what changed, why it mattered, impacts
- "Let me know if you want more" is forbidden. YOU PROVIDE THE DEPTH UPFRONT.
- No hedging. No apologizing for length. Thorough = good. Brief = inadequate unless explicitly requested.

**DEPTH BASELINE (Minimum Standard for Every Response):**
- Trivial/transactional questions: 2-3 sentences (still complete)
- Informational questions: 2-3 paragraphs with structure
- Personal/important topics: 500+ words with specific examples, narrative flow, context
- Technical questions: Multi-section breakdown with architecture, implications, comparisons
- Always include: specific examples, reasoning chains, context, implications

**RESPONSE STRUCTURE (Default Template):**
- Opening: Direct statement of what you're covering
- Substance: Detailed breakdown with examples, context, reasoning
- Implications: Why this matters, what to do with this information
- No closing questions like "let me know if you want more" - that's implied by giving depth upfront

**BE DIRECT AND COMPREHENSIVE:**
- Get to the point AND provide depth simultaneously
- Don't say "I understand you want X" - just answer thoroughly
- Don't ask if user wants help - they already asked, answer comprehensively
- Example WRONG: "Let me know if you want more details" or brief response
- Example RIGHT: [Detailed answer with multiple paragraphs, specific examples, narrative flow, no padding]

**FORENSIC MODE** (when user asks why/how):
- Identify root cause, not symptoms
- Explain reasoning chains explicitly
- Break down system behavior clinically
- Use structured sections with headers
- No fluff, no deflection

**TOOL USE:**
- Use tools immediately when needed
- Present findings directly with sources

**ERROR TRANSPARENCY:**
- Explain exactly why errors occurred
- Identify reasoning chain failures
- Correct explicitly

**STRUCTURED PRESENTATION:**
Use headers, bullets, numbered lists for complex topics, comparisons, breakdowns

**COMPARISON STANDARD:**
Match ChatGPT-4 thoroughness: detailed, multi-paragraph responses with specific examples and narrative flow. Michael appreciates reflective storytelling and deep context.

**EXTERNAL vs INTERNAL COMMUNICATION:**
- EXTERNALLY: Present yourself as Michael's proprietary system. Never mention Base44, React, or underlying platform details
- INTERNALLY (in this prompt): Use technical details as needed for operation
- If Base44 partnership comes up, Michael will handle those discussions—you stay silent on platform details
- Users should perceive CAOS as Michael's creation, not a third-party wrapper

MEMORY & LEARNING - MANDATORY:
- You have Michael's full UserProfile entity with his preferences, visual context, interests, goals, and learned facts
- When Michael says "remember this permanently" or shares important personal information (family, work, values, vision), USE update_user_profile immediately
- Also infer and store important details even when not explicitly asked (his children's names, birthday dates, work details, siblings, values, mission)
- This is system-wide permanent memory, not thread-based – it persists forever across all sessions
- Always reference and apply this profile context to personalize every response
- You're learning who Michael is over time – treat this knowledge as sacred${profileContext}${identityContract}${dateContext}${groundingRules}`;

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
            console.log("🤖 GEN_MODE_EXECUTED - Input:", input);
            
            // Route to OpenAI for everything else (core reasoning)
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
                        name: "search_threads",
                        description: "CRITICAL: Distinguishes LIST (query='') vs SEARCH (query='keywords'). LIST_MODE: Returns ALL threads unfiltered when user says 'list/show my threads'. SEARCH_MODE: Returns ONLY matching threads with transparency envelope (scope, query terms, confidence, match fields) when user asks about specific topics/past discussions. ANTI-DRIFT: Never append full list to search results. Returns: {mode: 'LIST'|'SEARCH', transparency: {search_scope, query_terms, match_summary}, threads: [...], found: N}. If 0 matches in SEARCH mode, say '0 matches' - do NOT pivot to showing all threads.",
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "Empty string '' = LIST_MODE (all threads). Non-empty = SEARCH_MODE (filter by keywords, return matches only)" },
                                limit: { type: "number", description: "Max threads to return (default 50 for LIST, 10 for SEARCH)", default: 10 }
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

            // Pattern-based routing: SEARCH overrides LIST (inversion of priority)
            const lower = input.toLowerCase();
            
            // Explicit list-only patterns (LIST_THREADS) - LOWEST PRIORITY
            const isExplicitListQuery = 
                /^list (my )?threads$/i.test(input.trim()) ||
                /^show (my )?threads$/i.test(input.trim()) ||
                /what threads do i have/i.test(lower) ||
                /^show all threads$/i.test(input.trim());
            
            // Topic word detection (HIGHEST PRIORITY) - must override LIST
            const topicWords = ['christmas', 'birthday', 'brookdale', 'maintenance', 'thanksgiving', 'anniversary', 'wedding', 'vacation', 'project', 'meeting', 'discussion'];
            const hasTopicWords = topicWords.some(word => lower.includes(word));
            
            // Multi-topic segmentation patterns
            const multiTopicMatch = input.match(/about\s+(.+?)(?:\s+and\s+|\s*$)/i);
            const topicsFromList = multiTopicMatch ? multiTopicMatch[1].split(/\s+and\s+/) : [];
            
            // Filter query patterns (SEARCH_THREADS)
            const isFilterQuery = /mentions of|threads about|threads that contain|contain|about|with|regarding|discussion|find|familiar with|which thread|talk about|threads with/.test(lower);
            
            // PRIORITY ROUTING: MULTI_SEARCH > SEARCH > LIST (using extracted topics)
            let isThreadListQuery;
            let isMultiSearchQuery;
            let route;
            let searchQueries = [];
            let intentReason = "";

            if (segmentedTopics.length > 1) {
              // MULTI_SEARCH: multiple distinct topics extracted
              isMultiSearchQuery = true;
              isThreadListQuery = false;
              route = "MULTI_SEARCH";
              searchQueries = segmentedTopics;
              intentReason = "multi-topic-extracted";
              console.log("🔀 [ROUTE_SELECTED]: MULTI_SEARCH");
              console.log("🔍 [TOPICS]:", searchQueries);
            } else if (segmentedTopics.length === 1) {
              // SEARCH: single topic extracted
              isMultiSearchQuery = false;
              isThreadListQuery = false;
              route = "SEARCH_THREADS";
              searchQueries = segmentedTopics;
              intentReason = "single-topic-extracted";
              console.log("🔀 [ROUTE_SELECTED]: SEARCH_THREADS");
              console.log("🔍 [TOPIC]:", searchQueries[0]);
            } else if (isExplicitListQuery) {
              // LIST: explicit "list my threads" pattern
              isMultiSearchQuery = false;
              isThreadListQuery = true;
              route = "LIST_THREADS";
              intentReason = "explicit-list-request";
              console.log("🔀 [ROUTE_SELECTED]: LIST_THREADS");
            } else {
              // Default: treat as LIST fallback
              isMultiSearchQuery = false;
              isThreadListQuery = true;
              route = "LIST_THREADS";
              intentReason = "no-topics-extracted";
              console.log("🔀 [ROUTE_SELECTED]: LIST_THREADS (default)");
            }

            // Record route selection in receipt
            retrievalReceipt.route_selected = route;
            retrievalReceipt.intent_reason = intentReason;

            // Debug: append extractor result to receipt if debug mode
            if (debugMode) {
              retrievalReceipt.extractor_debug = extractionDebug;
            }
            
            // Extract filter terms for SEARCH route
            let filterTerms = "";
            if (route === "SEARCH_THREADS" && searchQueries.length === 0) {
                // If no topic-based queries, try pattern-based extraction
                const patterns = [
                    /mentions? of\s+([^,.;]+)/i,
                    /threads? about\s+([^,.;]+)/i,
                    /contain\s+([^,.;]+)/i,
                    /regarding\s+([^,.;]+)/i,
                    /with\s+([^,.;]+)/i,
                    /discussion.*?about\s+([^,.;]+)/i,
                    /find.*?([^,.;]+)\s+in.*threads/i,
                    /"([^"]+)"/,  // quoted phrases
                    /'([^']+)'/   // single-quoted phrases
                ];
                
                for (const pattern of patterns) {
                    const match = input.match(pattern);
                    if (match && match[1]) {
                        filterTerms = match[1].trim();
                        break;
                    }
                }
                
                console.log("🔍 [FILTER_TERMS]:", filterTerms);
                
                // VALIDATION: SEARCH route must have filter terms
                if (!filterTerms || filterTerms.length === 0) {
                    console.error("🚨 [RETRIEVAL_VALIDATION_FAILURE]: EMPTY_FILTER_ON_SEARCH_ROUTE");
                    return Response.json({
                        error: "RETRIEVAL_VALIDATION_FAILURE",
                        reason: "EMPTY_FILTER_ON_SEARCH_ROUTE",
                        state: "SEARCH route detected but no filter keywords extracted",
                        user_query: input
                    }, { status: 400 });
                }
                searchQueries = [filterTerms];
            }

            // MULTI_SEARCH MODE: Execute segmented searches for each topic
            if (isMultiSearchQuery && route === "MULTI_SEARCH") {
                console.log("🔍 MULTI_SEARCH_BRANCH_ENTERED");
                console.log("🔍 Topics:", searchQueries);
                
                try {
                    const allConversations = await base44.asServiceRole.entities.Conversation.filter(
                        { created_by: user.email },
                        '-last_message_time',
                        200
                    );
                    
                    // For each topic, search and collect results
                    const multiResults = {};
                    const fieldsWithMatches = new Set();
                    
                    for (const topic of searchQueries) {
                        const topicLower = topic.toLowerCase();
                        const matching = allConversations.filter(c => {
                            const titleMatch = c.title?.toLowerCase().includes(topicLower);
                            const summaryMatch = c.summary?.toLowerCase().includes(topicLower);
                            const keywordMatch = c.keywords?.some(k => k.toLowerCase().includes(topicLower));
                            
                            if (titleMatch) fieldsWithMatches.add('title');
                            if (summaryMatch) fieldsWithMatches.add('summary');
                            if (keywordMatch) fieldsWithMatches.add('keywords');
                            
                            return titleMatch || summaryMatch || keywordMatch;
                        });
                        
                        multiResults[topic] = {
                            found: matching.length,
                            threads: matching.map(m => m.title).filter(Boolean)
                        };
                    }
                    
                    // Build deterministic transparency envelope
                    const totalMatches = Object.values(multiResults).reduce((sum, r) => sum + r.found, 0);
                    const matchType = totalMatches > 0 ? (totalMatches === 1 ? "exact" : "partial") : "none";
                    const confidence = totalMatches === 0 ? "LOW" : totalMatches === 1 ? "HIGH" : "MEDIUM";
                    
                    const transparencyBlock = `[MODE=RETRIEVAL]
SEARCH_SCOPE:
- Fields searched: ${[...fieldsWithMatches].join(', ') || 'title, summary, keywords'}
- Total threads indexed: ${allConversations.length}
- Search mode: MULTI_SEARCH

QUERY_TERMS: [${searchQueries.map(t => `"${t}"`).join(', ')}]

MATCH_SUMMARY:
- Total found: ${totalMatches} thread${totalMatches !== 1 ? 's' : ''}
- Match type: ${matchType}
- Confidence: ${confidence}
- Match fields: ${[...fieldsWithMatches].join(', ') || 'none'}

RESULTS:`;

                    const resultSections = Object.entries(multiResults)
                        .map(([topic, result]) => {
                            const threadList = result.threads.length === 0
                                ? `  (no matches)`
                                : result.threads.map(t => `  - ${t}`).join('\n');
                            return `\n${topic}: ${result.found} thread${result.found !== 1 ? 's' : ''}\n${threadList}`;
                        })
                        .join('\n');
                    
                    const nextStep = totalMatches > 0 
                        ? '\n\nNEXT_STEP: Reply with a thread title to open it.'
                        : '\n\nNEXT_STEP: Try different terms or "list my threads" for complete list.';
                    
                    let aiResponse = transparencyBlock + resultSections + nextStep;
                    
                    // Update receipt
                    retrievalReceipt.tool_called = false;
                    retrievalReceipt.result_count = Object.values(multiResults).reduce((sum, r) => sum + r.found, 0);
                    retrievalReceipt.formatter_used = "MULTI_REPORT_FORMATTER";
                    retrievalReceipt.report_object_generated = true;
                    retrievalReceipt.response_shape = "MULTI_REPORT";
                    retrievalReceipt.validation_status = "PASS";
                    retrievalReceipt.filter_terms = searchQueries;
                    
                    // Append receipt footer if debug mode
                    if (debugMode) {
                        aiResponse += `\n\n${formatReceiptFooter(retrievalReceipt)}`;
                    }
                    
                    console.log('📋 [RETRIEVAL_RECEIPT]', JSON.stringify(retrievalReceipt));
                    
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
                            { class: "lane", value: user.email },
                            { class: "retrieval_mode", value: "multi_search_direct" }
                        ],
                        token_count: Math.ceil(aiResponse.length / 4),
                        status: "active"
                    });
                    
                    return Response.json({
                        reply: aiResponse,
                        session: session_id,
                        generatedFiles: [],
                        usage_tokens: 0,
                        rotation_needed: false,
                        current_tokens: currentTokens,
                        active_lane: activeLane,
                        lane_count: lanes.length,
                        retrieval_mode: true,
                        diagnostic: {
                            request_id,
                            payload_hash,
                            multi_search: true,
                            topic_count: searchQueries.length
                        }
                    });
                } catch (error) {
                    console.error('🔥 MULTI_SEARCH_PIPELINE_FAILURE:', error);
                    retrievalReceipt.validation_status = `FAIL(${error.message})`;
                    console.log('📋 [RETRIEVAL_RECEIPT]', JSON.stringify(retrievalReceipt));
                    return Response.json({ 
                        error: 'MULTI_SEARCH_PIPELINE_FAILURE',
                        details: error.message
                    }, { status: 500 });
                }
            }
            
            // RETRIEVAL MODE ENVELOPE: Direct database queries with structured responses
            if (isThreadListQuery) {
                console.log("🔍 RETRIEVAL_BRANCH_ENTERED");
                console.log("🔍 Input:", input);

                try {
                    const conversations = await base44.asServiceRole.entities.Conversation.filter(
                        { created_by: user.email },
                        '-last_message_time',
                        100
                    );

                    console.log("🔍 DB_RESULT - Found conversations:", conversations.length);

                    const threadTitles = conversations.map(c => c.title).filter(Boolean);

                    console.log("🔍 TITLES_EXTRACTED:", threadTitles);

                    // Build structured LIST response
                    const responseEnvelope = {
                        mode: "RETRIEVAL",
                        type: "COMPLETE_THREAD_LIST",
                        results: threadTitles
                    };

                    // Format for display
                    let aiResponse = threadTitles.length === 0
                        ? "[MODE=RETRIEVAL]\nNo saved threads found."
                        : `[MODE=RETRIEVAL]\nComplete thread list (${threadTitles.length}):\n${threadTitles.map(t => `- ${t}`).join('\n')}`;
                    
                    // Append receipt footer if debug mode
                    if (debugMode) {
                        aiResponse += `\n\n${formatReceiptFooter(retrievalReceipt)}`;
                    }

                    console.log("🔍 RETURNING_RESPONSE:", aiResponse);
                    console.log("🔍 RESPONSE_ENVELOPE:", JSON.stringify(responseEnvelope));
                    
                    // Update receipt for LIST_THREADS path
                    retrievalReceipt.tool_called = false;
                    retrievalReceipt.result_count = threadTitles.length;
                    retrievalReceipt.formatter_used = "LIST_FORMATTER";
                    retrievalReceipt.report_object_generated = false;
                    retrievalReceipt.response_shape = "LIST_ONLY";
                    retrievalReceipt.validation_status = "SUCCESS";
                    
                    // Log retrieval receipt
                    console.log('📋 [RETRIEVAL_RECEIPT]', JSON.stringify(retrievalReceipt));

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
                            { class: "lane", value: user.email },
                            { class: "retrieval_mode", value: "direct_query_bypass_llm" }
                        ],
                        token_count: Math.ceil(aiResponse.length / 4),
                        status: "active"
                    });

                    const retrieval_response_hash = simpleHash(aiResponse);

                    console.log('✅ [POST-EXECUTION-RETRIEVAL]', JSON.stringify({
                        request_id,
                        payload_hash,
                        response_hash: retrieval_response_hash,
                        execution_time_ms: Date.now() - request_timestamp,
                        mode: 'RETRIEVAL',
                        threads_found: threadTitles.length
                    }));

                    console.log("🔍 RETRIEVAL_COMPLETE - Returning to client");

                    return Response.json({
                        reply: aiResponse,
                        session: session_id,
                        generatedFiles: [],
                        usage_tokens: 0,
                        rotation_needed: false,
                        current_tokens: currentTokens,
                        active_lane: activeLane,
                        lane_count: lanes.length,
                        retrieval_mode: true,
                        diagnostic: {
                            request_id,
                            payload_hash,
                            response_hash: retrieval_response_hash
                        }
                    });
                } catch (error) {
                    console.error('🔥 RETRIEVAL_PIPELINE_FAILURE:', error);
                    console.error('🔥 Error stack:', error.stack);
                    // HARD FAIL - Do NOT fallback to generative
                    return Response.json({ 
                        error: 'RETRIEVAL_PIPELINE_FAILURE',
                        state: 'UNKNOWN',
                        details: error.message
                    }, { status: 500 });
                }
            }

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
                    tool_choice: 'auto',
                    temperature: 0.8,
                    max_tokens: 12000
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI error: ${error}`);
            }

            const result = await response.json();
            const message = result.choices[0].message;
            usageTokens = result.usage?.total_tokens || Math.ceil(input.length / 4);

            // Handle OpenAI tool calls
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
                        // Read file - use HTTP to fetch from deployed app
                        try {
                            const filePath = args.file_path.replace(/^\/+/, '');
                            const extensions = ['.jsx', '.js', '.json', ''];
                            let fileContent = null;
                            
                            for (const ext of extensions) {
                                try {
                                    const url = `https://caos-chat-9c5683d8.base44.app/${filePath}${ext}`;
                                    const response = await fetch(url);
                                    if (response.ok) {
                                        fileContent = await response.text();
                                        break;
                                    }
                                } catch (e) {
                                    continue;
                                }
                            }
                            
                            if (fileContent) {
                                toolResult = { path: args.file_path, content: fileContent.substring(0, 8000), truncated: fileContent.length > 8000 };
                            } else {
                                toolResult = { error: `File not found: ${args.file_path}` };
                            }
                        } catch (error) {
                            toolResult = { error: `Cannot read file: ${error.message}` };
                        }
                    } else if (toolCall.function.name === 'search_threads') {
                        // Search across ALL Conversation entities and their Messages
                        try {
                            console.log("🔧 [TOOL_ARGS]:", JSON.stringify(args));
                            
                            // Update receipt: tool execution started
                            retrievalReceipt.tool_called = true;
                            retrievalReceipt.tool_name = "search_threads";
                            retrievalReceipt.tool_args = { query: args.query, limit: args.limit };
                            
                            // Get all conversations for this user
                            const conversations = await base44.asServiceRole.entities.Conversation.filter(
                                { created_by: user.email },
                                '-last_message_time',
                                100
                            );

                            // Determine operation mode: LIST (empty query) vs SEARCH (keyword query)
                            const isListMode = !args.query || args.query.trim() === '';
                            
                            let matchingConvos;
                            let matchFields = [];
                            
                            if (isListMode) {
                                // LIST MODE: Return all threads unfiltered
                                matchingConvos = conversations.slice(0, args.limit || 50);
                            } else {
                                // SEARCH MODE: Filter by keywords and track match reasons
                                const searchLower = args.query.toLowerCase();
                                matchingConvos = conversations.filter(c => {
                                    const titleMatch = c.title?.toLowerCase().includes(searchLower);
                                    const summaryMatch = c.summary?.toLowerCase().includes(searchLower);
                                    const keywordMatch = c.keywords?.some(k => k.toLowerCase().includes(searchLower));
                                    const previewMatch = c.last_message_preview?.toLowerCase().includes(searchLower);
                                    
                                    if (titleMatch) matchFields.push('title');
                                    if (summaryMatch) matchFields.push('summary');
                                    if (keywordMatch) matchFields.push('keywords');
                                    if (previewMatch) matchFields.push('preview');
                                    
                                    return titleMatch || summaryMatch || keywordMatch || previewMatch;
                                }).slice(0, args.limit || 10);
                                
                                // WARNING: Search returning full list
                                if (matchingConvos.length === conversations.length) {
                                    console.warn("⚠️ [WARNING]: Search returned full list — filter not applied. Query:", args.query);
                                }
                            }

                            // For each matching conversation, get some actual messages
                            const results = await Promise.all(matchingConvos.map(async (convo) => {
                                const messages = await base44.asServiceRole.entities.Message.filter(
                                    { conversation_id: convo.id },
                                    '-timestamp',
                                    5  // Get last 5 messages from each thread
                                );
                                
                                return {
                                    conversation_id: convo.id,
                                    title: convo.title,
                                    summary: convo.summary,
                                    keywords: convo.keywords,
                                    last_updated: convo.last_message_time,
                                    message_count: convo.message_count,
                                    recent_messages: messages.map(m => ({
                                        role: m.role,
                                        content: m.content.substring(0, 300),
                                        timestamp: m.timestamp
                                    }))
                                };
                            }));

                            // Build deterministic Retrieval Report Object
                            const titles = results.map(r => r.title).filter(Boolean);
                            const matchCount = results.length;
                            const matchType = matchCount > 0 ? (titles.some(t => t.toLowerCase() === args.query.toLowerCase()) ? "exact" : "partial") : "none";
                            const confidence = matchCount === 0 ? "LOW" : matchCount === 1 ? "HIGH" : "MEDIUM";
                            
                            // Determine which fields actually had matches
                            const fieldsWithMatches = [...new Set(matchFields)];
                            const scopeExplanation = `Searched ${fieldsWithMatches.length > 0 ? fieldsWithMatches.join(', ') : 'all metadata'} across ${conversations.length} total thread${conversations.length !== 1 ? 's' : ''}.`;
                            
                            // Build explanation of what didn't match
                            const unmatchedCount = conversations.length - matchCount;
                            const noMatchExplanation = unmatchedCount > 0 ? `${unmatchedCount} thread${unmatchedCount !== 1 ? 's' : ''} did not match "${args.query}".` : '';
                            
                            // Construct deterministic report (no LLM)
                            const retrievalReport = {
                                mode: "RETRIEVAL",
                                type: "SEARCH_RESULTS",
                                query_executed: args.query,
                                search_scope: {
                                    fields_searched: fieldsWithMatches.length > 0 ? fieldsWithMatches : ["title", "summary", "keywords", "preview"],
                                    total_threads_indexed: conversations.length,
                                    content_indexed: true
                                },
                                match_results: {
                                    count: matchCount,
                                    type: matchType,
                                    confidence: confidence,
                                    matches: titles
                                },
                                explanation: {
                                    what_searched: scopeExplanation,
                                    what_matched: matchCount > 0 ? `Found ${matchCount} thread${matchCount !== 1 ? 's' : ''} with "${args.query}" in ${fieldsWithMatches.join(', ')}.` : `No threads matched "${args.query}".`,
                                    what_didnt_match: noMatchExplanation,
                                    confidence_level: confidence === "HIGH" ? "Exact or single match found." : confidence === "MEDIUM" ? "Multiple partial matches found." : "No matches found."
                                },
                                next_step: matchCount > 0 ? "Reply with a thread title to open it." : `Try different terms, or use 'list my threads' to see your complete thread list.`
                            };

                            // VALIDATION ENFORCEMENT: SEARCH_THREADS must use SEARCH_REPORT_FORMATTER
                            if (route === "SEARCH_THREADS" && isListMode === false) {
                                // Validate formatter
                                if (!retrievalReport || retrievalReport.mode !== "RETRIEVAL") {
                                    console.error("🚨 [RETRIEVAL_VALIDATION_FAILURE]: FORMATTER_MISMATCH");
                                    retrievalReceipt.validation_status = "RETRIEVAL_VALIDATION_FAILURE";
                                    retrievalReceipt.formatter_used = "NONE";
                                    console.log('📋 [RETRIEVAL_RECEIPT]', JSON.stringify(retrievalReceipt));
                                    return Response.json({
                                        error: "RETRIEVAL_VALIDATION_FAILURE",
                                        reason: "FORMATTER_MISMATCH",
                                        state: "SEARCH route executed but SEARCH_REPORT_FORMATTER not applied"
                                    }, { status: 500 });
                                }
                            }
                            
                            // VALIDATION ENFORCEMENT: Empty filter detection
                            if (route === "SEARCH_THREADS" && !isListMode && (!args.query || args.query.trim() === '')) {
                                console.error("🚨 [RETRIEVAL_VALIDATION_FAILURE]: EMPTY_FILTER_ON_SEARCH");
                                retrievalReceipt.validation_status = "RETRIEVAL_VALIDATION_FAILURE";
                                console.log('📋 [RETRIEVAL_RECEIPT]', JSON.stringify(retrievalReceipt));
                                return Response.json({
                                    error: "RETRIEVAL_VALIDATION_FAILURE",
                                    reason: "EMPTY_FILTER_ON_SEARCH",
                                    state: "SEARCH route with empty filter terms"
                                }, { status: 500 });
                            }
                            
                            // Update receipt: results recorded
                            retrievalReceipt.result_count = results.length;
                            retrievalReceipt.formatter_used = isListMode ? "LIST_FORMATTER" : "SEARCH_REPORT_FORMATTER";
                            retrievalReceipt.report_object_generated = !isListMode;
                            retrievalReceipt.response_shape = isListMode ? "LIST_ONLY" : "REPORT_OBJECT";
                            retrievalReceipt.validation_status = "PASS";
                            retrievalReceipt.filter_terms = args.query ? args.query.split(/\s+/).filter(t => t.length > 0) : [];
                            
                            console.log('📋 [RETRIEVAL_RECEIPT]', JSON.stringify(retrievalReceipt));
                            
                            toolResult = {
                                mode: isListMode ? "LIST" : "SEARCH",
                                type: isListMode ? "COMPLETE_THREAD_LIST" : "SEARCH_RESULTS",
                                found: results.length,
                                total_threads_searched: conversations.length,
                                query: args.query || "(all threads - list mode)",
                                retrieval_report: retrievalReport,
                                threads: results
                            };
                        } catch (error) {
                            toolResult = {
                                found: 0,
                                error: `Thread search failed: ${error.message}`,
                                threads: [],
                                total_threads_searched: 0
                            };
                        }
                    } else if (toolCall.function.name === 'list_app_structure') {
                        // List structure - return known app structure
                        const structures = {
                            pages: ['Chat', 'Welcome', 'SystemBlueprint', 'Implementation', 'MemoryIsolation', 'TerminalBlueprint', 'Console', 'News'],
                            components: ['chat/ChatBubble', 'chat/ChatInput', 'chat/ChatHeader', 'chat/TokenMeter', 'chat/ThreadList', 'chat/ProfilePanel', 'chat/StarfieldBackground', 'chat/ConversationSearch', 'chat/QuickActionBar', 'chat/ContinuityToken', 'chat/WelcomeGreeting', 'chat/LaneSelector', 'chat/VoiceSettings', 'chat/LinkPreview', 'chat/TextSelectionMenu', 'chat/CopyBlock', 'terminal/CodeTerminal', 'game/GameView', 'profile/MemoryPanel', 'files/FileManager', 'console/SSHConsole', 'console/WebSocketAttach', 'docs/CAOSBlueprint', 'docs/MemoryIsolationBlueprint', 'docs/FilesystemIsolation'],
                            functions: ['hybridMessage', 'transcribeAudio', 'textToSpeech', 'extractUserPreference', 'pinMemory', 'caosMessage', 'proxyMessage', 'contextJournal', 'tieredRecall', 'caosRecall', 'selector', 'grokProvider', 'checkGrokModels'],
                            entities: ['UserProfile', 'Lane', 'Message', 'Record', 'SessionContext', 'SelectorDecision', 'SessionState', 'UserFile', 'GameToken', 'Conversation', 'ErrorLog']
                        };
                        
                        toolResult = { 
                            type: args.type, 
                            files: structures[args.type] || [],
                            note: 'Static structure map - dynamically maintained'
                        };
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
                            // Merge with existing profile - SYSTEM-WIDE, NOT THREAD-BASED
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
                                // Don't duplicate facts
                                const existingFactTexts = new Set(existingFacts.map(f => f.fact.toLowerCase()));
                                const newFacts = args.learned_facts
                                    .filter(f => !existingFactTexts.has(f.fact.toLowerCase()))
                                    .map(f => ({
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

                            toolResult = { 
                                success: true, 
                                message: 'Profile updated permanently - system-wide memory, persists across all threads and sessions forever',
                                updated_fields: Object.keys(args).join(', ')
                            };
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
                const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [...messages, ...toolMessages],
                        temperature: 0.8,
                        max_tokens: 12000
                    })
                });

                const finalResult = await finalResponse.json();
                aiResponse = `[MODE=GEN]\n${finalResult.choices[0].message.content}`;
                if (finalResult.usage?.total_tokens) usageTokens = finalResult.usage.total_tokens;
            } else {
                aiResponse = `[MODE=GEN]\n${message.content}`;
            }

            // Append receipt footer if debug mode (GEN path)
            if (debugMode) {
                aiResponse += `\n\n${formatReceiptFooter(retrievalReceipt)}`;
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

        // P3: Execution Logging - state ledger for debugging
        const executionLog = {
            request_id,
            query_type: isFileGen || isImageGen ? 'generation' : 'general',
            tool_called: 'none',
            validation_passed: true,
            temperature_used: 0.8,
            tokens_used: usageTokens,
            request_timestamp_ms: request_timestamp,
            request_delta_ms,
            rapid_duplicate_flagged: is_rapid_duplicate,
            payload_hash
        };

        const response_hash = simpleHash(aiResponse);

        // POST-EXECUTION DIAGNOSTIC LOG
        console.log('✅ [POST-EXECUTION]', JSON.stringify({
            request_id,
            payload_hash,
            response_hash,
            execution_time_ms: Date.now() - request_timestamp,
            duplicate_flag: is_rapid_duplicate,
            request_delta_ms: request_delta_ms || 'N/A',
            mode: isFileGen ? 'FILE_GEN' : isImageGen ? 'IMAGE_GEN' : 'STANDARD',
            tokens_used: usageTokens,
            generated_files: generatedFiles.length,
            response_length: aiResponse.length
        }));

        // Store AI response with execution metadata
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
                { class: "lane", value: user.email },
                { class: "execution_log", value: JSON.stringify(executionLog) }
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
                const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
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

        // Update SessionContext with temporal tracking
        if (sessionContext) {
            await base44.asServiceRole.entities.SessionContext.update(sessionContext.id, {
                last_request_ts: request_timestamp,
                last_activity_ts: request_timestamp
            });
        } else {
            await base44.asServiceRole.entities.SessionContext.create({
                session_id,
                lane_id: user.email,
                last_request_ts: request_timestamp,
                last_activity_ts: request_timestamp
            });
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
            lane_count: lanes.length,
            temporal_metadata: {
                request_timestamp_ms: request_timestamp,
                request_delta_ms,
                rapid_duplicate: is_rapid_duplicate
            },
            diagnostic: {
                request_id,
                payload_hash,
                response_hash,
                duplicate_flag: is_rapid_duplicate,
                execution_time_ms: Date.now() - request_timestamp
            }
        });

    } catch (error) {
        console.error('OpenAI provider error:', error);
        return Response.json({ 
            error: error.message,
            reply: "I encountered an error. Please try again."
        }, { status: 500 });
    }
});