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
            <p className="text-xl text-blue-300">Complete Technical Specification</p>
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
│  • Chat UI                                  │
│  • Message Display                          │
│  • File Upload                              │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│      BACKEND FUNCTIONS (Deno)              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   caosMessage                       │   │
│  │   • Entry point for all messages    │   │
│  │   • Session management              │   │
│  │   • Context assembly                │   │
│  │   • AI coordination                 │   │
│  └─────────────┬───────────────────────┘   │
│                │                            │
│                ▼                            │
│  ┌─────────────────────────────────────┐   │
│  │   AI PROVIDER API                   │   │
│  │   • InvokeLLM (current)            │   │
│  │   • Grok API (proposed)            │   │
│  │   • With tool definitions          │   │
│  └─────────────┬───────────────────────┘   │
│                │                            │
│                ▼                            │
│  ┌─────────────────────────────────────┐   │
│  │   TOOLS (executed by backend)       │   │
│  │   • Internet Search                 │   │
│  │   • Vision Analysis                 │   │
│  │   • File Operations                 │   │
│  │   • Memory Recall                   │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│        DATABASE (Base44 Entities)           │
│  • Record (messages)                        │
│  • SessionContext (state)                   │
│  • UserFile (attachments)                   │
└─────────────────────────────────────────────┘
                `}</pre>
              </div>
            </div>
          </section>

          {/* MESSAGE FLOW */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">2. Message Flow</h2>
            
            <div className="space-y-6">
              <div className="bg-green-950/50 p-4 rounded-lg border border-green-500/30">
                <h3 className="text-lg font-semibold text-green-300 mb-3">Step 1: User sends message</h3>
                <pre className="text-sm overflow-x-auto text-gray-200">{`
// Frontend calls backend
const response = await base44.functions.invoke('caosMessage', {
  input: "What's the weather like?",
  session_id: "sess_12345",
  file_urls: [], // optional attachments
  limit: 20 // conversation history limit
});
                `}</pre>
              </div>

              <div className="bg-purple-950/50 p-4 rounded-lg border border-purple-500/30">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">Step 2: Backend processes</h3>
                <pre className="text-sm overflow-x-auto text-gray-200">{`
// caosMessage function:
1. Authenticate user
2. Get/create session context
3. Load recent conversation history (20 messages)
4. Detect intent from user message:
   - Search keywords → enable internet tool
   - Image upload → enable vision tool
   - File keywords → enable file tool
5. Build system prompt + conversation context
6. Call AI API with tools
7. Store user message + AI response in database
8. Return response to frontend
                `}</pre>
              </div>

              <div className="bg-blue-950/50 p-4 rounded-lg border border-blue-500/30">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">Step 3: AI responds</h3>
                <pre className="text-sm overflow-x-auto text-gray-200">{`
AI has access to tools and decides:
- Just answer → Direct text response
- Need search → Call internet_search tool
- Need vision → Call vision_analysis tool
- Need memory → Call recall_memory tool

Tools execute, results returned to AI, AI generates final response
                `}</pre>
              </div>
            </div>
          </section>

          {/* AI API INTEGRATION */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">3. AI API Integration Points</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-white">Current: InvokeLLM</h3>
                <pre className="bg-slate-950/80 p-4 rounded-lg text-sm overflow-x-auto border border-slate-700">{`
const llmResult = await base44.integrations.Core.InvokeLLM({
  prompt: systemPrompt + "\\n\\nUser: " + userMessage,
  add_context_from_internet: true, // enables search
  file_urls: ["url1", "url2"], // for vision
  response_json_schema: null // optional structured output
});

// Returns: string response
                `}</pre>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 text-white">Proposed: Grok API</h3>
                <pre className="bg-slate-950/80 p-4 rounded-lg text-sm overflow-x-auto border border-slate-700">{`
// Using xAI Grok API
const response = await fetch('https://api.x.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer XAI_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'grok-beta',
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

// Handle tool calls
if (response.choices[0].message.tool_calls) {
  for (const toolCall of response.choices[0].message.tool_calls) {
    const result = await executeToolFunction(
      toolCall.function.name, 
      JSON.parse(toolCall.function.arguments)
    );
    // Send result back to Grok for final response
  }
}
                `}</pre>
              </div>
            </div>
          </section>

          {/* TOOL DEFINITIONS */}
          <section className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-300">4. Tool Definitions & Execution</h2>
            
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