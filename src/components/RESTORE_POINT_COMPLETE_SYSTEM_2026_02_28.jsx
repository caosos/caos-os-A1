# Complete System Restore Point - 2026-02-28
**Status**: LOCKED - Full system blueprint for recovery and audit.
**Timestamp**: 2026-02-28 18:00:00 UTC (Chicago timezone backup)

---

## SECTION 1: BACKEND ARCHITECTURE

### Core Backend Functions
All functions located in `functions/` directory, deployed on Deno.

#### Message Pipeline
- **hybridMessage.js**: Main message handler
  - Route: POST /functions/hybridMessage
  - Auth: Required (base44.auth.me())
  - Input: { input, session_id, file_urls, limit }
  - Output: { reply, mode, request_id, response_time_ms, tool_calls, execution_receipt, wcw_budget, wcw_used, rotation_needed, context_seed }
  - Purpose: Unified message processing with recall, heuristics, token tracking

#### Text-to-Speech
- **textToSpeech.js**: OpenAI TTS handler
  - Route: POST /functions/textToSpeech
  - Auth: Required
  - Input: { text, voice, speed }
  - Output: Audio blob (audio/mpeg)
  - Purpose: Convert AI responses to speech (OpenAI TTS models)
  - API: OpenAI v1/audio/speech endpoint

#### Transcription
- **transcribeAudio.js**: Audio transcription
  - Route: POST /functions/transcribeAudio
  - Auth: Required
  - Input: { audioFile }
  - Output: { transcript }

#### System Diagnostics
- **systemHealth.js**: System status checks
  - Route: GET /functions/systemHealth
  - Output: { db_status, openai_status, latency_ms }

#### Search & Recall
- **diagnosticRecall.js**: Memory recall system
  - Route: POST /functions/diagnosticRecall
  - Purpose: Retrieve contextual memories based on session

#### Analytics & Tracking
- **inspectPipeline.js**: Pipeline debugging
- **inspectRouting.js**: Route tracing
- **testRouteTrace.js**: Route validation
- **probeReceiptWrite.js**: Diagnostic logging

### Core System Functions (functions/core/)
**Deterministic Working Context Window Management**:
- **wcwBudget.js**: Token budget calculation
- **wcwSelfRegulation.js**: Auto-rotation on budget overflow
- **contextBuilder.js**: Session context assembly
- **contextLoader.js**: Load context from journals
- **tieredRecall.js**: Session/lane/profile/global recall
- **tokenizer.js**: Token counting

**Memory & Anchors**:
- **memoryAnchors.js**: Anchor registration and picking
- **memoryUpdate.js**: Anchor amendments
- **continuousLearning.js**: Learning from sessions

**Execution & Routing**:
- **selectorEngine.js**: Authorization & decision making
- **unifiedGovernanceGate.js**: Policy enforcement
- **deterministicExecutor.js**: Reproducible execution
- **toolExecutor.js**: Tool invocation

**Observability**:
- **receiptLogger.js**: Audit trail persistence
- **stageTracker.js**: Pipeline stage tracking
- **errorEnvelope.js**: Error serialization

### Executor Functions (functions/executors/)
- **webSearchExecutor.js**: Web search tool
- **imageGenerator.js**: Image generation
- **youtubeSearch.js**: YouTube search
- **analyzeThreads.js**: Thread analysis

### Tool Implementations (functions/stages/)
- **resolveIntent.js**: Intent classification
- **routeTool.js**: Tool routing decision
- **executeTool.js**: Tool execution wrapper
- **applyCognitiveLayer.js**: Cognitive enhancement
- **formatResult.js**: Response formatting
- **renderer.js**: Final rendering

---

## SECTION 2: DATABASE SCHEMA (ENTITIES)

### Core Entities

#### 1. **User** (Built-in)
- **Fields**:
  - id (auto)
  - email (read-only)
  - full_name (read-only)
  - role (editable) - default: 'user', 'admin'
  - created_date (auto)
- **Security**: role='admin' required for bulk operations
- **Purpose**: Authentication and authorization

#### 2. **Conversation**
- **Fields**:
  - title (string) - conversation name
  - last_message_preview (string)
  - last_message_time (date-time)
  - summary (string) - detailed summary with key points
  - keywords (array) - extracted topics
  - message_count (number)
  - created_by (string) - user email
- **Relationships**: 1 user -> N conversations
- **Purpose**: Group messages by topic/session

#### 3. **Message**
- **Fields**:
  - conversation_id (string) - FK to Conversation
  - role (enum) - 'user' | 'assistant'
  - content (string) - message text
  - token_count (number) - for WCW tracking
  - file_urls (array) - attached files
  - generated_files (array) - AI-generated outputs
  - tool_calls (array) - function calls made
  - response_time_ms (number)
  - timestamp (date-time)
  - reactions (array) - emoji reactions to text
  - replies (array) - inline thread replies
  - execution_receipt (object) - from DiagnosticReceipt
- **Purpose**: Store conversation history

#### 4. **Record** (Plane B - Authoritative)
- **Fields**:
  - record_id (string) - unique identifier
  - profile_id (string) - user-level owner
  - session_id (string) - conversation/thread
  - lane_id (string) - isolation scope
  - tier (enum) - 'session' | 'lane' | 'profile' | 'global'
  - seq (number) - sequence in session
  - ts_snapshot_iso (date-time)
  - ts_snapshot_ms (number)
  - role (enum) - 'user' | 'assistant' | 'system' | 'tool'
  - message (string) - verbatim content
  - correlator_id (string) - tie turn→recall→response
  - token_count (number)
  - status (enum) - 'active' | 'superseded' | 'pending_resolution' | 'archived'
  - superseded_by (string) - amendment chain
  - lineage_id (string) - amendment family
  - hash (string) - SHA-256 content hash
- **Purpose**: Authoritative storage with amendment support

#### 5. **SessionContext**
- **Fields**:
  - session_id (string)
  - lane_id (string)
  - wcw_budget (number) - default: 8000
  - wcw_used (number) - tokens in context
  - last_seq (number)
  - last_request_ts (number)
  - last_activity_ts (number) - for TTL
  - context_paths (array) - active journal paths
  - kernel_context_valid (boolean)
  - bootloader_context_valid (boolean)
- **Purpose**: Track WCW and session state

#### 6. **Lane**
- **Fields**:
  - session_id (string)
  - lane_name (string) - e.g., 'ui', 'backend', 'immigration'
  - hot_messages (array) - last 5 messages
  - summary (string) - warm context
  - message_count (number)
- **Purpose**: Isolate concerns by topic

#### 7. **Anchor**
- **Fields**:
  - anchor_id (string) - UUID
  - profile_id (string) - profile owner
  - lane_id (string) - isolation scope
  - anchor_type (enum) - 'GLOBAL' | 'LANE' | 'VARIANT'
  - scope (enum) - 'session' | 'lane' | 'profile' | 'system'
  - tags (array) - searchable tags
  - content (string) - anchor value
  - created_ts (number)
  - authority_level (enum) - 'user' | 'system' | 'verified'
  - hash (string) - SHA-256
  - prev_hash (string) - amendment chain
  - amendment_head (boolean) - current truth
  - lineage_id (string) - family id
  - mutation_classification (enum) - 'NONE' | 'UPDATE' | 'ARCHIVE' | 'SUPERSEDE'
  - session_id (string) - provenance
  - linked_record_id (string) - Plane B ref
- **Purpose**: Persistent memory with versioning

#### 8. **DiagnosticReceipt**
- **Fields**:
  - request_id (string) - unique ID
  - session_id (string)
  - lane_id (string)
  - message_id (string) - linked message
  - stage (string) - pipeline stage
  - wcw_calculated (number) - actual token count
  - wcw_before (number)
  - wcw_after (number)
  - duration_ms (number)
  - tool_calls (array) - executed tools
  - validation_status (enum) - 'PASS' | 'FAIL'
  - error_code (string) - if failed
  - model_used (string) - e.g., 'gpt-5.2'
  - latency_ms (number)
  - timestamp (date-time)
- **Purpose**: Audit trail for token usage and execution

#### 9. **ErrorLog**
- **Fields**:
  - user_email (string)
  - conversation_id (string)
  - error_type (enum) - 'message_send_failed' | 'timeout' | 'network_error' | 'server_error' | 'unknown'
  - error_message (string)
  - stack_trace (string)
  - lost_message_content (string)
  - lost_message_files (array)
  - request_payload (object)
  - retry_count (number)
  - resolved (boolean)
  - resolution_notes (string)
  - error_id (string) - GUID for lookup
  - stage (string) - failure location
  - error_code (string) - machine-readable
  - model_used (string)
  - system_version (string)
  - retry_attempted (boolean)
  - latency_ms (number)
- **Security**: read/update/delete requires role='admin'
- **Purpose**: Error tracking and recovery

#### 10. **UserProfile**
- **Fields**:
  - user_email (string)
  - preferred_name (string)
  - assistant_name (string) - default: 'Aria'
  - environment_name (string) - default: 'CAOS'
  - tone (object) - { style, humor_ok, emoji_light, no_scaffold_titles, no_flattery }
  - project (object) - { name, current_focus[], known_friction_points[] }
  - memory_anchors (array) - legacy facts
  - structured_memory (array) - Phase 1 deterministic memory
- **Purpose**: User preferences and profile data

#### 11. **GameToken**
- **Fields**:
  - user_email (string)
  - task_type (enum) - 'homework' | 'chores' | 'other'
  - task_description (string)
  - tokens_earned (number)
  - approved_by (string) - parent email
  - approved (boolean)
  - spent (boolean)
  - game_minutes_granted (number)
- **Purpose**: Parent-child game time management

#### 12. **ThreadSnapshot**
- **Fields**:
  - snapshot_id (string)
  - session_id (string)
  - snapshot_ts (number)
  - compressed_seed (string) - context seed
  - anchor_pack (array) - included anchors
  - integrity_hash (string)
  - token_count_at_snapshot (number)
  - rotation_reason (enum) - 'token_limit' | 'manual' | 'policy'
  - lane_summaries (array)
- **Purpose**: Savepoints for context rotation

#### 13. **ConfigChangeLog**
- **Fields**:
  - change_id (string)
  - config_type (enum) - 'validator' | 'mode_settings' | 'memory_policy' | 'token_limits' | 'agent_config' | 'system_prompt'
  - changed_by (string)
  - previous_value (object)
  - new_value (object)
  - change_timestamp_ms (number)
  - change_timestamp_iso (date-time)
  - applied_to_sessions (array)
  - drift_detected (boolean)
- **Purpose**: Audit system configuration changes

#### 14. **DriftEvent**
- **Fields**:
  - event_id (string)
  - session_id (string)
  - detected_ts (number)
  - drift_type (enum) - 'lexical_ambiguity_spike' | 'tool_behavior_mismatch' | 'hash_continuity_break' | 'selector_conflict' | 'manifest_violation' | 'unauthorized_memory_write'
  - severity (enum) - 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  - layer (string) - system layer
  - details (object)
  - corrective_action (string)
  - resolved (boolean)
  - resolved_ts (number)
- **Purpose**: System integrity monitoring

#### 15. **SelectorDecision**
- **Fields**:
  - decision_id (string)
  - session_id (string)
  - selector_invoked (boolean)
  - context_valid (boolean)
  - recall_authorized (boolean)
  - recall_tiers_allowed (array)
  - recall_limit (number)
  - inference_allowed (boolean)
  - tools_allowed (array)
  - response_mode (enum) - 'ANSWER' | 'CLARIFY' | 'HALT_EXPLAINED'
  - halt_reason (string)
  - forward_path (string)
  - wcw_impact_estimate (number)
- **Purpose**: Authorization decisions per turn

#### 16. **RetrievalReceipt**
- **Fields**:
  - request_id (string)
  - intent (enum) - 'LIST_THREADS' | 'SEARCH_THREADS'
  - route (string)
  - scope (enum) - 'title_index'
  - normalized_terms (array)
  - token_hits (object)
  - match_count (number)
  - formatter (string)
  - duration_ms (number)
  - validation_status (enum) - 'PASS' | 'FAIL'
  - error_reason (string)
- **Purpose**: Search operation tracking

#### 17-19. **Supporting Entities**
- **ContextJournal**: Journal entries for context evolution
- **SessionManifest**: Bound session configuration (model, capabilities, policy_gating)
- **LexicalRule**: Normalization rules for term standardization

---

## SECTION 3: API CONTRACTS

### Frontend SDK Usage (base44 client)
```javascript
// Authentication
await base44.auth.me()
await base44.auth.isAuthenticated()
await base44.auth.logout()
await base44.auth.updateMe(data)

// Entities (CRUD)
await base44.entities.Message.list()
await base44.entities.Message.filter({ conversation_id: '...' })
await base44.entities.Message.create({ ... })
await base44.entities.Message.update(id, { ... })
await base44.entities.Message.delete(id)
await base44.entities.Message.schema()

// Functions
const response = await base44.functions.invoke('hybridMessage', { ... })
// Returns: { data, status, headers } (axios response)

// Analytics
await base44.analytics.track({ eventName: '...', properties: { ... } })
```

### Function Response Contracts

#### hybridMessage Response
```json
{
  "reply": "string - AI response",
  "mode": "NORMAL | SESSION_RESUME_NOOP",
  "request_id": "uuid",
  "response_time_ms": 5000,
  "tool_calls": [
    {
      "name": "string",
      "status": "completed | failed",
      "arguments_string": "json string",
      "results": "string"
    }
  ],
  "execution_receipt": {
    "request_id": "uuid",
    "session_id": "string",
    "wcw_calculated": 1500,
    "wcw_before": 3000,
    "wcw_after": 1500,
    "model_used": "gpt-5.2",
    "latency_ms": 4200
  },
  "wcw_budget": 8000,
  "wcw_used": 1500,
  "rotation_needed": false,
  "context_seed": "base64-string-or-null"
}
```

#### textToSpeech Response
```
Audio blob (audio/mpeg format)
```

---

## SECTION 4: CRITICAL INTEGRATIONS

### OpenAI
- **API Key**: OPENAI_API_KEY (secret)
- **Models Used**:
  - gpt-5.2 (inference)
  - gpt-4o (fallback)
  - gpt-4o-mini (lightweight)
  - tts-1 (text-to-speech)
- **Endpoints**:
  - v1/chat/completions
  - v1/audio/speech

### Google OAuth
- **Client Secret**: google_oauth_client_secret (secret)
- **Scope**: email, profile
- **Used for**: User authentication

### XAI
- **API Key**: XAI_API_KEY (secret)
- **Purpose**: Alternative LLM provider (future)

---

## SECTION 5: FRONTEND STATE MANAGEMENT

### React Query Keys
```
['tasks'], ['conversations'], ['messages'], ['user'], ['wcw'], etc.
```

### localStorage Keys (caos_* prefix)
```
caos_developer_mode          (bool)
caos_game_mode               (bool)
caos_guest_user              (json)
caos_guest_conversations     (json)
caos_guest_messages          (json)
caos_multi_agent_mode        (bool)
caos_current_lane            (string)
caos_last_conversation       (id)
caos_seed_*                  (context seed)
caos_show_execution          (bool)
caos_voice_preference        (string - openai voice)
caos_speech_rate             (number 0.1-2.0)
caos_google_voice            (string)
caos_google_speech_rate      (number)
caos_last_message_backup     (json)
```

### Component State Hierarchy
```
Chat (orchestrator)
├── User (auth)
├── Conversations (array)
├── Messages (by conversationId)
├── UI States (threads, profile, token, terminal)
├── WCW State (used, budget)
├── Current Lane
└── Current Conversation ID
```

---

## SECTION 6: AUTHENTICATION & AUTHORIZATION

### Rules
1. **Public Routes**: Welcome (no auth required)
2. **Protected Routes**: Chat, Admin (auth required)
3. **Admin-Only Functions**: 
   - Error log viewing/updating
   - System health checks
   - Configuration changes
4. **User Isolation**: Users can only access their own conversations

### Session Management
- Base44 handles OAuth and session persistence
- Token stored in secure cookie
- Auto-logout on 401 response

---

## SECTION 7: ERROR HANDLING PATTERNS

### Standard Pattern
```javascript
try {
  const result = await operation();
  return result;
} catch (error) {
  console.error('[COMPONENT]_ERROR', error.message);
  // Log to ErrorLog entity if authenticated
  toast.error(user-friendly message);
  // Retry with exponential backoff or fallback
}
```

### Timeout Handling
- Default timeout: 300 seconds (5 minutes)
- User notified via toast
- Message backed up to localStorage
- Error logged for audit

### Network Failures
- Show inline error message
- Offer retry button
- Keep user message in input
- Store in ErrorLog for recovery

---

## SECTION 8: DATA VALIDATION

### Entity Schemas (stored in entities/*.json)
- All defined with JSON Schema validation
- Required fields enforced at creation
- Enums validated on assignment
- Arrays type-checked
- Objects validated recursively

### Frontend Validation
- ChatInput validates non-empty content or files
- File upload checks MIME type
- Message length capped at 4096 chars (post-cleaning)

---

## SECTION 9: SYSTEM FLOW DIAGRAMS

### Message Send Flow
```
User Input (ChatInput)
    ↓
Backup to localStorage
    ↓
Create temp message (UI optimism)
    ↓
Call hybridMessage(input, session_id, file_urls)
    ↓
Backend Processing:
  - Recall execution (if authorized)
  - Intent classification
  - Tool routing & execution
  - Response generation
  - Token calculation
  - Audit logging
    ↓
Return { reply, execution_receipt, wcw_* }
    ↓
Update WCW display
    ↓
Persist user + AI messages to DB
    ↓
Update conversation metadata
    ↓
Clear localStorage backup
    ↓
Scroll to bottom
```

### Session Resume Flow
```
User selects conversation
    ↓
Load messages from DB (lazy)
    ↓
Call hybridMessage with "__SESSION_RESUME__"
    ↓
Backend validates session alignment
    ↓
Returns SESSION_RESUME_NOOP (silent)
    ↓
Session state restored
```

### WCW Rotation Flow
```
Message sent
    ↓
Calculate tokens: old_used + new_tokens
    ↓
If wcw_used > wcw_budget (rotation_needed = true)
    ↓
Backend creates context_seed
    ↓
Create new conversation with title "(continued)"
    ↓
Return context_seed to frontend
    ↓
Frontend stores: localStorage[`caos_seed_${newConvoId}`]
    ↓
Next message in new conversation loads seed
    ↓
Seamless handoff with context preservation
```

---

## SECTION 10: CRITICAL DO NOTs

### Database
1. ❌ Do NOT delete Message records directly (use soft delete via status)
2. ❌ Do NOT modify Record hash or lineage_id
3. ❌ Do NOT allow users to see other users' conversations
4. ❌ Do NOT update wcw_used without token recalculation

### Backend
1. ❌ Do NOT bypass selector engine for authorization
2. ❌ Do NOT execute tools without decision receipt
3. ❌ Do NOT lose request_id for audit trail
4. ❌ Do NOT return sensitive user data in error messages
5. ❌ Do NOT skip token counting

### Frontend
1. ❌ Do NOT trust localStorage alone for auth
2. ❌ Do NOT display raw error stacks to users
3. ❌ Do NOT lose message backups on page reload
4. ❌ Do NOT override session resumption logic
5. ❌ Do NOT modify WCW display without backend data

### Security
1. ❌ Do NOT expose secrets in logs
2. ❌ Do NOT allow CORS from untrusted origins
3. ❌ Do NOT store passwords (use OAuth)
4. ❌ Do NOT skip email verification for sensitive actions
5. ❌ Do NOT allow bulk operations without role='admin'

---

## SECTION 11: DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All secrets set (OPENAI_API_KEY, XAI_API_KEY, google_oauth_client_secret)
- [ ] Database migrations applied
- [ ] Entity schemas validated
- [ ] Function tests passing
- [ ] Error logging functional
- [ ] Rate limiting configured
- [ ] CORS policy set

### Post-Deployment
- [ ] System health check passed
- [ ] OAuth flow tested
- [ ] Message send end-to-end tested
- [ ] Error recovery tested
- [ ] Backup verification passed
- [ ] Monitoring alerts configured

---

## SECTION 12: RECOVERY PROCEDURES

### If Messages Lost
1. Check ErrorLog for lost_message_content
2. Restore from localStorage backup (caos_last_message_backup)
3. Re-send if both missing
4. Check ThreadSnapshot for context

### If Conversations Corrupted
1. Check DiagnosticReceipt for audit trail
2. Restore from last ThreadSnapshot
3. Rebuild Lane summaries
4. Revalidate Anchor chains

### If Auth Broken
1. Clear all localStorage (caos_* keys)
2. Clear session storage
3. Restart OAuth flow
4. Verify User entity not deleted

### If WCW Calculation Wrong
1. Recalculate from Message.token_count
2. Sum all tokens in SessionContext
3. Validate against DiagnosticReceipt
4. Trigger rotation if > budget

---

## SECTION 13: MONITORING & OBSERVABILITY

### Metrics to Track
- Message send latency (target < 5s)
- Error rate (target < 0.1%)
- WCW utilization (alert if > 80%)
- Session duration (typical: 30-120 min)
- Tool execution success rate (target > 95%)

### Audit Trail
- Request ID: Unique for every operation
- Stage tracking: Which pipeline stage?
- Execution receipt: Stored on Message entity
- Error logging: All failures captured
- Config changes: All stored in ConfigChangeLog

### Alerts to Configure
- System health degradation
- Error spike (>10 errors in 5 min)
- WCW exhaustion (rotation triggered)
- Auth failures (>5 in 5 min)
- API timeout (>3s latency)

---

## SECTION 14: TTS ARCHITECTURE (Updated 2026-03-15)

### TWO DISTINCT TTS SYSTEMS (CRITICAL — DO NOT MIX)

**System 1: Input Bar TTS (Google Web Speech API)**
- **Component**: components/chat/ChatInputReadAloud.jsx
- **API**: window.speechSynthesis + SpeechSynthesisUtterance
- **Trigger**: Click button on far left of input bar
- **Voice Storage**: localStorage[caos_google_voice] (default: 'Google US English')
- **Speed Storage**: localStorage[caos_google_speech_rate] (0.5–2.0x)
- **Content**: Reads lastAssistantMessage prop (user-triggered, not auto-play)
- **Settings**: Right-click on button → VoiceSettingsMenu modal
- **Status**: Button turns green while playing
- **Player**: Native HTML range input (progress bar), play/pause/skip/stop controls
- **Keep-Alive**: Checks every 5s if paused, resumes if needed (Chrome background optimization fix)
- **Session Safety**: _sessionId counter prevents ghost playback after stop
- **Lock**: CAOS_GOOGLE_TTS_LOCK_v1_2026-03-15

**System 2: Message Bubble TTS (OpenAI TTS)**
- **Component**: components/chat/ChatBubble.jsx (lines 110–298)
- **API**: base44.functions.invoke('textToSpeech', { text, voice, speed })
- **Trigger**: Click Volume2 icon on hover over assistant message
- **Voice Storage**: localStorage[caos_voice_preference_message]
- **Speed Storage**: localStorage[caos_speech_rate]
- **Content**: Cleans emojis, markdown from message content, caps at 4096 chars
- **Cache**: audioCache Map by (message.id + voice + speed)
- **Player**: Full HTML5 Audio with progress scrubbing, ±10s skip, play/pause, stop
- **Status**: Button turns blue while playing, progress bar shown below message
- **Global Manager**: Only one audio plays at a time (globalAudioInstance)
- **Lock**: Inherited from ChatBubble architecture (do not modify)

### CRITICAL RULES
1. ❌ Do NOT mix Google API with OpenAI API
2. ❌ Do NOT add OpenAI to input bar (input bar = Google only)
3. ❌ Do NOT remove input bar button
4. ❌ Do NOT make input bar auto-play (user-triggered only)
5. ❌ Do NOT modify message bubble TTS at all
6. ✅ Right-click input bar button → voice settings (Google Web Speech voices)
7. ✅ Input bar always available, reads last assistant message, user controls playback

---

## Last Validated
- **Date**: 2026-03-15 (Updated: TTS architecture clarified, session-safe implementation)
- **Status**: System locked for stability
- **Test Coverage**: All core paths validated, TTS dual-system separation confirmed
- **Recent Work** (TSB-041, TSB-042, TSB-043):
  - ChatInputReadAloud session-safe refactor (_sessionId counter)
  - VoiceSettingsMenu component for right-click voice/speed settings
  - App.jsx manual route rebuilding (removed pages.config dependency)
- **Next Critical Task**: Update TSBs with documentation of TTS dual-system and recent fixes