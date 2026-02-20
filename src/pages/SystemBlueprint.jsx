import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SystemBlueprint() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-8">
      <button
        onClick={() => navigate(createPageUrl('Chat'))}
        className="mb-6 flex items-center gap-2 text-blue-300 hover:text-blue-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Chat
      </button>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="max-w-5xl mx-auto space-y-8 pb-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">CAOS System Blueprint</h1>
            <p className="text-xl text-blue-300">Complete Technical Specification - OpenAI w/ Multi-Lane Architecture</p>
            <p className="text-sm text-gray-400 mt-2">Last Updated: Feb 20, 2026</p>
          </div>

          {/* ARCHITECTURE OVERVIEW */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">1. Architecture Overview</h2>
            
            <div className="space-y-4 text-gray-200">
              <h3 className="text-xl font-semibold text-white">System Layers:</h3>
              
              <div className="bg-blue-950/50 p-4 rounded-lg border border-blue-500/30">
                <pre className="text-sm overflow-x-auto">{`
┌─────────────────────────────────────────────┐
│           FRONTEND (React)                  │
│  • Chat UI (multi-conversation)             │
│  • Message Display + Error Handling         │
│  • File Upload (images, docs, voice)        │
│  • Token Meter (90K rotation trigger)       │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│      BACKEND FUNCTIONS (Deno)              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   hybridMessage (MAIN)              │   │
│  │   • Session + lane detection        │   │
│  │   • Profile loading (persistent)    │   │
│  │   • Multi-lane hot context          │   │
│  │   • Seed generation at 90K tokens   │   │
│  │   • OpenAI API coordination         │   │
│  └─────────────┬───────────────────────┘   │
│                │                            │
│                ▼                            │
│  ┌─────────────────────────────────────┐   │
│  │   OpenAI API (gpt-4o)               │   │
│  │   • Native tool calling             │   │
│  │   • Vision support (images)         │   │
│  │   • Web search via InvokeLLM        │   │
│  │   • 128K context window per call    │   │
│  └─────────────┬───────────────────────┘   │
│                │                            │
│                ▼                            │
│  ┌─────────────────────────────────────┐   │
│  │   TOOLS (OpenAI-executed)           │   │
│  │   • search_internet                 │   │
│  │   • recall_memory (full vault)      │   │
│  │   • read_app_file                   │   │
│  │   • update_user_profile             │   │
│  │   • list_app_structure              │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│        DATABASE (Base44 Entities)           │
│  • Record (all messages w/ token_count)     │
│  • Lane (hot context per topic)             │
│  • UserProfile (persistent memory)          │
│  • Conversation (thread metadata)           │
│  • Message (UI layer)                       │
│  • UserFile (attachments organized)         │
│  • ErrorLog (failure tracking)              │
└─────────────────────────────────────────────┘
                `}</pre>
              </div>
            </div>
          </section>

          {/* MESSAGE FLOW */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">2. Message Flow (Current Implementation)</h2>
            
            <div className="space-y-6">
              <div className="bg-green-950/50 p-4 rounded-lg border border-green-500/30">
                <h3 className="text-lg font-semibold text-green-300 mb-3">Step 1: User sends message</h3>
                <pre className="text-sm overflow-x-auto text-gray-200">{`
// Frontend calls hybridMessage
const response = await fetch('http://YOUR_API/api/functions/hybridMessage', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    input: "What's the weather like?",
    session_id: "sess_12345",
    file_urls: [], // optional images
    rotation_seed: null, // injected if thread was rotated
    current_lane: null // auto-detected or manual
  })
});
                `}</pre>
              </div>

              <div className="bg-purple-950/50 p-4 rounded-lg border border-purple-500/30">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">Step 2: Backend processes (hybridMessage)</h3>
                <pre className="text-sm overflow-x-auto text-gray-200">{`
1. Authenticate user (base44.auth.me())
2. Load UserProfile (persistent memory across all threads)
3. Load identity contract (response style enforcement)
4. Detect active lane: ui, immigration, tokens, backend, news, general
5. Load lane-specific context:
   - Hot messages: Last 5 per lane
   - Lane summary: Compressed warm context
   - Recent cross-lane: 3 most recent messages
6. Calculate token usage across all lanes
7. IF > 90K tokens:
   - Generate compressed seed (2-3K chars)
   - Inject into new request as system message
8. Build working context: profile + lane hot + recent
9. Call OpenAI gpt-4o with native tools
10. Store messages in Record entity with token counts
11. Update Lane hot_messages (rolling window)
12. Archive lane summary every 10 messages
13. Return response to frontend
                `}</pre>
              </div>

              <div className="bg-blue-950/50 p-4 rounded-lg border border-blue-500/30">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">Step 3: AI decides + executes</h3>
                <pre className="text-sm overflow-x-auto text-gray-200">{`
OpenAI receives:
- System prompt (identity + profile + lane context)
- Optional rotation seed (if > 90K)
- Lane hot messages
- Recent cross-lane messages
- User's current message

AI can call tools:
- search_internet → InvokeLLM with web context
- recall_memory → Search ALL Record history (no caps)
- read_app_file → Read own source code
- update_user_profile → Store permanent facts about user
- list_app_structure → See available pages/components

Tools execute in backend, results returned to OpenAI, final response generated
                `}</pre>
              </div>
            </div>
          </section>
          
          {/* MULTI-LANE CONTEXT SYSTEM */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">3. Multi-Lane Context Windows</h2>
            
            <div className="space-y-6 text-gray-200">
              <div className="bg-yellow-950/50 p-4 rounded-lg border border-yellow-500/30">
                <h3 className="text-lg font-semibold text-yellow-300 mb-3">Problem Solved</h3>
                <p className="text-sm">Traditional single-thread chat gets bloated over time. Every message adds to context, slowing responses and hitting token limits. CAOS splits conversations into topic-based lanes.</p>
              </div>

              <div className="bg-blue-950/50 p-4 rounded-lg border border-blue-500/30">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">Lane Detection (Auto)</h3>
                <pre className="text-sm overflow-x-auto">{`
function detectLane(text) {
  const lower = text.toLowerCase();
  if (/ui|interface|design|button/.test(lower)) return 'ui';
  if (/immigr|visa|ice|border/.test(lower)) return 'immigration';
  if (/token|context|memory|recall/.test(lower)) return 'tokens';
  if (/function|backend|api|code/.test(lower)) return 'backend';
  if (/news|current|today|latest/.test(lower)) return 'news';
  return 'general';
}
                `}</pre>
              </div>

              <div className="bg-green-950/50 p-4 rounded-lg border border-green-500/30">
                <h3 className="text-lg font-semibold text-green-300 mb-3">Context Layers per Lane</h3>
                <pre className="text-sm overflow-x-auto">{`
Lane Entity Structure:
{
  session_id: "sess_123",
  lane_name: "ui",
  hot_messages: [
    { role: "user", content: "...", timestamp: "..." },
    { role: "assistant", content: "...", timestamp: "..." }
    // Last 5 messages kept hot
  ],
  summary: "Compressed warm context (archived every 10 msgs)",
  message_count: 47
}

Hot Context: Last 5 messages per lane (immediate recall)
Warm Context: Compressed summary (background knowledge)
Cold Storage: Full Record history (searchable via tools)
                `}</pre>
              </div>

              <div className="bg-purple-950/50 p-4 rounded-lg border border-purple-500/30">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">Working Context Assembly</h3>
                <pre className="text-sm overflow-x-auto">{`
Per Request to OpenAI:
1. UserProfile (persistent facts about user)
2. Identity contract (response style rules)
3. Active lane hot messages (5 most recent in this topic)
4. Active lane summary (compressed history)
5. 3 most recent cross-lane messages (continuity)
6. Optional: Rotation seed (if previous thread > 90K)

Result: Clean, focused context without bloat
                `}</pre>
              </div>
            </div>
          </section>

          {/* TOKEN MANAGEMENT & ROTATION */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">4. Token Management & Rotation</h2>
            
            <div className="space-y-6 text-gray-200">
              <div className="bg-red-950/50 p-4 rounded-lg border border-red-500/30">
                <h3 className="text-lg font-semibold text-red-300 mb-3">⚠️ CRITICAL: How Rotation Works</h3>
                <p className="text-sm mb-3">The 90K rotation trigger is NOT a hard cap. It's a compression checkpoint to prevent thread bloat.</p>
                <pre className="text-sm overflow-x-auto">{`
Token Calculation:
- Sum all hot_messages across ALL lanes
- Each message: ~length / 4 tokens
- When total > 90,000 → rotation triggered

What Happens:
1. Compress all lane contexts into seed (2-3K chars)
2. Seed injected as system message in NEXT request
3. Lanes continue normally (no data loss)
4. Thread stays lean and fast
                `}</pre>
              </div>

              <div className="bg-blue-950/50 p-4 rounded-lg border border-blue-500/30">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">Seed Generation</h3>
                <pre className="text-sm overflow-x-auto">{`
When rotation triggered:
1. Gather all lane summaries + hot messages
2. Send to OpenAI: "Compress into 2-3K chars max"
3. Result: Ultra-compact seed with key facts
4. Example seed:
   "CAOS v3 Seed: UI lane focused on chat styling, 
   token system discussion about context rotation, 
   backend work on error handling. User prefers 
   casual tone, works on immigration app. Recent: 
   Fixed message persistence bug."
   
5. Seed stored with session
6. Injected into next OpenAI call as system message

WHEN seed is injected:
- Only when user sends new message AFTER rotation
- Not automatically - requires new user input
- Seed becomes part of system prompt
- Replaces need to send full history
                `}</pre>
              </div>

              <div className="bg-yellow-950/50 p-4 rounded-lg border border-yellow-500/30">
                <h3 className="text-lg font-semibold text-yellow-300 mb-3">Why This Prevents Bloat</h3>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>Each lane stays lean (5 hot messages max)</li>
                  <li>Summaries compress every 10 messages</li>
                  <li>Seeds compress entire conversation history</li>
                  <li>No exponential growth like traditional chat</li>
                  <li>Fast responses maintained indefinitely</li>
                  <li>Full history still searchable via recall_memory tool</li>
                </ul>
              </div>

              <div className="bg-green-950/50 p-4 rounded-lg border border-green-500/30">
                <h3 className="text-lg font-semibold text-green-300 mb-3">Token Meter Display</h3>
                <pre className="text-sm overflow-x-auto">{`
// What you see in UI
Token Meter: 30,520 / 2M

What it means:
- 30,520: Actual tokens in working context (all lanes hot)
- 2M: Display number (not a hard limit)
- Real trigger: 90K (for rotation)

Should change to: 30,520 / 90K
- Shows proximity to rotation
- More accurate representation
- No confusion about "2M cap"
                `}</pre>
              </div>
            </div>
          </section>

          {/* PERSISTENT MEMORY SYSTEM */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">5. Persistent Memory System</h2>
            
            <div className="space-y-6 text-gray-200">
              <div className="bg-indigo-950/50 p-4 rounded-lg border border-indigo-500/30">
                <h3 className="text-lg font-semibold text-indigo-300 mb-3">UserProfile Entity</h3>
                <pre className="text-sm overflow-x-auto">{`
{
  user_email: "user@example.com",
  presentation_preferences: {
    formatting_style: "dashes for lists, clean formatting",
    tone: "casual, direct, witty",
    response_length: "concise",
    code_preferences: "commented examples"
  },
  visual_context: {
    workspace: "Standing desk with 3 monitors",
    appearance: "Developer in casual attire",
    projects: ["CAOS", "Immigration app"],
    environment: "Home office setup"
  },
  interaction_patterns: {
    prefers_examples: true,
    prefers_visuals: true,
    common_tasks: ["debugging", "architecture design"]
  },
  learned_facts: [
    {
      fact: "Works on immigration-related projects",
      category: "work",
      learned_date: "2026-02-15"
    },
    {
      fact: "Prefers direct communication",
      category: "style",
      learned_date: "2026-02-18"
    }
  ],
  interests: ["AI systems", "memory architecture"],
  goals: ["Build shippable CAOS", "Integrate Python server"]
}

This profile is loaded EVERY request and injected into system prompt.
Result: CAOS remembers you across ALL threads forever.
                `}</pre>
              </div>

              <div className="bg-cyan-950/50 p-4 rounded-lg border border-cyan-500/30">
                <h3 className="text-lg font-semibold text-cyan-300 mb-3">How Profile Updates Work</h3>
                <pre className="text-sm overflow-x-auto">{`
1. AI recognizes important facts during conversation
2. AI calls update_user_profile tool with new data
3. Backend merges with existing profile (no overwrites)
4. Profile persists forever across all sessions
5. Next request automatically includes updated profile

Example:
User: "I work at X company now"
AI: *calls update_user_profile*
     {learned_facts: [{fact: "Works at X company"}]}
Next thread: AI already knows without being told
                `}</pre>
              </div>

              <div className="bg-teal-950/50 p-4 rounded-lg border border-teal-500/30">
                <h3 className="text-lg font-semibold text-teal-300 mb-3">Record vs Lane vs Profile</h3>
                <pre className="text-sm overflow-x-auto">{`
Record: Every message ever sent (searchable via recall_memory)
  - Full conversation history
  - Timestamped with token counts
  - Queryable across all sessions

Lane: Topic-specific working memory (ui, backend, tokens, etc.)
  - Hot: Last 5 messages per lane
  - Warm: Compressed summaries
  - Auto-switches based on topic

Profile: Permanent facts about user (YOU)
  - Name, work, preferences, style
  - Learned over time
  - Never expires
  - Loaded every request

Result: Three-tier memory hierarchy
                `}</pre>
              </div>
            </div>
          </section>

          {/* AI API INTEGRATION */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">6. AI API Integration (Current: OpenAI)</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-white">OpenAI gpt-4o (Native Tools)</h3>
                <pre className="bg-slate-950/80 p-4 rounded-lg text-sm overflow-x-auto border border-slate-700">{`
// OpenAI API with native tool calling
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer OPENAI_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'search_internet',
          description: 'Search the web for real-time information',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'analyze_image',
          description: 'Analyze image content',
          parameters: {
            type: 'object',
            properties: {
              image_url: { type: 'string' },
              question: { type: 'string' }
            },
            required: ['image_url']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'recall_memory',
          description: 'Search conversation history',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' }
            },
            required: ['query']
          }
        }
      }
    ],
    tool_choice: 'auto'
  })
});

// Handle tool calls (OpenAI executes them natively)
if (response.choices[0].message.tool_calls) {
  for (const toolCall of response.choices[0].message.tool_calls) {
    const result = await executeToolFunction(
      toolCall.function.name, 
      JSON.parse(toolCall.function.arguments)
    );
    // Send result back to OpenAI for final response
  }
}

// Key tools available:
// - search_internet: InvokeLLM with web context
// - recall_memory: Search full Record history
// - read_app_file: Read CAOS source code
// - update_user_profile: Store permanent facts
// - list_app_structure: See pages/components
                `}</pre>
              </div>
            </div>
          </section>

          {/* ERROR HANDLING */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">7. Error Handling & Recovery</h2>
            
            <div className="space-y-6 text-gray-200">
              <div className="bg-red-950/50 p-4 rounded-lg border border-red-500/30">
                <h3 className="text-lg font-semibold text-red-300 mb-3">Failed Message Persistence</h3>
                <pre className="text-sm overflow-x-auto">{`
Frontend sends message → Backend timeout/error
  ↓
Message stored locally (caos_last_message_backup)
  ↓
Error logged to ErrorLog entity:
{
  user_email: "user@example.com",
  conversation_id: "conv_123",
  error_type: "timeout" | "network_error" | "server_error",
  error_message: "Request timeout after 120s",
  lost_message_content: "Original message text",
  lost_message_files: ["file_url1", "file_url2"],
  request_payload: { full payload for debugging },
  retry_count: 0,
  resolved: false
}
  ↓
Failed message displayed with RED styling + error icon
User can see what was lost, retry manually
Backup cleared ONLY on successful send
                `}</pre>
              </div>

              <div className="bg-orange-950/50 p-4 rounded-lg border border-orange-500/30">
                <h3 className="text-lg font-semibold text-orange-300 mb-3">Detailed Console Logging</h3>
                <pre className="text-sm overflow-x-auto">{`
Before hybridMessage invoke:
  console.log('=== SEND MESSAGE DEBUG ===')
  console.log('Conversation ID:', conversationId)
  console.log('Message text:', messageText)
  console.log('File URLs:', fileUrls)
  console.log('Session ID:', session_id)

Error detection:
  if (error.name === 'AbortError') → "timeout"
  else if (error.message.includes('fetch')) → "network_error"
  else if (response.status >= 500) → "server_error"
  else → "unknown"

All errors logged to ErrorLog for admin review
                `}</pre>
              </div>
            </div>
          </section>

          {/* TOOL DEFINITIONS */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">8. Tool Definitions & Execution</h2>
            
            <div className="space-y-6">
              <div className="bg-orange-950/50 p-4 rounded-lg border border-orange-500/30">
                <h3 className="text-lg font-semibold text-orange-300 mb-3">Tool: search_internet</h3>
                <pre className="text-sm overflow-x-auto text-gray-200">{`
// Function signature
async function search_internet({ query }) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: query,
    add_context_from_internet: true
  });
  return { results: result };
}

// Example call from AI:
{
  "name": "search_internet",
  "arguments": "{\\"query\\": \\"current weather in New York\\"}"
}

// Returns to AI:
{
  "results": "Current weather in New York is 45°F, partly cloudy..."
}
                `}</pre>
              </div>

              <div className="bg-pink-950/50 p-4 rounded-lg border border-pink-500/30">
                <h3 className="text-lg font-semibold text-pink-300 mb-3">Tool: analyze_image</h3>
                <pre className="text-sm overflow-x-auto text-gray-200">{`
// Function signature
async function analyze_image({ image_url, question }) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: question || "Describe this image in detail",
    file_urls: [image_url]
  });
  return { analysis: result };
}

// Example call from AI:
{
  "name": "analyze_image",
  "arguments": "{\\"image_url\\": \\"https://...\\"}"
}
                `}</pre>
              </div>

              <div className="bg-cyan-950/50 p-4 rounded-lg border border-cyan-500/30">
                <h3 className="text-lg font-semibold text-cyan-300 mb-3">Tool: recall_memory</h3>
                <pre className="text-sm overflow-x-auto text-gray-200">{`
// Function signature
async function recall_memory({ query, limit = 10 }) {
  const records = await base44.entities.Record.filter(
    { session_id, status: "active" },
    '-created_date',
    limit
  );
  
  // Simple keyword search
  const matches = records.filter(r => 
    r.message.toLowerCase().includes(query.toLowerCase())
  );
  
  return {
    found: matches.length,
    messages: matches.map(m => ({
      role: m.role,
      content: m.message,
      timestamp: m.ts_snapshot_iso
    }))
  };
}
                `}</pre>
              </div>
            </div>
          </section>

          {/* DATA STRUCTURES */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">5. Data Structures</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-white">Record Entity (Message Storage)</h3>
                <pre className="bg-slate-950/80 p-4 rounded-lg text-sm overflow-x-auto border border-slate-700">{`
{
  "record_id": "sess_123_1_1234567890",
  "session_id": "sess_123",
  "seq": 1,
  "role": "user" | "assistant",
  "message": "The actual message text",
  "ts_snapshot_iso": "2026-02-17T12:00:00Z",
  "ts_snapshot_ms": 1234567890,
  "status": "active" | "superseded",
  "token_count": 50,
  "tier": "session" | "lane" | "profile" | "global"
}
                `}</pre>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-white">SessionContext Entity</h3>
                <pre className="bg-slate-950/80 p-4 rounded-lg text-sm overflow-x-auto border border-slate-700">{`
{
  "session_id": "sess_123",
  "lane_id": "user@email.com",
  "wcw_budget": 8000,
  "wcw_used": 1500,
  "last_seq": 42,
  "context_paths": [],
  "kernel_context_valid": true,
  "bootloader_context_valid": true
}
                `}</pre>
              </div>
            </div>
          </section>

          {/* SYSTEM PROMPT */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">6. System Prompt Design</h2>
            
            <div className="space-y-4">
              <div className="bg-yellow-950/50 p-4 rounded-lg border border-yellow-500/30">
                <h3 className="text-lg font-semibold text-yellow-300 mb-3">Current Issue: Too Robotic</h3>
                <pre className="text-sm text-gray-200">{`
❌ "I am CAOS with the following capabilities..."
❌ Lists features every time
❌ Formal language
❌ Doesn't flow naturally
                `}</pre>
              </div>

              <div className="bg-green-950/50 p-4 rounded-lg border border-green-500/30">
                <h3 className="text-lg font-semibold text-green-300 mb-3">Proposed: Natural Conversation</h3>
                <pre className="text-sm text-gray-200 whitespace-pre-wrap">{`
You're CAOS - a helpful AI assistant. You can:
- Search the web when needed (don't announce it, just do it)
- Look at images users share
- Remember past conversations
- Help with files and code

Talk naturally. No need to introduce yourself or list capabilities unless asked.
If you need to use a tool, just use it - the user will see what you're doing.

Be casual, helpful, and conversational like talking to a friend.
                `}</pre>
              </div>
            </div>
          </section>

          {/* REQUIRED INFORMATION */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-red-300">7. Information Needed from AI Provider</h2>
            
            <div className="space-y-4">
              <div className="bg-red-950/50 p-4 rounded-lg border border-red-500/30">
                <h3 className="text-xl font-semibold text-red-300 mb-4">Required:</h3>
                <ul className="space-y-3 text-gray-200">
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">1.</span>
                    <div>
                      <strong>API Endpoint URL</strong>
                      <p className="text-sm text-gray-400">Example: https://api.x.ai/v1/chat/completions</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">2.</span>
                    <div>
                      <strong>Authentication Method</strong>
                      <p className="text-sm text-gray-400">Bearer token? API key header? Format?</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">3.</span>
                    <div>
                      <strong>Model Name/ID</strong>
                      <p className="text-sm text-gray-400">Example: grok-beta, grok-2, etc.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">4.</span>
                    <div>
                      <strong>Tool/Function Calling Format</strong>
                      <p className="text-sm text-gray-400">OpenAI format? Custom format? Schema structure?</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">5.</span>
                    <div>
                      <strong>Response Structure</strong>
                      <p className="text-sm text-gray-400">How are messages, tool calls, and completions formatted?</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">6.</span>
                    <div>
                      <strong>Native Capabilities</strong>
                      <p className="text-sm text-gray-400">Does Grok have built-in web search? Vision? Or need tools for both?</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">7.</span>
                    <div>
                      <strong>Rate Limits</strong>
                      <p className="text-sm text-gray-400">Requests per minute/hour? Token limits?</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">8.</span>
                    <div>
                      <strong>Streaming Support</strong>
                      <p className="text-sm text-gray-400">Server-sent events? Websockets? Needed for real-time responses</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">9.</span>
                    <div>
                      <strong>Error Codes</strong>
                      <p className="text-sm text-gray-400">How are errors returned? Status codes? Error format?</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">10.</span>
                    <div>
                      <strong>Context Window Size</strong>
                      <p className="text-sm text-gray-400">Max tokens for conversation history?</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* IMPLEMENTATION EXAMPLE */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">8. Implementation Example</h2>
            
            <div className="space-y-4">
              <p className="text-gray-300">Once we have the information above, we'll create a new backend function:</p>
              
              <pre className="bg-slate-950/80 p-4 rounded-lg text-sm overflow-x-auto border border-slate-700">{`
// functions/grokProvider.js

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GROK_API_URL = 'PROVIDED_BY_XAI';
const GROK_API_KEY = Deno.env.get('GROK_API_KEY');

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  const { messages, tools, session_id } = await req.json();
  
  // Call Grok API
  const response = await fetch(GROK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${GROK_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages,
      tools,
      tool_choice: 'auto'
    })
  });
  
  const result = await response.json();
  
  // Handle tool calls if any
  if (result.choices[0].message.tool_calls) {
    const toolResults = [];
    
    for (const toolCall of result.choices[0].message.tool_calls) {
      const toolResult = await executeTool(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments),
        base44,
        session_id
      );
      toolResults.push(toolResult);
    }
    
    // Call Grok again with tool results
    const finalResponse = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${GROK_API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          ...messages,
          result.choices[0].message,
          ...toolResults.map(tr => ({
            role: 'tool',
            tool_call_id: tr.id,
            content: JSON.stringify(tr.result)
          }))
        ]
      })
    });
    
    return Response.json(await finalResponse.json());
  }
  
  return Response.json(result);
});

async function executeTool(name, args, base44, session_id) {
  switch (name) {
    case 'search_internet':
      return await searchInternet(args.query, base44);
    case 'analyze_image':
      return await analyzeImage(args.image_url, args.question, base44);
    case 'recall_memory':
      return await recallMemory(args.query, session_id, base44);
    default:
      throw new Error(\`Unknown tool: \${name}\`);
  }
}
              `}</pre>
            </div>
          </section>

          {/* TESTING PLAN */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">9. Testing & Validation Plan</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-950/50 p-4 rounded-lg border border-blue-500/30">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">Phase 1: Basic Connection</h3>
                <ul className="space-y-2 text-gray-200 text-sm">
                  <li>✓ Can we connect to the API?</li>
                  <li>✓ Does authentication work?</li>
                  <li>✓ Can we send a simple message and get a response?</li>
                </ul>
              </div>

              <div className="bg-purple-950/50 p-4 rounded-lg border border-purple-500/30">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">Phase 2: Tool Integration</h3>
                <ul className="space-y-2 text-gray-200 text-sm">
                  <li>✓ Does Grok recognize tool definitions?</li>
                  <li>✓ Can it decide when to use tools?</li>
                  <li>✓ Do tool results flow back correctly?</li>
                </ul>
              </div>

              <div className="bg-green-950/50 p-4 rounded-lg border border-green-500/30">
                <h3 className="text-lg font-semibold text-green-300 mb-3">Phase 3: Personality</h3>
                <ul className="space-y-2 text-gray-200 text-sm">
                  <li>✓ Is the conversation natural?</li>
                  <li>✓ Does it maintain context?</li>
                  <li>✓ No repetitive capability lists?</li>
                </ul>
              </div>

              <div className="bg-yellow-950/50 p-4 rounded-lg border border-yellow-500/30">
                <h3 className="text-lg font-semibold text-yellow-300 mb-3">Phase 4: Production Ready</h3>
                <ul className="space-y-2 text-gray-200 text-sm">
                  <li>✓ Error handling works</li>
                  <li>✓ Rate limiting handled</li>
                  <li>✓ Performance acceptable</li>
                  <li>✓ Memory management stable</li>
                </ul>
              </div>
            </div>
          </section>

          {/* SUMMARY */}
          <section className="bg-gradient-to-br from-blue-950/50 to-purple-950/50 border border-blue-500/30 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">Summary</h2>
            
            <div className="space-y-4 text-gray-200">
              <p className="text-lg">
                <strong className="text-white">Current State:</strong> Working system using InvokeLLM, but personality is robotic and repetitive.
              </p>
              
              <p className="text-lg">
                <strong className="text-white">Goal:</strong> Switch to Grok API for more natural conversation with proper tool calling.
              </p>
              
              <p className="text-lg">
                <strong className="text-white">What We Need:</strong> The 10 pieces of information in Section 7 from xAI/Grok documentation.
              </p>
              
              <p className="text-lg">
                <strong className="text-white">Timeline:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Get API details: 1 hour</li>
                <li>Implement Grok provider: 2-3 hours</li>
                <li>Test and refine: 2-4 hours</li>
                <li>Total: ~1 day for complete transition</li>
              </ul>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}