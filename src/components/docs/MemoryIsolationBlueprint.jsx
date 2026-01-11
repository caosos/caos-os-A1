import React from 'react';
import { Brain, Users, Lock, Database } from 'lucide-react';

export default function MemoryIsolationBlueprint() {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-[#0a1628] text-white">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold">CAOS-A1 Memory Isolation Blueprint</h1>
        </div>
        <p className="text-white/60">Session-Based Context Separation Architecture</p>
      </div>

      {/* Overview */}
      <section className="mb-8 bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Core Principle
        </h2>
        <p className="text-white/80 leading-relaxed mb-4">
          Each conversation is assigned a <strong>unique session ID</strong> that serves as the 
          complete isolation boundary. All memory, context, and state are scoped to this session ID, 
          ensuring zero cross-contamination between users or conversations.
        </p>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-4">
          <p className="text-blue-300 text-sm">
            <strong>Golden Rule:</strong> Session ID = Memory Boundary. No session ID sharing = No memory sharing.
          </p>
        </div>
      </section>

      {/* UI Layer */}
      <section className="mb-8 bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-400" />
          UI Layer: Session ID Generation
        </h2>
        
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded p-4">
            <h3 className="font-semibold text-green-300 mb-2">Authenticated Users</h3>
            <pre className="text-xs text-white/70 bg-black/30 p-3 rounded overflow-x-auto">
{`// When creating new conversation
const conversation = await base44.entities.Conversation.create({
  title: 'New Conversation',
  created_by: user.email
});

// conversation.id is a UUID from Base44
// e.g., "550e8400-e29b-41d4-a716-446655440000"

// This UUID is sent as "session" to CAOS backend
POST /api/message
{
  "session": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Hello"
}`}</pre>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4">
            <h3 className="font-semibold text-yellow-300 mb-2">Guest Users</h3>
            <pre className="text-xs text-white/70 bg-black/30 p-3 rounded overflow-x-auto">
{`// Guest session IDs use timestamp-based generation
const guestSessionId = 'guest_' + Date.now();
// e.g., "guest_1736640000000"

// Still sent as "session" to backend
POST /api/message
{
  "session": "guest_1736640000000",
  "message": "Hello"
}`}</pre>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded p-4">
            <h3 className="font-semibold text-purple-300 mb-2">Server ARIA (curl/direct)</h3>
            <pre className="text-xs text-white/70 bg-black/30 p-3 rounded overflow-x-auto">
{`# Specify your own session ID for isolated testing
curl -X POST https://your-server/api/message \\
  -H "Content-Type: application/json" \\
  -d '{
    "session": "aria_dev_session_001",
    "message": "System diagnostic"
  }'

# Different session = completely isolated memory
curl -X POST https://your-server/api/message \\
  -H "Content-Type: application/json" \\
  -d '{
    "session": "aria_dev_session_002",
    "message": "Another test"
  }'`}</pre>
          </div>
        </div>
      </section>

      {/* Storage Layer */}
      <section className="mb-8 bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          Storage Layer: Filesystem Isolation
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-white/90 mb-2">Account-Level Directory Isolation</h3>
            <p className="text-white/70 text-sm mb-3">
              Each user account gets a completely isolated directory structure. All data (Plane B, indexes, exports, metrics, sessions) 
              are stored in account-specific directories, ensuring filesystem-level isolation.
            </p>
            <pre className="text-xs text-white/70 bg-black/30 p-4 rounded overflow-x-auto">
{`/data/
├── accounts/
│   ├── michael-chambers/          # Account 1
│   │   ├── plane_b/                # SQLite database (authoritative)
│   │   ├── anchor_index/           # Anchor mapping tables
│   │   ├── exports/                # JSONL export files
│   │   ├── metrics/                # Performance metrics
│   │   └── sessions/               # Session-specific data
│   │
│   ├── user_<uuid_1>/             # Account 2
│   │   ├── plane_b/
│   │   ├── anchor_index/
│   │   ├── exports/
│   │   ├── metrics/
│   │   └── sessions/
│   │
│   └── user_<uuid_n>/             # Account N
│       └── ...                     # Fully isolated
│
└── system/                         # Shared system resources
    ├── schemas/                    # Anchor schema definitions
    ├── policies/                   # Access control policies
    ├── evaluators/                 # Validation rules
    └── tooling/                    # Admin utilities`}</pre>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-4">
            <h3 className="font-semibold text-cyan-300 text-sm mb-2">Isolation Benefits</h3>
            <ul className="text-xs text-white/70 space-y-1">
              <li>• <strong>Physical separation:</strong> No shared database files between accounts</li>
              <li>• <strong>Backup isolation:</strong> Account data can be backed up independently</li>
              <li>• <strong>Migration:</strong> Entire account can be moved without affecting others</li>
              <li>• <strong>Deletion:</strong> Account removal is a simple directory delete</li>
              <li>• <strong>Quotas:</strong> Filesystem quotas can be enforced per account</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Backend Layer */}
      <section className="mb-8 bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          Backend: Session-Level SQLite Isolation
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-white/90 mb-2">1. Memory Storage Schema</h3>
            <pre className="text-xs text-white/70 bg-black/30 p-4 rounded overflow-x-auto">
{`# SQLite Schema (Plane B)
CREATE TABLE conversations (
  session_id TEXT PRIMARY KEY,      -- Isolation key
  created_at TIMESTAMP,
  last_updated TIMESTAMP,
  metadata JSON                     -- Title, user info, etc.
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  session_id TEXT,                  -- Foreign key to conversations
  role TEXT,                        -- 'user' or 'assistant'
  content TEXT,
  timestamp TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES conversations(session_id)
);

CREATE INDEX idx_session ON messages(session_id);`}</pre>
          </div>

          <div>
            <h3 className="font-semibold text-white/90 mb-2">2. Query Isolation Pattern</h3>
            <pre className="text-xs text-white/70 bg-black/30 p-4 rounded overflow-x-auto">
{`# Python Backend (FastAPI + SQLite)
def get_conversation_history(session_id: str) -> List[Message]:
    """
    Retrieve ONLY messages for this specific session.
    Zero risk of cross-session leakage.
    """
    query = """
        SELECT role, content, timestamp 
        FROM messages 
        WHERE session_id = ?
        ORDER BY timestamp ASC
    """
    return db.execute(query, [session_id]).fetchall()

def save_message(session_id: str, role: str, content: str):
    """
    All writes are scoped to session_id.
    """
    db.execute(
        "INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
        [session_id, role, content, datetime.now()]
    )`}</pre>
          </div>

          <div>
            <h3 className="font-semibold text-white/90 mb-2">3. Request Handler Implementation</h3>
            <pre className="text-xs text-white/70 bg-black/30 p-4 rounded overflow-x-auto">
{`@app.post("/api/message")
async def handle_message(request: MessageRequest):
    session_id = request.session  # CRITICAL: Extract session from request
    
    # 1. Load conversation history (isolated by session_id)
    history = get_conversation_history(session_id)
    
    # 2. Save user message (isolated by session_id)
    save_message(session_id, "user", request.message)
    
    # 3. Build context from this session's history only
    context = build_context_from_history(history)
    
    # 4. Call LLM with session-scoped context
    response = await call_llm(context, request.message)
    
    # 5. Save assistant response (isolated by session_id)
    save_message(session_id, "assistant", response)
    
    return {"reply": response, "session": session_id}`}</pre>
          </div>
        </div>
      </section>

      {/* Verification */}
      <section className="mb-8 bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Isolation Verification Tests</h2>
        
        <div className="space-y-3">
          <div className="bg-white/5 border border-white/10 rounded p-3">
            <h3 className="font-semibold text-sm mb-2">Test 1: Parallel Sessions</h3>
            <pre className="text-xs text-white/60 bg-black/30 p-2 rounded">
{`# Session A
curl -d '{"session":"A","message":"My name is Alice"}' /api/message
# Response: "Hello Alice"

# Session B
curl -d '{"session":"B","message":"What is my name?"}' /api/message
# Response: "I don't know your name" ✓ (no cross-talk)`}</pre>
          </div>

          <div className="bg-white/5 border border-white/10 rounded p-3">
            <h3 className="font-semibold text-sm mb-2">Test 2: Context Persistence</h3>
            <pre className="text-xs text-white/60 bg-black/30 p-2 rounded">
{`# Session A - First message
curl -d '{"session":"A","message":"Remember: my favorite color is blue"}' /api/message

# Session A - Second message (same session)
curl -d '{"session":"A","message":"What's my favorite color?"}' /api/message
# Response: "Blue" ✓ (memory within session)`}</pre>
          </div>

          <div className="bg-white/5 border border-white/10 rounded p-3">
            <h3 className="font-semibold text-sm mb-2">Test 3: Server ARIA Independence</h3>
            <pre className="text-xs text-white/60 bg-black/30 p-2 rounded">
{`# User session via UI (auto-generated UUID)
POST /api/message {"session":"550e8400-...","message":"User query"}

# Server ARIA curl (custom session ID)
curl -d '{"session":"aria_admin_001","message":"System check"}' /api/message

# No interference - completely isolated ✓`}</pre>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Best Practices</h2>
        <ul className="space-y-2 text-white/80 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span><strong>Always validate session ID exists</strong> before any database operation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span><strong>Never share session IDs</strong> between users or conversations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span><strong>Log session ID</strong> in all backend operations for audit trails</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span><strong>Use database transactions</strong> to ensure atomic writes per session</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-1">✗</span>
            <span><strong>Don't use global variables</strong> for storing session state</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-1">✗</span>
            <span><strong>Don't cache across sessions</strong> without explicit session scoping</span>
          </li>
        </ul>
      </section>

      {/* Footer */}
      <div className="mt-8 text-center text-white/40 text-xs">
        CAOS-A1 Memory Isolation Blueprint v1.0 | Session-Based Architecture
      </div>
    </div>
  );
}