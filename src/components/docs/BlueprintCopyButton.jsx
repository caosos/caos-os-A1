import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function BlueprintCopyButton() {
Generated: Mar 2, 2026
==========================================

YOU ARE A NEW AGENT INHERITING THE CAOS CODEBASE.
STOP. DO NOT TOUCH ANYTHING YET.

Your first and only job right now is to read this entire document.
Read ALL of it — especially:
  - Section 0: Agent Onboarding Contract (standing rules — non-negotiable)
  - Section 2: hybridMessage pipeline (the spine — LOCKED)
  - Section 9: What is NOT yet active (don't accidentally activate it)
  - The TSB log: know what has broken before and why

LOCKED FILES — DO NOT TOUCH WITHOUT EXPLICIT OWNER APPROVAL + TSB ENTRY:
  - functions/hybridMessage
  - functions/textToSpeech
  - functions/transcribeAudio
  - components/chat/ChatBubble (TTS path)
  - components/chat/VoiceSettings
  - components/chat/ChatInputReadAloud
  - functions/core/memoryEngine
  - functions/core/heuristicsEngine
  - functions/core/receiptWriter
  - functions/core/errorEnvelopeWriter

RULES (from Section 0):
  1. Never modify a LOCKED file without a TSB entry + owner approval in THIS session
  2. Max 200 lines preferred / 400 lines hard limit per file
  3. Build → Test → Lock. Nothing ships without all three gates.
  4. No silent writes. No background state changes.
  5. Pull-only awareness. No polling, no push-based state injection.
  6. Aria != CAOS. Never conflate the persona with the platform.

Do not confirm you have read it. Do not ask what to do next.
Wait for the owner to tell you what they need.

==========================================
SECTION 0 — AGENT ONBOARDING CONTRACT
==========================================

WARNING: READ THIS FIRST — applies to every agent, every session, every change.
These are standing requirements established by the system owner. They are not suggestions.

1. MODULARITY IS NON-NEGOTIABLE
Every function, component, and module must do ONE thing.
No monolithic files. No "utility dump" files.
If a file is doing more than one job, it needs to be split.
RULE: A new agent must never consolidate separate modules into a single file just for convenience.

2. FILE SIZE HARD LIMITS
PREFERRED maximum:  200 lines per file
HARD maximum:       400 lines per file
If a file exceeds 400 lines, it MUST be refactored before new features are added. No exceptions.
ENFORCEMENT:
  - hybridMessage is currently ~620 lines — flagged for refactor (see Section 10)
  - New files must be created focused from the start
  - Components > 200 lines should be broken into sub-components immediately

3. PHASED DEVELOPMENT — BUILD → TEST → LOCK
Nothing is shipped to production without passing through all three gates:
  BUILD:  Implement the feature in isolation. No side effects on locked modules.
  TEST:   Verify the feature works. Use test_backend_function. Confirm receipts.
  LOCK:   Once tested and confirmed, mark the feature as LOCKED in this blueprint.
          Add a LOCK_SIGNATURE comment in the source file.
          Locked features are OFF LIMITS. Do not touch them without TSB entry.
RULE: Never modify a LOCKED feature without:
  a) Creating a TSB entry explaining why
  b) Getting explicit approval from the owner in the current session
  c) Re-testing and re-locking after the change

4. API CALL MINIMALISM — MINIMAL DATA, MAXIMUM INTEGRITY
Every API call must send the MINIMUM data required to accomplish the task.
RULES:
  - Do not send fields that are not needed for the operation
  - Do not fetch more records than required (use limits, filters, sorts)
  - Do not inject large payloads into system prompts when a summary will do
  - Do not make multiple sequential API calls when one will suffice
  - Do not send conversation history you don't need — compress it first
RATIONALE: Every byte sent is a cost. Every unnecessary field is a liability.
APPLIED EXAMPLE (hybridMessage):
  CORRECT: filter({ conversation_id }, '-created_date', 100)
  WRONG:   list() then filter in memory (fetches everything)

5. NO SILENT WRITES. NO SURPRISE STATE CHANGES.
Every write to any entity must be:
  a) Explicitly triggered by a user action or a deterministic pipeline stage
  b) Logged with a receipt (what was written, when, by which stage)
  c) Traceable back to an error log if it fails
RULE: Background writes are BANNED unless gated behind explicit user toggle AND reviewed in blueprint.
See TSB-004 for what happens when this rule is violated.

6. SELFINSPECT — SOURCE CODE AUDIT LAYER
Module:   functions/core/selfInspect  (LAYER 2 — READ-ONLY)
Purpose:  Allows Aria to inspect CAOS source code for auditing and suggestions.
Contract: READ-ONLY. PULL-ONLY. No side effects. No writes. No execution.
PLATFORM CONSTRAINT (confirmed Mar 1, 2026):
  The Base44 Deno sandbox does NOT expose a self-read API for deployed function source.
  selfInspect provides an ALLOWLIST of 52 inspectable files and their metadata.
  Actual source content requires a manual paste from the dashboard or editor.
RULE: selfInspect is the ONLY sanctioned path for Aria to reason about source code.

7. NEW AGENT CHECKLIST
Before making ANY change to this codebase, a new agent must:
  Read Section 0 — understand the standing contracts
  Read Section 2 — understand the hybridMessage pipeline
  Read Section 3 — understand Phase A memory (LOCKED — do not touch)
  Check Section 9 — confirm what is NOT yet active (don't accidentally activate it)
  Check the TSB log — understand what has broken before and why
  Confirm the file they're editing is NOT locked (LOCK_SIGNATURE present = stop)
  Confirm their change stays within the 200/400 line limit
  Confirm their change sends minimal data in any API calls added
  Confirm their change has a test path before implementing
  Ask the owner if any of the above is unclear — do not assume

8. AUTHORITY DOMAIN SEPARATION
LOCK_SIGNATURE: CAOS_AUTHORITY_DOMAIN_SEPARATION_v1_2026-03-01
Aria (the AI persona) and CAOS (the platform) are separate authority domains.
They must never be conflated in code, prompts, or documentation.
RULES:
  - Aria speaks. CAOS routes. They do not share identity.
  - Aria must never introduce herself as "CAOS."
  - No module may grant Aria platform-level authority.
  - selfInspect is READ-ONLY. Aria may audit. Aria may never act on source directly.
  - Governance decisions belong to the system owner — not to Aria, not to any agent.
VIOLATION EXAMPLES:
  Aria writes directly to UserProfile without a MEMORY_WRITE stage receipt
  An agent modifies hybridMessage without a TSB entry
  Blueprint is updated by an agent without owner confirmation in the session

9. PULL-ONLY AWARENESS RULE
LOCK_SIGNATURE: CAOS_PULL_ONLY_AWARENESS_v1_2026-03-01
Awareness in CAOS must be pull-based, not push-based.
RULES:
  - Do NOT introduce unnecessary API chatter.
  - Do NOT inject state into the system unless explicitly requested by the pipeline.
  - Do NOT push context, memory, or environmental state proactively into prompts
    unless a deterministic trigger has authorized it.
  - Modules must WAIT to be invoked. They must NOT self-activate or poll.
  - No background threads, no passive watchers, no unsolicited writes.
PULL-BASED PATTERN (correct):
  User sends message → pipeline invokes memoryEngine.detect_recall(input)
  → only if recall detected → memoryEngine.recall() → inject into prompt
PUSH-BASED ANTI-PATTERN (forbidden):
  Module detects "interesting" context → auto-injects into next prompt
ESTABLISHED: Mar 1, 2026. Directive from system owner.

==========================================
SECTION 1 — WHAT CAOS IS
==========================================

CAOS (Cognitive Adaptive Operating Space) is a personal AI assistant platform.
The AI persona is named Aria. CAOS is the platform name — Aria never introduces herself as "CAOS".

Platform:   Base44 (React + Deno serverless functions)
AI:         OpenAI gpt-5.2 (primary — ACTIVE_MODEL in hybridMessage)
            Note: TTS uses tts-1-hd (separate model namespace — see TSB-011)
Storage:    Base44 entities (database)
Auth:       Base44 built-in auth + guest mode
Key file:   functions/hybridMessage (everything runs through here)

==========================================
SECTION 2 — ACTIVE ARCHITECTURE: hybridMessage PIPELINE (LOCKED)
==========================================

All messages flow through a single backend function: hybridMessage.
It is the unified governance gate. There is no separate pipeline runner.

Request → hybridMessage
  1. AUTH: base44.auth.me() — reject if not authenticated
  2. LOAD USER PROFILE: UserProfile entity (structured_memory, anchors, tone, project)
  3. PHASE A: ATOMIC MEMORY SAVE (if input matches trigger phrases)
     - detectMemorySave() → '__VAGUE__' | '__PRONOUN__' | content string | null
     - If vague → ask for clarification (MEMORY_CLARIFY mode)
     - If content → splitAtomicFacts() → saveAtomicMemory() → receipt
     - Returns immediately — BYPASSES inference entirely
  4. LOAD SESSION HISTORY: Message entity, up to 200 messages
     - compressHistory() → HOT_HEAD(20) + summary block + HOT_TAIL(80)
  5. DETERMINISTIC RECALL: if detectMemoryRecall(input)
     - recallStructuredMemory() → keyword match against structured_memory
     - Returns top 10 matched entries, injected into system prompt
  6. HEURISTICS ENGINE v1 (internal — never surfaced in output)
     - classifyIntent() → MEMORY_ACTION | TECHNICAL_DESIGN | PARTNER_REVIEW |
                           EXECUTION_DIRECTIVE | SUMMARY_COMPACT | TOOL_INVOCATION | GENERAL_QUERY
     - calibrateDepth() → COMPACT | STANDARD | LAYERED
     - MEMORY_ACTION bypasses — no directive injected
  7. BUILD SYSTEM PROMPT
     - Aria identity + truth discipline rules
     - OUTPUT FORMAT: prose only, no lists/headers unless asked
     - Recalled memories (if any) | Legacy memory_anchors (filtered, labeled INFERRED)
  8. OPENAI CALL: gpt-5.2, max_tokens=2000
  9. SAVE MESSAGES: Message entity (user + assistant)
  10. BACKGROUND: auto-extract legacy anchors (every 5 turns)
  RETURN: { reply, mode, request_id, execution_receipt, ... }

==========================================
SECTION 3 — MEMORY SYSTEM: PHASE A (LOCKED)
==========================================

Phase A is complete and locked. Deterministic, explicit-only memory saves. No silent saves.

Save Triggers (user must say one of these):
  "I want you to remember..." | "Please remember..." | "Remember this: ..."
  "Remember that..." | "Save this to memory: ..." | "Add this to memory: ..."
  "Note that..." | "Store that..."

Save Flow:
  1. detectMemorySave(input) → extract content string
  2. splitAtomicFacts(content) → split on "X and Y" when both are facts
  3. For each clause: saveOneAtomicEntry() → dedup check → validate
  4. Single DB write: UserProfile.structured_memory updated
  5. Return receipt: { mode: "MEMORY_SAVE", memory_saved: true, entries_created: 1, ... }

Recall Flow:
  detectMemoryRecall(input) → keyword trigger check
  recallStructuredMemory() → extractTags → score by hits
  Returns top 10 matched entries → injected as "RECALLED MEMORY:" block in system prompt
  No full dump. No fabrication. Source labeled "(from memory)".

PHASE B (Typed Schema) and PHASE C (Entity Graph) are reserved. Do not implement yet.

==========================================
SECTION 4 — HEURISTICS ENGINE v1 (LOCKED)
==========================================

Non-invasive formatting layer. Shapes output posture and depth.
Detachable via HEURISTICS_ENABLED = false. Never surfaces labels in output.

Intent Classification:
  MEMORY_ACTION       → save/remember triggers → BYPASSES heuristics entirely
  TECHNICAL_DESIGN    → architect/schema/spec + long input → LAYERED
  PARTNER_REVIEW      → review/thoughts on/critique → STANDARD+
  EXECUTION_DIRECTIVE → run/build/create (short) → COMPACT
  SUMMARY_COMPACT     → summarize/tldr → COMPACT
  TOOL_INVOCATION     → search/find/calculate → STANDARD
  GENERAL_QUERY       → everything else → COMPACT or STANDARD by length

Depth: COMPACT (1-3 sentences) | STANDARD (natural paragraphing) | LAYERED (full analytical depth)

Output Posture:
  - Flowing prose. No bullet lists or section headers unless asked.
  - No praise openers ("Great question!", "Absolutely!")
  - Shared ownership framing ("we could...", "the approach here is...")
  - Calm, direct, architect-level tone

==========================================
SECTION 5 — DATA ENTITIES
==========================================

Core Chat:
  Conversation  — thread metadata
  Message       — individual messages
  UserProfile   — persistent user data (tone, project, memory_anchors, structured_memory)
  UserFile      — uploaded files

Governance (built, partially used):
  Anchor, Record, SessionContext, Lane, LexicalRule, SessionManifest,
  DriftEvent, RetrievalReceipt, ThreadToken/Meta, ErrorLog (ACTIVE), ConfigChangeLog

==========================================
SECTION 6 — FRONTEND STRUCTURE
==========================================

Pages: Welcome, Chat, Admin, Console, Implementation, MemoryIsolation, SystemBlueprint, News

Key Components:
  ChatBubble, ChatBubbleReadAloud (LOCKED), ChatHeader, ChatInput
  ChatInputReadAloud (LOCKED), VoiceSettings (LOCKED), ThreadList, ProfilePanel,
  TokenMeter, ConversationSearch, StarfieldBackground, ExecutionReceipt

Modes (localStorage flags):
  caos_developer_mode, caos_game_mode, caos_multi_agent_mode, caos_guest_user,
  caos_last_conversation, caos_current_lane, caos_voice_preference_message,
  caos_speech_rate, caos_google_voice, caos_google_speech_rate

==========================================
SECTION 7 — BACKEND FUNCTIONS
==========================================

MAIN: hybridMessage (LOCKED)
VOICE: textToSpeech (LOCKED), transcribeAudio (LOCKED), googleTextToSpeech (LOCKED)
THREAD: generateThreadSummary
DIAGNOSTICS: systemHealth, diagnosticSnapshot, diagnosticRecall, inspectPipeline,
             quickInspect, postPatchAudit, runHybridPipeline, generateSystemsReport
MEMORY: testAnchors, extractUserPreference, pinMemory (DEAD — see Section 9)
INTEGRATIONS: grokProvider, checkGrokModels
CORE MODULES (functions/core/ — built, not all active):
  contextBuilder, contextLoader, continuousLearning, deterministicExecutor,
  environmentLoader, errorRecovery, globalBinGovernance, indexPersistence,
  indexedSearch, laneIsolation, latencyTracking, memoryAnchors, memoryUpdate,
  normalize, persistentSearch, receiptLogger, routeRegistry, sanitizer,
  selectorEngine, tieredRecall, tokenizer, toolExecutor, unifiedGovernanceGate,
  wcwBudget, wcwSelfRegulation

==========================================
SECTION 8 — ARIA TRUTH DISCIPLINE (injected every request)
==========================================

1. PRIOR-MENTION CLAIMS: Never say "you mentioned" / "you previously said"
   unless the fact is in STRUCTURED MEMORY or verbatim in session history.
2. NEW INFORMATION RULE: If user introduces a fact now, respond with "Got it —"
3. PREFERENCE CLAIMS: Never assert "you like X" unless in structured_memory. Use "It sounds like..."
4. NO FABRICATION: If a fact isn't stored, say "I don't have that stored."
5. SOURCE LABELING: "(from memory)" | "(from this conversation)" | "(inferred)"

==========================================
SECTION 9 — BUILT BUT NOT YET ACTIVE
==========================================

Lane-based context isolation    — entities exist, not wired into hybridMessage
Plane B (Record entity)         — schema built, not the primary message store
Anchor hash-chain               — entity schema built, not active
ThreadSnapshot / rotation       — built, not triggered
LexicalRule normalization       — entity built, not applied in hybridMessage
Drift detection (DriftEvent)    — entity built, detection not active
SessionManifest capability gate — built, not enforced
Multi-agent blackboard          — UI placeholder only, no backend
CAOS-A1 Python backend          — blueprint documented in /Implementation, NOT deployed

LEGACY / ORPHANED (do not use):
pinMemory — old approach (permanent_memory.md). SUPERSEDED by Phase A structured_memory.
           Not wired into recall. Not injected into prompt. Dead function.

==========================================
SECTION 10 — KNOWN ISSUES & CANDIDATE NEXT WORK
==========================================

KNOWN:
- Memory save strips "that" from "remember that my dog..." (acceptable — content is accurate)
- Legacy memory_anchors still injected as INFERRED context → Phase B will replace
- hybridMessage is 620 lines — consider splitting into sub-modules

CANDIDATE NEXT:
- Phase B: Typed schema normalization for structured_memory entries
- Phase C: Entity graph (link related facts)
- Wire hybridMessage to read UserProfile.tone.style
- Add memory delete/edit capability to MemoryPanel
- Activate LexicalRule normalization (chaos → CAOS)
- Thread auto-summary on conversation close

==========================================
SECTION 11 — READ-ALOUD / TTS LAYER (LOCKED)
==========================================

Two independent paths — DO NOT MERGE THEM.

PATH A — OpenAI TTS (ChatBubble speaker icon):
LOCK_SIGNATURE: CAOS_OPENAI_TTS_LOCK_v1_2026-03-01
Files: components/chat/VoiceSettings.jsx, components/chat/ChatBubbleReadAloud.jsx
Backend: functions/textToSpeech | Model: tts-1-hd (ONLY valid — see TSB-011)
Flow: base44.functions.invoke('textToSpeech', { text, voice, speed })
      → JSON { audio_base64 } → chunked atob() → Uint8Array → Blob → ObjectURL → Audio()
      NOTE: chunked loop required — spread causes stack overflow on large buffers
Voices: alloy | echo | fable | onyx | nova | shimmer (default: nova)

PATH B — Google Web Speech API (ChatInput toolbar):
LOCK_SIGNATURE: CAOS_GOOGLE_TTS_LOCK_v1_2026-03-01
Files: components/chat/ChatInput.jsx, components/chat/ChatInputReadAloud.jsx
Engine: window.speechSynthesis (PURE BROWSER API — NO network calls)
Flow: toggleGoogleVoicePlay() → speechSynthesis.speak(utterance)

INVARIANT: These two paths must remain independent. See TSB-009, TSB-010, TSB-011.

==========================================
SECTION 11b — WCW TOKEN METER (FIXED)
==========================================

File: components/chat/TokenMeter.jsx
Display: "[used] / [budget]" with color bar (green → blue → yellow → red)
DATA: Real data from DiagnosticReceipt (preferred). Fallback: char-count estimate with "~".
On thread load: fetch last DiagnosticReceipt for session_id.
On thread switch: reset wcwState to { used: null, budget: null }.

==========================================
TSB — TROUBLESHOOTING BULLETINS
==========================================

TSB-001 [FIXED] — Read Aloud Using Browser Voices Instead of OpenAI TTS
  Fix: Replaced window.speechSynthesis.speak() with base44.functions.invoke('textToSpeech')

TSB-002 [FIXED] — catch Block Had No Access to body or user Variables
  Fix: Hoisted let body = null; let user = null; above the try{} block.

TSB-003 [PHASE 1 PENDING] — Generic 200 Error Masking (Silent Failures)
  ODEL v1 now returns status 500. Remaining: Phase 1 items 1.3 and 1.4.

TSB-004 [MONITORED] — Memory Auto-Extraction Creating Noise (Legacy Anchors)
  Mitigation: Anchors labeled "INFERRED". Phase 3: Disable auto-extraction entirely.

TSB-005 [FIXED] — Token Meter Showing 0 / 2M
  Fix: Added estimateTokens() fallback. Reduced maxTokens 2M → 128K.

TSB-006 [FIXED] — Logs Page Expanded Row Collapses on Screenshot
  Fix: Replaced <button> with <div role="div"> to prevent synthetic click events.

TSB-007 [FIXED] — OpenAI TTS Silent Failure (No Error, No Playback)
  Fix: Explicit type guards. Graceful fallback to browser SpeechSynthesis. ODEL logging.

TSB-008 [FIXED] — Welcome Page Infinite Loading Cycle
  Root Cause: Duplicate React import in SystemBlueprint.jsx caused cascading build error.
  Fix: Removed duplicate useState import from SystemBlueprint.jsx.

TSB-009 [FIXED] — TTS Auth Failure + Stack Overflow on Large Audio Buffers
  Root Cause 1: base44.auth.me() threw 401 in SDK-invoked context.
  Root Cause 2: Spread-based base64 → stack overflow on large buffers.
  Fix: Removed auth check. Replaced spread with chunked loop. Model: tts-1-hd.

TSB-010 [FIXED] — VoiceSettings Modal Using Raw fetch() Instead of SDK
  Root Cause: Raw fetch expected binary Blob, but textToSpeech returns JSON { audio_base64 }.
  Fix: Replaced all fetch() with base44.functions.invoke('textToSpeech', ...)

TSB-011 [PERMANENT RECORD] — False Premise: "TTS 5.2" Does Not Exist
  FACT: As of March 2026, OpenAI TTS models are ONLY: tts-1 and tts-1-hd.
  CONSTRAINT: Never change TTS model without verifying via GET /v1/models first.
  GREP ANCHOR: CAOS_OPENAI_TTS_LOCK_v1_2026-03-01

TSB-012 [FIXED] — Token Meter Shows "Estimated" in Published App
  Root Cause 1: DiagnosticReceipt not fetched on thread load.
  Root Cause 2: wcwState never reset on thread switch → stale values.
  Fix: Fetch DiagnosticReceipt on thread load. Reset wcwState on thread switch.
  GREP ANCHOR: CAOS_WCW_METER_FIX_v1_2026-03-01

==========================================
CAOS_BUILD_SEQUENCE_v1 — CONTROLLED BUILD PHASES
==========================================

PHASE B — Authority Domain Separation [LOCKED - Mar 1, 2026]
PHASE C — Pull-Only Awareness Rule [LOCKED - Mar 1, 2026]
NOTE: B → C → A (STT chunking — next phase)

PHASE 1 — Observability & Deterministic Error Control [IN PROGRESS]
  1.1 Stage Tracker (COMPLETE) | 1.2 ODEL v1 (COMPLETE)
  1.3 Admin Error Console Rendering (PENDING) | 1.4 Remove UI Generic Masking (PENDING)

PHASE 2 — Model Awareness & Self-Diagnostic Mode [RESERVED]
PHASE 3 — Memory Stabilization & Mutation Control [RESERVED]
PHASE 4 — Cognitive Scaling Governance [RESERVED]
PHASE 5 — Cross-Thread Deterministic Recall [RESERVED]
PHASE 6 — Admin Command Surface Expansion [FUTURE]

NOT IN SCOPE (do not touch):
  Python memory server, external logging, audio layer, multi-agent backend

==========================================
SECTION 14 — BASE44 PLATFORM CONSTRAINTS
==========================================

1. NO CROSS-FUNCTION LOCAL IMPORTS — functions are sandboxed independently.
   CORRECT: await base44.functions.invoke('core/memoryEngine', { ... })
   WRONG: import { fn } from './core/memoryEngine.js' (MODULE NOT FOUND)

2. FULL MESSAGE HISTORY readable from entity storage. Max 1000 records per filter().

3. HARD EXECUTION LIMITS:
   Max runtime: 300s | Max payload: 6 MB | Target: hybridMessage < 10s

4. SCHEDULED TASKS — YES (via Automations, min 5 minutes)
5. ENTITY EVENT TRIGGERS — YES (on entity create/update/delete)
6. OUTBOUND HTTP — YES (no egress restrictions). Implement retry/backoff in function.

==========================================
SECTION 15 — FOUNDATIONAL MODULES: BUILT, NOT WIRED
==========================================

RECOMMENDED WIRING ORDER:
  1. memoryUpdate (HIGH PRIORITY) → post-turn evolving summary of thread + user profile
  2. contextBuilder → pairs with memoryUpdate (do together)
  3. contextLoader → formalizes hybridMessage boot sequence
  4. laneIsolation → topic isolation (Phase 5)
  5. continuousLearning (CAUTION — review passive-extraction policy first)
  6. indexedSearch → deterministic thread search
  7. toolExecutor → gates future tool expansion (web search, image gen, file search)

memoryUpdate (functions/core/memoryUpdate) — HIGH PRIORITY
  Post-turn gpt-4o-mini updates ThreadMemory + UserProfileMemory.
  Tracks: open loops, key decisions, emotional context, profile continuity.
  This is the core of "Aria remembers what we've been working on" across sessions.

contextBuilder (functions/core/contextBuilder)
  Assembles system prompt blocks from context journal.
  contextBuilder = READ side. memoryUpdate = WRITE side. Must be activated together.

contextLoader (functions/core/contextLoader)
  Loads context in strict order (kernel → bootloader → profile → runtime).
  Fail-closed: if kernel/bootloader/profile missing → throws, no inference.

laneIsolation (functions/core/laneIsolation)
  Enforces strict topic lane boundaries on memory recall.
  GLOBAL anchors pass any lane filter. LANE anchors are lane-scoped.

continuousLearning (functions/core/continuousLearning) — CAUTION
  Post-turn gpt-4o-mini extracts personal facts → LearnedFact entity.
  PASSIVE extraction (facts saved WITHOUT user confirmation).
  Do NOT wire silently. Review confidence/visibility/delete policy first.

indexedSearch (functions/core/indexedSearch)
  Fast, deterministic thread search by title tokens. Zero LLM.
  IndexedThreadSearchEngine: .buildIndexFromThreads(), .search(), .updateThread()

toolExecutor (functions/core/toolExecutor)
  Routes tool requests based on selector_decision.tools_allowed.
  Priority: IMAGE → WEB_SEARCH → FILE_SEARCH
  No tool runs without selector authorization.

==========================================
END OF CAOS SYSTEM BLUEPRINT
Last Updated: Mar 2, 2026
==========================================`;

export default function BlueprintCopyButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(FULL_BLUEPRINT_TEXT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
        copied
          ? 'bg-green-600 text-white'
          : 'bg-blue-600 hover:bg-blue-500 text-white'
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy Full Blueprint'}
    </button>
  );
}