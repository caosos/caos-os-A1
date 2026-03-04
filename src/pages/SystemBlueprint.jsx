import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import BlueprintCopyButton from '@/components/docs/BlueprintCopyButton';

const Section = ({ title, color = 'blue', children }) => {
  const [open, setOpen] = useState(false);
  const colorMap = {
    blue:   { border: 'border-blue-500/30',   text: 'text-blue-300',   bg: 'bg-blue-950/40'   },
    green:  { border: 'border-green-500/30',  text: 'text-green-300',  bg: 'bg-green-950/40'  },
    red:    { border: 'border-red-500/30',    text: 'text-red-300',    bg: 'bg-red-950/40'    },
    purple: { border: 'border-purple-500/30', text: 'text-purple-300', bg: 'bg-purple-950/40' },
    yellow: { border: 'border-yellow-500/30', text: 'text-yellow-300', bg: 'bg-yellow-950/40' },
    cyan:   { border: 'border-cyan-500/30',   text: 'text-cyan-300',   bg: 'bg-cyan-950/40'   },
    indigo: { border: 'border-indigo-500/30', text: 'text-indigo-300', bg: 'bg-indigo-950/40' },
    orange: { border: 'border-orange-500/30', text: 'text-orange-300', bg: 'bg-orange-950/40' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl overflow-hidden`}>
      <button
        data-section-toggle
        data-open={open ? 'true' : 'false'}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
      >
        <h2 className={`text-xl font-bold ${c.text}`}>{title}</h2>
        {open ? <ChevronDown className="w-5 h-5 text-white/50" /> : <ChevronRight className="w-5 h-5 text-white/50" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 text-gray-200 text-sm">{children}</div>}
    </div>
  );
};

const Code = ({ children }) => (
  <pre className="bg-black/40 border border-white/10 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">{children}</pre>
);

const Tag = ({ label, color = 'blue' }) => {
  const cls = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    green: 'bg-green-500/20 text-green-300 border-green-500/30',
    red: 'bg-red-500/20 text-red-300 border-red-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  }[color];
  return <span className={`inline-block text-xs px-2 py-0.5 rounded border ${cls} mr-1`}>{label}</span>;
};

export default function SystemBlueprint() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl('Chat'))}
          className="flex items-center gap-2 text-blue-300 hover:text-blue-100 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </button>
        <BlueprintCopyButton />
      </div>

      <ScrollArea className="h-[calc(100vh-6rem)]">
        <div id="blueprint-content" className="max-w-4xl mx-auto space-y-4 pb-8">

          {/* START HERE — NEW AGENT ONBOARDING */}
          <div className="bg-red-950 border-2 border-red-400 rounded-xl p-6 mb-6">
            <h2 className="text-red-300 font-black text-xl mb-3">🔴 NEW AGENT — START HERE BEFORE DOING ANYTHING</h2>
            <p className="text-white text-sm mb-4">If this is the beginning of a new builder session, paste this entire block as your first message to the agent:</p>
            <pre className="bg-black/60 border border-red-500/40 rounded-lg p-4 text-xs text-green-300 whitespace-pre-wrap select-all">{`YOU ARE A NEW AGENT INHERITING THE CAOS CODEBASE.
STOP. DO NOT TOUCH ANYTHING YET.

Your first and only job right now is to read the System Blueprint.
Use the read_file tool on: pages/SystemBlueprint

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
  6. Aria ≠ CAOS. Never conflate the persona with the platform.

Do not confirm you've read it. Do not ask what to do next.
Wait for the owner to tell you what they need.`}</pre>
            <p className="text-red-300 text-xs mt-3 font-semibold">Copy the block above and paste it as the FIRST message in any new builder session. A new session starts when the chat resets or the page reloads.</p>
          </div>

          {/* HEADER */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">CAOS System Blueprint v2</h1>
            <p className="text-blue-300">Cognitive Adaptive Operating Space — Living Architecture Document</p>
            <p className="text-gray-400 text-xs mt-1">Last Updated: Mar 4, 2026 · ODEL v1: IN PROGRESS 🔧 · Phase A Memory: LOCKED ✅ · Heuristics Engine v1: LOCKED ✅ · TTS (OpenAI + Google): LOCKED ✅ · WCW Meter: FIXED ✅ · Runtime Authority: CENTRALIZED ✅ · Web Search: IMPLEMENTED ✅ · Artifact Loader: IMPLEMENTED ✅ · External Knowledge Detector: v2 BROWSE-ON-VERB ✅ · SelectorEngine: v2 BROWSE-ON-VERB ✅ · UserStorage Entity: ADDED ✅ · UserFile Entity: ACTIVE (files/photos/links) ✅ · Files/Photos/Links Panel: FIXED ✅ · File Storage Architecture: DOCUMENTED ✅ · Platform Constraints: DOCUMENTED ✅ · Module Catalogue: ADDED ✅ · Agent Onboarding Contract: ADDED ✅ · hybridMessage: LOCKED ✅ · textToSpeech: LOCKED ✅ · transcribeAudio: LOCKED ✅ · Authority Domain Separation: LOCKED ✅ · Pull-Only Awareness Rule: LOCKED ✅ · Active Model: gpt-5.2 (200K token limit) ✅ · Chat.jsx Refactor: IN PROGRESS 🔧 (useAuthBootstrap ✅ · useConversations ✅ · ~1126 lines remaining) · Edit Tracking Convention: ACTIVE ✅ · CTC Phase 1: DEPLOYED ✅ (ThreadIndex + ContextSeed + LaneState + LaneSeedHistory + threadIndexLoader) · CTC Phase 2: DEPLOYED ✅ (crossThreadIntent + threadHydrator + sanitizer) · CTC Phase 3: WIRED ✅ (seedCompressor + arcAssembler + hybridMessage CTC stages LIVE)</p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <Tag label="Agent Onboarding Contract: Section 0" color="red" />
              <Tag label="hybridMessage: LOCKED" color="green" />
              <Tag label="Phase A Memory: LOCKED" color="green" />
              <Tag label="Heuristics Engine v1: LOCKED" color="green" />
              <Tag label="OpenAI TTS: LOCKED" color="green" />
              <Tag label="Google Web Speech TTS: LOCKED" color="green" />
              <Tag label="WCW Meter: LIVE DATA" color="green" />
              <Tag label="CTC Memory System: LIVE ✅" color="green" />
              <Tag label="PHASE 1 — Observability: IN PROGRESS" color="yellow" />
              <Tag label="Module Catalogue: Section 15" color="indigo" />
              <Tag label="PHASE 2–6: RESERVED" color="purple" />
            </div>
          </div>

          {/* 0. AGENT ONBOARDING CONTRACT */}
          <Section title="0. Agent Onboarding Contract — Strict Development Principles" color="red">
            <div className="bg-red-950/50 border border-red-500/40 rounded-lg p-4 mb-4">
              <p className="text-red-300 font-bold text-sm mb-1">⚠️ READ THIS FIRST — applies to every agent, every session, every change.</p>
              <p className="text-gray-300 text-xs">These are standing requirements established by the system owner. They are not suggestions. Any new agent inheriting this codebase must treat these as invariants. Do not deviate without explicit written instruction from the owner in the current session.</p>
            </div>

            <h4 className="text-white font-semibold mt-3">1. Modularity is Non-Negotiable</h4>
            <Code>{`Every function, component, and module must do ONE thing.
No monolithic files. No "utility dump" files.
If a file is doing more than one job, it needs to be split.

RULE: A new agent must never consolidate separate modules into a single file
      just for convenience. Separation is intentional and load-bearing.`}</Code>

            <h4 className="text-white font-semibold mt-3">2. File Size Hard Limits</h4>
            <Code>{`PREFERRED maximum:  200 lines per file
HARD maximum:       400 lines per file

If a file exceeds 400 lines, it MUST be refactored before new features are added.
No exceptions. No "I'll clean it up later." Clean it up now.

ENFORCEMENT:
  - hybridMessage is currently ~620 lines — flagged for refactor (see Section 10)
  - New files must be created focused from the start
  - Components > 200 lines should be broken into sub-components immediately`}</Code>

            <h4 className="text-white font-semibold mt-3">3. Phased Development — Build → Test → Lock</h4>
            <Code>{`Nothing is shipped to production without passing through all three gates:

  BUILD:  Implement the feature in isolation. No side effects on locked modules.
  TEST:   Verify the feature works. Use test_backend_function. Confirm receipts.
          Do not move to LOCK without a confirmed working test result.
  LOCK:   Once tested and confirmed, mark the feature as LOCKED in this blueprint.
          Add a LOCK_SIGNATURE comment in the source file.
          Locked features are OFF LIMITS. Do not touch them without TSB entry.

RULE: Never modify a LOCKED feature without:
  a) Creating a TSB entry explaining why
  b) Getting explicit approval from the owner in the current session
  c) Re-testing and re-locking after the change`}</Code>

            <h4 className="text-white font-semibold mt-3">4. API Call Minimalism — Minimal Data, Maximum Integrity</h4>
            <Code>{`Every API call — to OpenAI, to Base44 entities, to any external service —
must send the MINIMUM data required to accomplish the task.

RULES:
  - Do not send fields that are not needed for the operation
  - Do not fetch more records than required (use limits, filters, sorts)
  - Do not inject large payloads into system prompts when a summary will do
  - Do not make multiple sequential API calls when one will suffice
  - Do not send conversation history you don't need — compress it first

RATIONALE: Every byte sent is a cost. Every unnecessary field is a liability.
  Bloated API calls cause: higher latency, higher cost, higher error surface,
  harder debugging. Keep calls surgical.

APPLIED EXAMPLE (hybridMessage):
  ✅ CORRECT: filter({ conversation_id }, '-created_date', 100)
  ❌ WRONG:   list() then filter in memory (fetches everything)`}</Code>

            <h4 className="text-white font-semibold mt-3">5. No Silent Writes. No Surprise State Changes.</h4>
            <Code>{`Every write to any entity must be:
  a) Explicitly triggered by a user action or a deterministic pipeline stage
  b) Logged with a receipt (what was written, when, by which stage)
  c) Traceable back to an error log if it fails

RULE: Background writes (auto-extraction, passive learning) are BANNED
      unless gated behind an explicit user-facing toggle AND reviewed in this blueprint.
      See TSB-004 for what happens when this rule is violated.`}</Code>

            <h4 className="text-white font-semibold mt-3">6. selfInspect — Source Code Audit Layer</h4>
            <Code>{`Module:   functions/core/selfInspect  (LAYER 2 — READ-ONLY)
Purpose:  Allows Aria to inspect CAOS source code for auditing and suggestions.
Contract: READ-ONLY. PULL-ONLY. No side effects. No writes. No execution.

PLATFORM CONSTRAINT (confirmed Mar 1, 2026):
  The Base44 Deno sandbox does NOT expose a self-read API for deployed function source.
  selfInspect provides an ALLOWLIST of 52 inspectable files and their metadata.
  Actual source content requires a manual paste from the dashboard or editor.

WORKFLOW for code audit:
  1. Aria asks: "Can you share the source for functions/hybridMessage?"
  2. User invokes: core/selfInspect with { file: "hybridMessage" }
     → confirms file is in inspectable registry
  3. User pastes source into chat
  4. Aria audits, identifies issues, suggests changes
  5. User decides whether to apply — Aria never self-modifies

RULE: selfInspect is the ONLY sanctioned path for Aria to reason about source code.
      Aria must never assume source code content. Always ask for it to be shared.`}</Code>

            <h4 className="text-white font-semibold mt-3">10. Workflow Etiquette — Standing Build Conventions</h4>
            <Code>{`These are active workflow conventions established during the Mar 2026 build sprint.
Every agent must follow them from the first change, without being asked.

A. EDIT TRACKING (established Mar 3, 2026):
   After EVERY edit, report a one-line change summary:
     "Changed: <file> +N lines | <file> +N lines"
   Format: file path, then +N for lines added or -N for lines removed.
   Example: "Changed: functions/core/selectorEngine +18 lines | externalKnowledgeDetector +32 lines"
   This is non-optional. Every single response that modifies a file must include this.
   Purpose: owner tracks codebase growth, spots overreach, and catches bloat early.

B. READ BEFORE WRITE:
   Never modify a file without reading its current content first.
   Use read_file. Never assume file contents. Never patch blind.

C. PARALLEL TOOL CALLS:
   When reading multiple files, issue all reads simultaneously.
   Never sequential reads when parallel is possible.

D. FIND_REPLACE OVER WRITE_FILE:
   For existing code files (JS/JSX): use find_replace.
   For entity schema files (JSON): use write_file (they are stored as objects, not strings).
   Never rewrite an entire JS/JSX file when a targeted edit will do.

E. NO FEATURE CREEP:
   Do exactly what was asked. Nothing more.
   If an adjacent improvement is obvious, mention it — don't implement it silently.

F. MINIMUM VIABLE CHANGE:
   Prefer surgical edits over restructures.
   If you're touching 5+ unrelated areas in one response, stop and ask the owner to scope it.

G. BLUEPRINT UPDATES ARE A FIRST-CLASS TASK:
   When a significant change is made (new hook, new module, behavior change, TSB),
   the blueprint MUST be updated in the same session — not later.
   The blueprint is the living truth. If it's out of date, the system is out of date.`}</Code>

            <h4 className="text-white font-semibold mt-3">7. New Agent Checklist</h4>
            <Code>{`Before making ANY change to this codebase, a new agent must:

  □ Read Section 0 (this section) — understand the standing contracts
  □ Read Section 2 — understand the hybridMessage pipeline (LOCKED spine — do not add logic)
  □ Read Section 3 — understand Phase A memory (LOCKED — do not touch)
  □ Check Section 9 — confirm what is NOT yet active (don't accidentally activate it)
  □ Check the TSB log — understand what has broken before and why
  □ Confirm the file they're editing is NOT locked (LOCK_SIGNATURE present = stop)
  □ Confirm their change stays within the 200/400 line limit
  □ Confirm their change sends minimal data in any API calls added
  □ Confirm their change has a test path before implementing
  □ Apply Section 0.10 Workflow Etiquette from the first change (edit tracking, read-before-write, etc.)
  □ Ask the owner if any of the above is unclear — do not assume

  CONFIRMED STACK STATE (as of Mar 3, 2026):
  pages/Chat.jsx              ~1126 lines   REFACTOR IN PROGRESS
   └─ hooks/useAuthBootstrap   56 lines    EXTRACTED ✅
   └─ hooks/useConversations  240 lines    EXTRACTED ✅
  functions/hybridMessage      387 lines    LOCKED ✅ (spine — orchestrates, does not implement)
   └─ core/memoryEngine        (module — save/recall)
   └─ core/heuristicsEngine    (module — intent/DCS)
   └─ core/promptBuilder       (module — system prompt)
   └─ core/receiptWriter       (module — DiagnosticReceipt)
   └─ core/errorEnvelopeWriter (module — ODEL v1)
   └─ core/environmentLoader   (module — cross-thread state)
   └─ core/selfDescribe        (module — runtime manifest kv)
   └─ core/webSearch           (module — Bing API search)
   └─ core/externalKnowledgeDetector  v2 BROWSE-ON-VERB ✅
   └─ core/selectorEngine      v2 BROWSE-ON-VERB ✅`}</Code>

            <h4 className="text-white font-semibold mt-3">8. Authority Domain Separation</h4>
            <Code>{`LOCK_SIGNATURE: CAOS_AUTHORITY_DOMAIN_SEPARATION_v1_2026-03-01

Aria (the AI persona) and CAOS (the platform) are separate authority domains.
They must never be conflated in code, prompts, or documentation.

RULES:
  - Aria speaks. CAOS routes. They do not share identity.
  - Aria must never introduce herself as "CAOS."
  - The system prompt must always establish Aria as the persona, CAOS as the platform.
  - No module may grant Aria platform-level authority (e.g., self-modification,
    direct entity writes without pipeline stage, or direct function invocation
    outside the governed hybridMessage pipeline).
  - selfInspect is READ-ONLY. Aria may audit. Aria may never act on source directly.
  - Governance decisions (lock/unlock, TSB entries, phase advancement) belong
    to the system owner — not to Aria, not to any agent.

VIOLATION EXAMPLES:
  ❌ Aria writes directly to UserProfile without a MEMORY_WRITE stage receipt
  ❌ An agent modifies hybridMessage without a TSB entry
  ❌ A module grants Aria ability to invoke other functions without selector gate
  ❌ Blueprint is updated by an agent without owner confirmation in the session

ENFORCEMENT:
  Any change that blurs the Aria/CAOS boundary requires explicit TSB entry
  and owner sign-off before implementation.`}</Code>

            <h4 className="text-white font-semibold mt-3">9. Pull-Only Awareness Rule</h4>
            <Code>{`LOCK_SIGNATURE: CAOS_PULL_ONLY_AWARENESS_v1_2026-03-01

Awareness in CAOS must be pull-based, not push-based.

RULES:
  - Do NOT introduce unnecessary API chatter.
  - Do NOT inject state into the system unless explicitly requested by the pipeline.
  - Do NOT push context, memory, or environmental state proactively into prompts
    unless a deterministic trigger has authorized it (recall trigger, session boot, etc.).
  - Modules must WAIT to be invoked. They must NOT self-activate or poll.
  - No background threads, no passive watchers, no unsolicited writes.

PULL-BASED PATTERN (correct):
  User sends message → pipeline invokes memoryEngine.detect_recall(input)
  → only if recall detected → memoryEngine.recall() → inject into prompt

PUSH-BASED ANTI-PATTERN (forbidden):
  Module detects "interesting" context → auto-injects into next prompt
  Module polls entity store → updates system state unprompted
  Module writes to UserProfile on every turn "just in case"

RATIONALE:
  Push-based awareness creates: unpredictable state, silent writes, higher API cost,
  harder debugging, and violates the "No Silent Writes" invariant (Rule 5).
  Pull-based awareness is deterministic, auditable, and cheap.

ESTABLISHED: Mar 1, 2026. Directive from system owner.`}</Code>

            <div className="bg-yellow-950/50 border border-yellow-500/30 rounded p-3 mt-3">
              <p className="text-yellow-300 text-xs font-semibold">ESTABLISHED: Mar 1, 2026 by system owner. These principles emerged from real build experience on this codebase — they are not theoretical. Each one exists because a violation caused a real problem. Respect them.</p>
            </div>
          </Section>

          {/* 1. WHAT CAOS IS */}
          <Section title="1. What CAOS Is" color="blue">
            <p>CAOS (Cognitive Adaptive Operating Space) is a personal AI assistant platform. The AI persona is named <strong className="text-white">Aria</strong>. CAOS is the platform name — Aria never introduces herself as "CAOS".</p>
            <p className="mt-2">The system is built on Base44 (React + Deno backend functions) with OpenAI gpt-5.2 as the active inference engine. It has a deterministic memory system, a heuristics formatting layer, and a chat UI with thread management, file support, and developer tools.</p>
            <Code>{`Platform:   Base44 (React + Deno serverless functions)
AI:         OpenAI gpt-5.2 (primary — ACTIVE_MODEL in hybridMessage)
            Note: TTS uses tts-1-hd (separate model namespace — see TSB-011)
Storage:    Base44 entities (database)
Auth:       Base44 built-in auth + guest mode
Key file:   functions/hybridMessage  ← everything runs through here`}</Code>
          </Section>

          {/* 2. ACTIVE ARCHITECTURE */}
          <Section title="2. Active Architecture — hybridMessage Pipeline" color="cyan">
            <p>All messages flow through a single backend function: <code className="text-cyan-300">hybridMessage</code>. It is the unified governance gate. There is no separate pipeline runner — everything is in this one file.</p>
            <Code>{`Request → hybridMessage
  │
  ├─ 1. AUTH: base44.auth.me() — reject if not authenticated
  │
  ├─ 2. LOAD USER PROFILE + SESSION HISTORY: parallel fetch
  │      └─ UserProfile entity (structured_memory, anchors, tone, project)
  │      └─ Message entity, up to 40 messages (HOT_HEAD=15 + HOT_TAIL=40)
  │
  ├─ 3. PHASE A: ATOMIC MEMORY SAVE (if input matches trigger phrases)
  │      └─ detectSaveIntent() → '__VAGUE__' | '__PRONOUN__' | content string | null
  │      └─ If vague → ask for clarification (MEMORY_CLARIFY mode)
  │      └─ If pronoun → ask who (MEMORY_CLARIFY_PRONOUN mode)
  │      └─ If content → dedup check → write to UserProfile.structured_memory → receipt
  │      └─ Returns immediately — BYPASSES inference entirely
  │
  ├─ 4. HISTORY COMPRESSION: compressHistory() — HOT_HEAD(15) + summary + HOT_TAIL(40)
  │
  ├─ 5. CTC — CROSS-THREAD CONTEXT (Phase 3 — LIVE ✅)
  │      └─ CTC_INTENT: context/crossThreadIntent → detects explicit/topic/time recall
  │      └─ CTC_HYDRATE: context/threadHydrator → loads ContextSeed records (if cross_thread)
  │      └─ ARC_ASSEMBLE: context/arcAssembler → builds ARC_PACK block (token budget: 2000)
  │      └─ arcBlock injected into system prompt BEFORE memory recall
  │      └─ Non-fatal: any failure → pipeline continues without CTC context
  │
  ├─ 6. DETERMINISTIC RECALL: if detectRecallIntent(input)
  │      └─ Keyword match against UserProfile.structured_memory
  │      └─ Returns top 5 matched entries, injected after ARC_PACK in system prompt
  │
  ├─ 7. HEURISTICS ENGINE v1 (internal — never surfaced in output)
  │      └─ classifyIntent() → MEMORY_ACTION | TECHNICAL_DESIGN | PARTNER_REVIEW |
  │                              EXECUTION_DIRECTIVE | SUMMARY_COMPACT | GENERAL_QUERY
  │      └─ calibrateDepth() → COMPACT | STANDARD | LAYERED
  │      └─ buildDirective() → appended to system prompt
  │
  ├─ 8. BUILD SYSTEM PROMPT
  │      └─ Aria identity + truth discipline rules (ARC_PACK entries = verified facts)
  │      └─ ARC_PACK block (CTC cross-thread context, if any)
  │      └─ RECALLED MEMORY (Phase A structured_memory, if triggered)
  │      └─ INFERRED CONTEXT (legacy anchors, labeled)
  │      └─ Communication style + session length
  │      └─ Heuristics directive (depth + posture)
  │
  ├─ 9. OPENAI CALL: gpt-5.2, max_tokens=2000
  │
  ├─ 10. SAVE MESSAGES: Message entity (user + assistant)
  │
  ├─ 11. RECEIPT: core/receiptWriter (fire-and-forget) — includes ctc_injected, ctc_seed_ids
  │       ANCHOR EXTRACTION: DISABLED (Phase 3.1 lock active)
  │
  └─ RETURN: { reply, mode, request_id, wcw_*, ctc_injected, ctc_seed_ids, execution_receipt }`}</Code>
          </Section>

          {/* 3. MEMORY SYSTEM — PHASE A LOCKED */}
          <Section title="3. Memory System — Phase A (LOCKED)" color="green">
            <p><strong className="text-green-300">Phase A is complete and locked.</strong> It provides deterministic, explicit-only memory saves with full receipt contracts. No silent saves. No hallucinated recall.</p>

            <h4 className="text-white font-semibold mt-3">Save Triggers (user must say one of these):</h4>
            <Code>{`"I want you to remember..."
"Please remember..."
"Remember this: ..."
"Remember that..."
"Save this to memory: ..."
"Add this to memory: ..."
"Note that..."
"Store that..."`}</Code>

            <h4 className="text-white font-semibold mt-3">Save Flow:</h4>
            <Code>{`1. detectMemorySave(input) → extract content string
2. splitAtomicFacts(content) → split on "X and Y" when both are facts
3. For each clause: saveOneAtomicEntry() → dedup check → validate
4. Single DB write: UserProfile.structured_memory updated
5. Return receipt:
   {
     reply: "Memory saved. I'll remember: \"...\"\\nMEMORY_SAVED: TRUE | entries: 1 | id: <uuid>",
     mode: "MEMORY_SAVE",
     memory_saved: true,
     entries_created: 1,
     entry_ids: ["<uuid>"],
     dedup_ids: [],
     rejected_entries: []
   }`}</Code>

            <h4 className="text-white font-semibold mt-3">Recall Flow:</h4>
            <Code>{`detectMemoryRecall(input) → keyword trigger check
recallStructuredMemory(structuredMemory, query) → extractTags → score by hits
Returns top 10 matched entries → injected as "RECALLED MEMORY:" block in system prompt
No full dump. No fabrication. Source labeled "(from memory)".`}</Code>

            <h4 className="text-white font-semibold mt-3">Entry Schema (stored in UserProfile.structured_memory):</h4>
            <Code>{`{
  id: "<uuid>",
  content: "my dog's name is Biscuit",
  created_at: "2026-02-27T...",
  timestamp: "2026-02-27T...",   // legacy compat
  scope: "profile",
  tags: ["dog", "biscuit"],      // auto-extracted keywords
  source: "user_trigger",
  normalized_fields: null,        // Phase B reserved
  entity_refs: null               // Phase C reserved
}`}</Code>

            <div className="bg-yellow-950/50 border border-yellow-500/30 rounded p-3 mt-2">
              <p className="text-yellow-300 text-xs font-semibold">PHASE B (Typed Schema) and PHASE C (Entity Graph) are reserved. Fields exist but are null. Do not implement until Phase A has been used in production.</p>
            </div>
          </Section>

          {/* 4. HEURISTICS ENGINE v1 */}
          <Section title="4. Heuristics Engine v1 (LOCKED)" color="purple">
            <p>Non-invasive formatting layer. Shapes output posture and depth. Detachable via <code className="text-purple-300">HEURISTICS_ENABLED = false</code>. Never surfaces labels or classifications in output.</p>

            <h4 className="text-white font-semibold mt-3">Intent Classification:</h4>
            <Code>{`MEMORY_ACTION      → save/remember triggers → BYPASSES heuristics entirely
TECHNICAL_DESIGN   → architect/schema/spec + long input → LAYERED
PARTNER_REVIEW     → review/thoughts on/critique → STANDARD+
EXECUTION_DIRECTIVE → run/build/create (short) → COMPACT
SUMMARY_COMPACT    → summarize/tldr → COMPACT
TOOL_INVOCATION    → search/find/calculate → STANDARD
GENERAL_QUERY      → everything else → COMPACT or STANDARD by length`}</Code>

            <h4 className="text-white font-semibold mt-3">Depth Calibration:</h4>
            <Code>{`COMPACT  → 1-3 sentences. Short input, simple queries, directives.
STANDARD → Natural paragraphing. Default.
LAYERED  → Full analytical depth. Architectural/multi-clause inputs with ≥2 abstract terms.`}</Code>

            <h4 className="text-white font-semibold mt-3">Output Posture (always active for non-MEMORY_ACTION):</h4>
            <Code>{`- Flowing prose. No bullet lists, numbered lists, or section headers unless asked.
- No praise openers ("Great question!", "Absolutely!")
- No emotional mirroring
- No CRM-style summaries
- No internal pipeline terminology in output
- Shared ownership framing ("we could...", "the approach here is...")
- Calm, direct, architect-level tone`}</Code>

            <p className="mt-2">The heuristics intent and depth are logged in <code className="text-purple-300">execution_receipt</code>: <code>heuristics_intent</code>, <code>heuristics_depth</code>.</p>
          </Section>

          {/* 5. DATA ENTITIES */}
          <Section title="5. Data Entities (Active)" color="indigo">
            <h4 className="text-white font-semibold">Core Chat:</h4>
            <Code>{"Conversation  — thread metadata (title, last_message_time, summary, keywords)\nMessage       — messages (conversation_id, role, content, file_urls, execution_receipt)\nUserProfile   — persistent user data:\n  tone, project, memory_anchors (legacy), structured_memory (Phase A ACTIVE)\nUserFile      — files/photos/links (name, url, type, folder_path, size, mime_type)\nUserStorage   — user file storage box (user_email, file_name, mime_type, sha256, base44_file_id)"}</Code>

            <h4 className="text-white font-semibold mt-3">Governance / Advanced (built, partially used):</h4>
            <Code>{"Anchor, Record, SessionContext, Lane, LexicalRule, SessionManifest\nDriftEvent, RetrievalReceipt, ThreadToken/Meta\nErrorLog (ACTIVE), ConfigChangeLog"}</Code>
          </Section>

          {/* 6. FRONTEND STRUCTURE */}
          <Section title="6. Frontend Structure — Pages & Components" color="orange">
            <h4 className="text-white font-semibold">Pages:</h4>
            <Code>{"Welcome - auth gate (Google sign-in, email, guest mode)\nChat - main interface (all chat logic lives here)\nAdmin - admin dashboard (errors, stats, pipeline visualizer)\nConsole - SSH/terminal console view\nImplementation - CAOS-A1 Python backend blueprint v1 (FastAPI + SQLite)\nMemoryIsolation - memory isolation architecture docs\nSystemBlueprint - THIS FILE — System Blueprint v2\nNews - news feed page"}</Code>

            <h4 className="text-white font-semibold mt-3">Key Components:</h4>
            <Code>{"ChatBubble, ChatHeader, ChatInput, ThreadList, ProfilePanel, TokenMeter, ConversationSearch, StarfieldBackground, WelcomeGreeting, ExecutionReceipt, LatencyIndicator, ContinuityToken, QuickActionBar\n\ncomponents/game: GameView\ncomponents/terminal: CodeTerminal\ncomponents/mobile: BottomNavBar\ncomponents/admin: StatsViewer, RecentErrors, PipelineVisualizer, WCWMonitor, SystemHealth"}</Code>

            <h4 className="text-white font-semibold mt-3">Modes (localStorage flags):</h4>
            <Code>{"caos_developer_mode, caos_game_mode, caos_multi_agent_mode, caos_guest_user\ncaos_last_conversation, caos_current_lane, caos_voice_preference_message\ncaos_speech_rate, caos_google_voice, caos_google_speech_rate"}</Code>
          </Section>

          {/* 7. BACKEND FUNCTIONS */}
          <Section title="7. Backend Functions (Active)" color="green">
            <Code>{"MAIN: hybridMessage\nVOICE: textToSpeech (LOCKED), transcribeAudio, googleTextToSpeech (LOCKED)\nRUNTIME: runtimeAuthority (centralized source of truth), systemSnapshot\nWEB: webSearch (Bing API), externalKnowledgeDetector, artifactLoader\nDIAGNOSTICS: systemHealth, diagnosticSnapshot, inspectPipeline, quickInspect\nMEMORY: testAnchors, extractUserPreference, pinMemory\nCORE MODULES: contextBuilder, contextLoader, laneIsolation, memoryUpdate,\n  selectorEngine, tieredRecall, toolExecutor, wcwBudget + more"}</Code>
          </Section>

          {/* 8. TRUTH DISCIPLINE */}
          <Section title="8. Aria Truth Discipline (Active Rules)" color="red">
            <p>These rules are injected into Aria's system prompt on every request:</p>
            <Code>{"1. PRIOR-MENTION CLAIMS: Never say 'you mentioned' unless fact is in STRUCTURED MEMORY.\n2. NEW INFORMATION RULE: If user introduces a fact now, treat it as new.\n3. PREFERENCE CLAIMS: Never assert 'you like X' unless in structured_memory.\n4. NO FABRICATION: If a fact isn't stored, say 'I don't have that stored.'\n5. SOURCE LABELING: Label source: (from memory) | (from this conversation) | (inferred)"}</Code>
          </Section>

          {/* 9. WHAT IS NOT YET ACTIVE */}
          <Section title="9. Built But Not Yet Active" color="yellow">
            <Code>{"Lane-based context isolation - not wired into hybridMessage\nPlane B (Record entity) - schema built, not primary store\nAnchor hash-chain - schema built, not active\nThreadSnapshot / rotation - built, not triggered\nLexicalRule normalization - built, not applied\nDrift detection (DriftEvent) - built, not active\nSessionManifest capability gate - built, not enforced\nMulti-agent blackboard - UI placeholder only\nCAOS-A1 Python backend - blueprinted, not deployed\n\nLEGACY / ORPHANED:\npinMemory - superseded by Phase A structured_memory. Dead function."}</Code>
          </Section>

          {/* 10. KNOWN ISSUES */}
          <Section title="10. Known Issues and Candidate Next Work" color="blue">
            <Code>{"KNOWN:\n- Memory save strips 'that' from 'remember that...' (acceptable)\n- Legacy memory_anchors still injected as INFERRED context\n- pages/Chat.jsx is 1341 lines - FLAGGED FOR REFACTOR\n\nFILE STORAGE (confirmed Mar 3, 2026):\n- ChatInput uploads → UserFile on attach\n- Chat.jsx saveToUserFiles() after AI reply\n- Chat.jsx extractAndSaveLinks() scans AI replies for URLs\n\nCANDIDATE NEXT:\n- Refactor Chat.jsx (highest priority)\n- Phase B typed schema for structured_memory\n- Wire hybridMessage to read UserProfile.tone.style\n- Thread auto-summary on close"}</Code>
          </Section>

          {/* 11. TTS */}
          <Section title="11. Read-Aloud / TTS Layer (LOCKED)" color="green">
            <p><strong className="text-green-300">Both TTS systems are confirmed working and locked as of Mar 1, 2026.</strong> There are two independent voice read-aloud paths serving different UI surfaces.</p>

            <h4 className="text-white font-semibold mt-3">Path A — OpenAI TTS (ChatBubble speaker icon + VoiceSettings)</h4>
            <Code>{`LOCK_SIGNATURE: CAOS_OPENAI_TTS_LOCK_v1_2026-03-01
Files locked:  components/chat/VoiceSettings.jsx
               components/chat/ChatBubbleReadAloud.jsx
Backend:       functions/textToSpeech (Deno)
Model:         tts-1-hd (ONLY valid model as of Mar 2026 — see TSB-011)
Flow:
  1. User clicks speaker icon on AI message in ChatBubble
  2. handleReadAloud(content) called → strips markdown → invokes:
       base44.functions.invoke('textToSpeech', { text, voice, speed })
  3. Backend fetches from OpenAI /v1/audio/speech (tts-1-hd)
  4. Response: JSON { audio_base64: string, content_type: "audio/mpeg" }
  5. Frontend: chunked atob() → Uint8Array → Blob → ObjectURL → Audio()
     NOTE: chunked loop required — spread causes stack overflow on large buffers
  6. Audio plays. Pause/stop controls active. Global audio manager prevents overlap.
Voice pref:  localStorage caos_voice_preference_message (default: nova)
Speed pref:  localStorage caos_speech_rate (default: 1.0)
Voices:      alloy | echo | fable | onyx | nova | shimmer
VoiceSettings modal: preview + save voice selection → same invoke path`}</Code>


            <h4 className="text-white font-semibold mt-3">Path B — Google Web Speech API (ChatInput mic bar)</h4>
            <Code>{`LOCK_SIGNATURE: CAOS_GOOGLE_TTS_LOCK_v1_2026-03-01
File locked:   components/chat/ChatInput.jsx
               components/chat/ChatInputReadAloud.jsx
Backend:       functions/googleTextToSpeech (returns voice config only — no API call)
Engine:        window.speechSynthesis (browser Web Speech API — NO network)
Flow:
  1. User clicks speaker icon in ChatInput toolbar (bottom of chat)
  2. toggleGoogleVoicePlay() → reads lastAssistantMessage prop
  3. Cleans text (strip markdown)
  4. window.speechSynthesis.speak(utterance)
  5. Voice selected from localStorage caos_google_voice
  6. Speed from localStorage caos_google_speech_rate
  7. Pause/resume/stop wired to speechSynthesis controls
Voice pref:  localStorage caos_google_voice
Speed pref:  localStorage caos_google_speech_rate
Dependency:  PURE BROWSER API. No external network calls. No base44.functions.invoke().`}</Code>

            <div className="bg-yellow-950/50 border border-yellow-500/30 rounded p-3 mt-3">
              <p className="text-yellow-300 text-xs font-semibold">INVARIANT: These two paths must remain independent. Do not merge them. Do not swap their backends. Each is locked to its own dependency surface. See TSB-009, TSB-010, TSB-011.</p>
            </div>
          </Section>

          {/* 12. WCW TOKEN METER */}
          <Section title="12. WCW Token Meter — Working Context Window Display (FIXED)" color="cyan">
            <p>The token meter in the chat header shows real backend WCW data, not a client-side estimate. Fixed Mar 1, 2026 (see TSB-012).</p>
            <Code>{`File:     components/chat/TokenMeter.jsx
Location: Chat header (top right, visible when a thread has messages)
Display:  "[used] / [budget]" with color bar (green → blue → yellow → red)

DATA PRIORITY:
  1. REAL DATA (preferred): wcwUsed + wcwBudget props — from backend DiagnosticReceipt
  2. FALLBACK (estimate): character-count estimate from messages array (~4 chars/token)
     Shown with "~" suffix. Tooltip says "Estimated token usage".

HOW REAL DATA FLOWS:
  a. After each message: hybridMessage returns wcw_used + wcw_budget in response.
     Chat.jsx: setWcwState({ used: data.wcw_used, budget: data.wcw_budget })
  b. On thread load: Chat.jsx fetches last DiagnosticReceipt for session_id.
     If found: setWcwState({ used: receipt.wcw_used, budget: receipt.wcw_budget })
  c. On thread switch: wcwState resets to { used: null, budget: null } immediately.
     Prevents stale WCW from a previous thread bleeding into the new thread display.

STATE MANAGED IN: pages/Chat.jsx → wcwState { used, budget }
PASSED TO: <TokenMeter wcwUsed={wcwState.used} wcwBudget={wcwState.budget} />`}</Code>
            <div className="bg-yellow-950/50 border border-yellow-500/30 rounded p-3 mt-2">
              <p className="text-yellow-300 text-xs font-semibold">Root of iframe vs published discrepancy (TSB-012): DiagnosticReceipt was not being fetched on thread load, so published version always showed "estimated" while iframe showed live data from an active session. Both now use the same data path.</p>
            </div>
          </Section>

          {/* 12. AUDIO BLUEPRINT */}
          <Section title="13. Audio Blueprint v1 — CAOS Audio Layer (PENDING)" color="orange">
            <p><strong className="text-orange-300">Status: Blueprint complete. Not yet implemented. Modular — isolated from cognitive core.</strong></p>
            <p className="mt-2">Goal: enable Aria to process raw audio with multi-speaker separation, prosody/emotion detection, and natural conversational flow preservation. All invocation is permission-gated.</p>

            <h4 className="text-white font-semibold mt-3">Core Stack (Linux-native, open-source):</h4>
            <Code>{`PyAnnote.audio (3.1+)     — Speaker diarization (2–4 speakers, overlap supported)
                              pip install pyannote.audio | requires HuggingFace token (free)

SpeechBrain               — Emotion recognition, speaker embeddings, VAD
                              pip install speechbrain
                              models: emotion-classification-wav2vec2-IEMOCAP, speaker-recognition

faster-whisper / WhisperX — Transcription + timestamp alignment to speaker segments
                              pip install faster-whisper whisperx

Librosa                   — Raw prosody features (pitch contours, energy, pauses)
                              pip install librosa

HuggingFace Transformers  — Pre-trained emotion/prosody models
                              pip install transformers`}</Code>

            <h4 className="text-white font-semibold mt-3">Pipeline Flow (Audio → Tagged Transcript → Aria Reasoning):</h4>
            <Code>{`1. Raw audio input (WAV/MP3 from mic or UI upload)
2. VAD (SpeechBrain) — segment speech from silence
3. PyAnnote diarization — assign Speaker1, Speaker2, etc.
4. WhisperX transcription — transcribe + align timestamps to speaker segments
5. SpeechBrain + Librosa — per-segment emotion + prosody extraction
6. Fuse into tagged JSON:

   {
     "start": "00:05.2", "end": "00:12.8",
     "speaker": "Speaker1",
     "text": "Yeah, but that's horseshit.",
     "prosody": {
       "emotion": "frustrated",
       "pitch_avg": 180.5,
       "pause_before": 1.5,
       "energy": "high"
     }
   }

7. Feed tagged transcript into OpenAI reasoning layer
   → Aria responds referencing emotional cues and cadence`}</Code>

            <h4 className="text-white font-semibold mt-3">Permission Gating (Token-Based):</h4>
            <Code>{`enable_voice_analysis  — required for diarization + emotion extraction
enable_imagine_gen     — required for image/video generation (if multimedia expansion enabled)

Backend check:
  if (toolName === 'analyze_audio' && !userHasToken('enable_voice_analysis')) {
    return "Permission required to process audio. Approve with token or say yes.";
  }`}</Code>

            <h4 className="text-white font-semibold mt-3">OpenAI Tool Definition:</h4>
            <Code>{`{
  "name": "analyze_audio",
  "description": "Process raw audio for diarization, transcription, prosody/emotion detection",
  "parameters": {
    "audio_url": { "type": "string" },  // URL/ID of uploaded audio
    "question":  { "type": "string" }   // optional: specific analysis focus
  }
}`}</Code>

            <h4 className="text-white font-semibold mt-3">Backend Execution Sketch (Deno):</h4>
            <Code>{`case 'analyze_audio':
  const audioPath  = await downloadAudio(args.audio_url);
  const diarization = await runPyAnnote(audioPath);
  const transcript  = await runWhisperX(audioPath, diarization);
  const prosody     = await extractProsody(audioPath, transcript.segments);
  const tagged      = fuseTranscript(transcript, prosody);
  return { success: true, tagged_transcript: tagged };`}</Code>

            <h4 className="text-white font-semibold mt-3">Architectural Principles:</h4>
            <Code>{`- Audio layer is modular and isolated from cognitive core (detachable Phase expansion)
- No emotion data auto-saved to structured memory
- All audio-derived inferences treated as probabilistic
- Confidence scoring recommended for emotion tagging
- Tool invocation strictly permission-gated
- Version pinning required to prevent model drift`}</Code>

            <h4 className="text-white font-semibold mt-3">Integration Notes:</h4>
            <Code>{`- Audio uploaded via CAOS UI → saved as UserFile entity
- File ID passed to analyze_audio tool
- Tagged transcript returned to Aria (OpenAI backbone)
- Aria responds naturally referencing emotional cues
- Tagged JSON storable in Record entity for recall`}</Code>

            <h4 className="text-white font-semibold mt-3">Next Steps (when ready to implement):</h4>
            <Code>{`1. Build Deno subprocess wrapper for Python audio stack
2. Add confidence scoring to emotion detection
3. Create test audio ingestion flow (UI upload → pipeline → receipt)
4. Tune reasoning prompt for emotional interpretation`}</Code>

            <div className="bg-orange-950/50 border border-orange-500/30 rounded p-3 mt-2">
              <p className="text-orange-300 text-xs font-semibold">NOT YET IMPLEMENTED. Blueprint locked for future modular build-out. Focus: one phase at a time.</p>
            </div>
          </Section>

          {/* TSB — Troubleshooting Bulletins */}
          <Section title="14. TSB — Troubleshooting Bulletins (Known Issues and Fixes)" color="red">
            <p className="text-gray-300 text-xs mb-4">A running log of real issues encountered during CAOS development, what caused them, and what fixed them. Each entry is a permanent record.</p>

            <div className="space-y-4">

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-013 — Duplicate Runtime Authority (Config Scattered Across System)</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 2, 2026
          Component: functions/core/systemSnapshot, functions/core/wcwMeasure, 
          functions/core/promptBuilder, and others
          Symptom:   Runtime configuration (model_name, token_limit, platform_name, etc)
          was hardcoded in multiple locations. Changes to one file did not
          propagate. The "source of truth" was ambiguous — different modules
          had slightly different values.
          Example: systemSnapshot had token_limit=128000, but the actual active
          model gpt-5.2 has 200K context. Snapshots were wrong.
          Root Cause: No single source of truth. Each module defined its own constants.
          When the active model was upgraded from gpt-4o to gpt-5.2,
          not all files were updated consistently.
          Fix:       Created functions/core/runtimeAuthority.js as the canonical source.
          Exported: RUNTIME_AUTHORITY = {
            build_id, runtime: { model_name, token_limit, platform_name, ... },
            capabilities: { file_read, file_write, vision, web_search, tts, learning_mode },
            safeguards: { domain_allowlist, max_request_timeout_ms, max_response_size_bytes, ... }
          }
          Refactored systemSnapshot, wcwMeasure, promptBuilder to import
          and use RUNTIME_AUTHORITY instead of local constants.
          Impact:    - Single source of truth for all runtime configuration
          - Model upgrades propagate automatically to all consumers
          - Web search capability now declarative (web_search.enabled: true,
            trigger: "NEEDS_BASED_AUTOMATIC", provider: "bing_api")
          - All safeguards centralized and visible
          Lock:      RUNTIME_AUTHORITY is the governance point. Changes require TSB entry.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-001 — Read Aloud Using Browser Voices Instead of OpenAI TTS</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: components/chat/ChatBubble.jsx — handleReadAloud()
Symptom:   The speaker icon on AI responses was using browser SpeechSynthesis
           (Google/system voices), not the OpenAI TTS backend.
           The progress bar would animate but not reflect real audio playback.
Root Cause: handleReadAloud() was calling window.speechSynthesis.speak()
           directly instead of invoking the textToSpeech backend function.
           The textToSpeech function (functions/textToSpeech.js) existed and
           worked correctly — it just wasn't being called from ChatBubble.
Fix:       Replaced browser speech synthesis with:
             1. base44.functions.invoke('textToSpeech', { text, voice, speed })
             2. Convert returned ArrayBuffer → Blob → ObjectURL → Audio()
             3. Real progress bar tied to audio.currentTime / audio.duration
             4. Caching: audioCache Map keyed on messageId + voice + speed
             5. Global audio manager: only one audio plays at a time
Voice pref: Uses localStorage key caos_voice_preference_message (default: nova)
Speed pref: Uses localStorage key caos_speech_rate (default: 1.0)`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-002 — catch Block Had No Access to body or user Variables</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: functions/hybridMessage — catch block / ODEL v1 integration
Symptom:   After adding buildDeterministicErrorEnvelope(), the catch block
           referenced body?.session_id and user?.email — but both variables
           were declared INSIDE the try{} block, making them inaccessible
           in catch.
Root Cause: JavaScript scoping — variables declared with const/let inside
           try{} are not visible in catch{}.
Fix:       Hoisted both declarations above the try{} block:
             let body = null;
             let user = null;
           Then assigned them inside try{} without re-declaring.
           catch{} can now safely read body?.session_id and user?.email.
Impact:    ODEL error envelopes now carry full context (session_id,
           user_email) even for errors that happen after parsing the body.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-003 — Generic 200 Error Masking (Silent Failures)</span>
                  <Tag label="IDENTIFIED — PHASE 1 PENDING" color="yellow" />
                </div>
                <Code>{`Date:      Feb 2026 (ongoing)
Component: Frontend chat send flow / hybridMessage
Symptom:   Errors were being caught, swallowed, and returned as 200 OK
           with a generic fallback message. Users saw no indication
           something failed. Errors were invisible in logs.
Root Cause: try/catch blocks returning Response.json({reply: "..."}, {status:200})
           instead of non-200 status codes. Frontend interpreted all 200s
           as success.
Fix (partial): ODEL v1 now returns status 500 with structured envelope.
               Frontend Chat.jsx was already checking for response.status !== 200.
Remaining:  Phase 1 item 1.4 — remove remaining legacy masking paths.
            Admin console (Phase 1 item 1.3) — render ErrorLog envelopes.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-004 — Memory Auto-Extraction Creating Noise (Legacy Anchors)</span>
                  <Tag label="MONITORED" color="yellow" />
                </div>
                <Code>{`Date:      Feb 2026 (ongoing)
Component: functions/hybridMessage — background extractMemoryAnchors()
Symptom:   Auto-extracted legacy memory_anchors accumulate inferred facts
           that may be imprecise or duplicate structured_memory entries.
           Aria may reference stale or incorrect inferred context.
Root Cause: Background anchor extraction runs every 5 turns, using LLM
           to extract "facts" from conversation. These are probabilistic,
           not user-confirmed, and are not deduplicated against
           structured_memory.
Current Mitigation:
           - Anchors labeled as "INFERRED" in system prompt
           - filtered against structured_memory before injection
           - Aria told to use "It sounds like..." language for inferred facts
Phase 3 Fix: Disable auto-extraction entirely. Explicit saves only.
             Memory write receipt. Idempotency protection.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-red-300 font-bold text-sm">TSB-005 — Token Meter Showing 0 / 2M (No Count)</span>
                <Tag label="FIXED ✅" color="green" />
              </div>
              <Code>{`Date:      Feb 28, 2026
            Component: components/chat/TokenMeter.jsx
            Symptom:   Token meter bar was empty and showed "0 / 2.0M". Context window
            appeared unused even in active conversations.
            Root Cause: TokenMeter relied entirely on msg.token_count field. That field
            is only populated if the backend explicitly returns a token count.
            Most messages don't have it set, so the sum was always 0.
            Additionally, the maxTokens was set to 2,000,000 (2M) which made
            any realistic token count visually indistinguishable from zero.
            Fix:       1. Added estimateTokens() fallback: text.length / 4 (chars → tokens).
            Used when token_count is 0 or absent.
            2. Reduced default maxTokens from 2,000,000 → 128,000
            (gpt-4o context window at time of fix — LEGACY REFERENCE. Active model is now gpt-5.2 with 200K context).
            3. Compact display: shows "12.3K / 128K" instead of raw numbers.`}</Code>
            </div>

            <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-red-300 font-bold text-sm">TSB-006 — Logs Page Expanded Row Collapses on Screenshot Attempt</span>
                <Tag label="FIXED ✅" color="green" />
              </div>
              <Code>{`Date:      Feb 28, 2026
            Component: pages/Logs.jsx — ErrorRow component
            Symptom:   Clicking to expand a log entry row then trying to take a
            screenshot caused the row to collapse immediately, preventing
            capture of the expanded detail view.
            Root Cause: The row used a <button> element. Browsers dismiss focus from
            buttons on click, and some screenshot tools trigger a blur/click
            event on the window that caused the button to re-fire its
            onClick, collapsing the just-expanded row.
            Fix:       Replaced <button> wrapper with <div role="div"> with cursor-pointer.
            Divs don't receive synthetic click events from screenshot tools,
            so expanded rows stay open.
            Also added select-text to the outer container so text is
            copyable from expanded detail view.`}</Code>
            </div>

            <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-red-300 font-bold text-sm">TSB-007 — OpenAI TTS Silent Failure (No Error, No Playback)</span>
                <Tag label="FIXED ✅" color="green" />
              </div>
              <Code>{`Date:      Feb 28, 2026
            Component: components/chat/ChatBubble.jsx — handleReadAloud() / TTS invoke
            Symptom:   Clicking the speaker icon would show the spinner indefinitely,
            then silently stop with no audio and no error message.
            Previous fix (TSB-001) wired TTS correctly but Axios returned
            audio in an unexpected format, causing .match() crash.
            After that fix, a NotSupportedError (no audio source found)
            appeared — the Blob was malformed or empty.
            Root Cause: base44.functions.invoke() returns Axios response. For binary
            endpoints (audio/mpeg), Axios may not auto-detect ArrayBuffer.
            The Blob was being created from an incompatible data type.
            Fix:       1. Explicit type guards: instanceof Blob | ArrayBuffer | ArrayBufferView.
            2. On any failure: logs to ErrorLog entity (non-blocking).
            3. Graceful fallback to browser SpeechSynthesis with toast warning.
            4. Error is never silent: either toast or fallback always fires.
            5. TTS is now modular — failure cannot affect chat message flow.
            ODEL:      TTS failures create an ErrorLog record with stage=TTS_INVOKE,
            error_code=TTS_CALL_FAILED, visible in /Logs page.`}</Code>
            </div>

              </div>

              <div className="bg-white/5 border border-white/10 rounded p-3 mt-4 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-orange-300 font-bold text-sm">TSB-008 — Welcome Page Infinite Loading Cycle</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: pages/Welcome.jsx — useEffect auth check
Symptom:   App stuck on Welcome page with "Preview is still loading" message,
           cycling indefinitely regardless of login state or page navigation.
           Spinner loops without ever progressing to Chat or auth UI.
Root Cause: Duplicate React import (import { useState } declared twice in
           pages/SystemBlueprint.jsx from prior context). While this didn't
           directly affect Welcome, it created a build/module error that
           cascaded into Welcome's rendering pipeline, causing the auth
           check to never complete properly.
Fix:       Removed duplicate useState import from SystemBlueprint.jsx.
           This cleared the module resolution error and allowed Welcome's
           useEffect auth check to execute cleanly.
           Auth flow now completes: isAuthenticated() → redirect to Chat
           OR render welcome UI.
Testing:   App now loads Welcome → transitions to Chat on auth success.`}</Code>
              </div>
              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-009 — TTS Auth Failure + Stack Overflow on Large Audio Buffers</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Feb–Mar 2026
Component: functions/textToSpeech — backend handler
Symptom:   After fixing TSB-007, TTS still failed: prolonged spinner,
           then 500 error. No audio produced.
Root Cause (1): base44.auth.me() was being called inside the function
           but SDK-invoked functions don't carry a user session token the
           same way. Auth check threw 401, blocking all TTS calls.
Root Cause (2): Large audio ArrayBuffer was being encoded to base64 using
           String.fromCharCode(...new Uint8Array(buffer)) — spread syntax
           on large buffers causes a stack overflow (too many arguments).
Fix:       1. Removed base44.auth.me() auth check from textToSpeech.
              Auth is handled by the calling context (ChatBubble).
           2. Replaced spread-based base64 with chunked loop:
                let binary = '';
                for (let i = 0; i < bytes.length; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                return btoa(binary);
           3. Model upgraded: tts-1-hd (highest quality OpenAI TTS).
Status:    Confirmed working. Feature locked (Fort Knox).`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-010 — VoiceSettings Modal Using Raw fetch() Instead of SDK</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 1, 2026
Component: components/chat/VoiceSettings.jsx — testVoice(), preview button
Symptom:   Voice selection in VoiceSettings modal appeared to work (toast
           confirmed selection) but voice did not actually change — all
           playback defaulted to robotic US English or failed silently.
Root Cause: VoiceSettings was still using raw fetch('/api/functions/textToSpeech')
           instead of base44.functions.invoke(). The raw fetch path expected
           a binary audio/mpeg response (Blob), but textToSpeech now returns
           JSON with base64-encoded audio (audio_base64 field). The Blob was
           therefore malformed — it contained JSON text, not audio bytes.
Fix:       Replaced all fetch() calls in VoiceSettings with:
             base44.functions.invoke('textToSpeech', { text, voice, speed })
           Added shared playBase64Audio() helper:
             atob(data.audio_base64) → Uint8Array → Blob → ObjectURL → Audio()
           Both testVoice() and the preview button now use this path.
           Voice selection now correctly passes chosen voice ID to OpenAI.
Lock:      Both voice systems (Google Web Speech + OpenAI TTS) now LOCKED.
           See Fort Knox comments in ChatInput.jsx and VoiceSettings.jsx.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-011 — False Premise: "TTS 5.2" / GPT-5.2 TTS Does Not Exist</span>
                  <Tag label="PERMANENT RECORD ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 1, 2026
Component: functions/textToSpeech — model selection
Symptom:   Attempted to use "tts-5.2" or "gpt-5.2" as the TTS model name
           when upgrading to "the highest quality voice model."
           OpenAI returned an error — model not found.
Root Cause: FALSE PREMISE. As of March 2026, OpenAI's TTS models are:
             - tts-1        (standard quality)
             - tts-1-hd     (highest quality — THIS IS THE CORRECT MODEL)
           There is no "tts-5.2", "gpt-5.2 TTS", or numeric version
           TTS model in OpenAI's API. The gpt-5.x namespace is for
           chat/completion models ONLY, not audio generation.
Fix:       Model set to tts-1-hd. Confirmed working. Locked.
Lock Constraint (do not violate):
           - Never change TTS model without verifying the exact model ID
             against OpenAI's live model list: GET /v1/models
           - Do not assume chat model version numbers map to TTS models
           - tts-1-hd is the ceiling until OpenAI releases a named successor
Future:    If OpenAI releases a new TTS model, verify via /v1/models first,
           write a new TSB entry, update the lock comment, then deploy.
           Do not assume — always verify the model name exists before use.
GREP ANCHOR: CAOS_OPENAI_TTS_LOCK_v1_2026-03-01`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-012 — Token Meter Shows "Estimated" in Published App, "Live" in iframe</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 1, 2026
Component: components/chat/TokenMeter.jsx + pages/Chat.jsx — wcwState management
Symptom:   Inside the Base44 editor iframe, the token meter correctly showed
           "Working Context Window (live)" — real token counts from the backend.
           In the published app (after deployment), it showed "Estimated token usage"
           with a "~" suffix — falling back to character-count estimation.
Root Cause (1): On thread selection (conversation switch), Chat.jsx was not fetching
           the last DiagnosticReceipt for that session_id. Since wcwState was only
           updated AFTER a new message was sent, a freshly loaded thread (or a
           thread opened in a new browser session) had no wcwState and fell back
           to the estimate path.
Root Cause (2): wcwState was never reset on thread switch. Stale WCW numbers from a
           previous thread would persist into the next thread's display until a new
           message was sent — showing wrong values, not just estimated ones.
In the iframe: Because the developer session was active and a message had already
           been sent, wcwState was populated from the last response. The published
           user opened a thread cold (no recent message), so the fallback triggered.
Fix (1):   On thread load (currentConversationId useEffect), fetch the last
           DiagnosticReceipt for that session:
             base44.entities.DiagnosticReceipt.filter({ session_id }, '-created_date', 1)
           If found: setWcwState({ used: receipt.wcw_used, budget: receipt.wcw_budget })
           This restores live data immediately on thread open without sending a message.
Fix (2):   Added reset effect: when currentConversationId changes, immediately
           setWcwState({ used: null, budget: null }) before the receipt load completes.
           Prevents cross-thread stale WCW bleed.
GREP ANCHOR: CAOS_WCW_METER_FIX_v1_2026-03-01`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-014 — Web Search & Artifact Processing Not Implemented</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 2, 2026
              Component: Artifact handling, web search, external knowledge detection
              Symptom:   The spec called for:
              1. Real artifact processing (file upload → read)
              2. Automatic web search on time-sensitive queries
              3. User storage box for downloaded/generated files
              But these were only documented, not implemented.
              Root Cause: Feature was specified but no backend functions existed to:
              - Fetch and validate artifacts from multiple sources
              - Detect when external knowledge was needed
              - Persist user downloads to storage
              - Provide structured web search results
              Fix:       Implemented three new modular backend functions:

              1. functions/core/artifactLoader.js
              - Fetches artifacts from base44_file, URL, inline_base64
              - Validates size limits (5MB per, 10MB total)
              - Extracts text from text/json files (200K char limit)
              - Returns structured receipt with sha256 hash
              - Supports images (multimodal) and binary files

              2. functions/core/webSearch.js
              - Performs real Bing API web search
              - Returns structured results: title, url, snippet, published date
              - Signature: { query, limit } → { results[], hash, timestamp }
              - Uses RUNTIME_AUTHORITY.capabilities.web_search.provider

              3. functions/core/externalKnowledgeDetector.js
              - Analyzes user input for time-sensitive keywords
              - Detects: today, latest, current, news, price, weather, stock, etc
              - Returns: { requires_web: boolean }
              - Enables automatic web search WITHOUT explicit user trigger

              4. Entity: UserStorage (new schema)
              - user_email, file_name, mime_type, size_bytes, sha256
              - base44_file_id, file_type, created_at
              - Provides deterministic file tracking (not anonymous blobs)

              Impact:    - User can upload files → CAOS processes them → returns to user
              - User asks time-sensitive questions → automatic web search
              - User downloads/exports files → stored in UserStorage → retrievable
              - All operations logged with SHA256 hashes for integrity
              - Web results properly cited (not hallucinated)
              Behavior:  Web search is now NEEDS_BASED_AUTOMATIC (from runtimeAuthority):
              If externalKnowledgeDetector.requires_web = true,
              hybridMessage calls webSearch() automatically.
              No user permission dance. No friction.
              Exactly like this system.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-015 — Files/Photos/Links Panel: Wrong Views, Non-Persistent Links, Broken Navigation</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 3, 2026
Component: components/chat/ChatHeader.jsx, components/chat/ProfilePanel.jsx,
           components/files/FileManager.jsx, pages/Chat.jsx
Symptom 1: Dropdown showed "Folders" instead of "Links" — clicking it opened a generic view.
Symptom 2: "Photos" and "Files" menu items both routed to the "Links" view in ProfilePanel.
Symptom 3: Links were not persistently stored — loadLinks() scanned all Message records
           on every load, extracting URLs from message content. No persistence = no delete.
Symptom 4: Files and photos shared in chat were not appearing in the Files/Photos panels.
Symptom 5: ProfilePanel did not respond to initialView prop changes (first open only).
Root Cause 1: ChatHeader had "Folders" label hardcoded calling onShowFiles('folders').
              The handler in ProfilePanel had no 'folders' case, so it fell through.
Root Cause 2: ProfilePanel used useState(initialView || 'profile') — the initial value was
              set once on mount. When the parent called setFileView(view) → setShowProfile(true),
              ProfilePanel was already mounted and its state didn't update.
Root Cause 3: loadLinks() in FileManager queried Message entity and extracted URLs inline
              each time — no writes to UserFile. No UserFile records = nothing to delete.
Root Cause 4: Chat.jsx saveToUserFiles/saveImageToPhotos helpers existed but were incomplete
              or referenced different function names inconsistently.
Fix 1:  ChatHeader: changed label "Folders" → "Links", handler → onShowFiles('links')
Fix 2:  ProfilePanel: added useEffect(() => { if (initialView) setActiveView(initialView) }, [initialView])
        Now responds to prop changes when panel is already open.
Fix 3:  FileManager.loadLinks(): replaced inline Message scan with:
          base44.entities.UserFile.filter({ created_by: user.email, type: 'link' })
        Links are now read from the same persistent store as files/photos.
Fix 4:  Chat.jsx: unified saveToUserFiles(url, type, name, mimeType) helper.
        Called after EVERY send: fileUrls → save as photo or file based on extension.
        Also added extractAndSaveLinks(text) → scans AI reply for URLs → saves as 'link'.
Fix 5:  UserFile entity: confirmed 'link' is a valid type in the enum.
Impact: Files, photos, and links all now persistently stored in UserFile entity.
        All three are deletable. All three panels show correct data.
        Navigation from dropdown correctly opens the right panel view.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-016 — pages/Chat.jsx Exceeds Hard File Size Limit (1341 lines)</span>
                  <Tag label="IDENTIFIED — REFACTOR REQUIRED ⚠️" color="yellow" />
                </div>
                <Code>{`Date:      Mar 3, 2026
Component: pages/Chat.jsx
Symptom:   File has grown to 1341 lines. Hard limit is 400. Preferred is 200.
           The file now handles: auth, conversation management, message sending,
           file upload auto-save, link extraction, guest mode, WCW state,
           error logging, timeout management, session resume, and rendering.
           This violates Rule 2 (File Size Hard Limits) and Rule 1 (Modularity).
Root Cause: Chat.jsx was the original single-page app. Features were added inline
            instead of being extracted to sub-components and hooks.
            The sendMessage handler alone is ~200 lines.
Impact:    - Finding and fixing bugs takes longer (hard to locate the right code)
           - Adding features risks side effects (too much logic in one place)
           - A new agent cannot safely edit this without reading the whole file
Status:    IDENTIFIED. Not yet refactored. No new features should be added to
           Chat.jsx until refactor is complete.
Required Action:
  Extract to:
    hooks/useSendMessage.js     — handleSendMessage, timeout, error logging
    hooks/useConversations.js   — load/create/delete/rename conversations
    hooks/useGuestMode.js       — guest session logic
    hooks/useFileAutoSave.js    — saveToUserFiles, extractAndSaveLinks
    components/chat/ChatLayout.jsx — rendering (chat container, scroll, input)
  Chat.jsx should become an orchestrator of ~200 lines, not an implementor.
Priority:  HIGH. Must complete before next feature addition.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-019 — Unterminated String Literal in SystemBlueprint (TTS Lock Block)</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 4, 2026
Component: pages/SystemBlueprint.jsx — Section 11 (TTS), Path A Code block
Symptom:   Build failed with:
             Unterminated string literal at line 544:70
             SyntaxError: Unterminated string constant
           App would not compile. All pages broken.
Root Cause: The <Code> block for the OpenAI TTS lock signature was written using
           double-quote string syntax: {"...multiline content..."}
           JavaScript double-quoted (and single-quoted) strings CANNOT span
           multiple lines. The string started on line 544 but the closing quote
           was never found — parser hit EOF.
           Template literals (backtick strings) are required for multi-line JSX
           string expressions.
Fix:       Changed the Code block from:
             <Code>{"LOCK_SIGNATURE: ...multiline..."}
           to:
             <Code>{\`LOCK_SIGNATURE: ...multiline...\`}
           Backtick template literals support multi-line strings natively.
Rule:      ANY multi-line string inside a JSX expression {} MUST use backtick
           template literals, never double or single quotes.
           All existing Code blocks in this file already used backticks correctly —
           this was a one-off introduced during a manual edit.`}</Code>
              </div>

              <p className="text-white/40 text-xs">TSB entries are permanent records. Resolved entries stay in this log. New issues get a new TSB number.</p>
              </div>
          </Section>

          {/* BUILD SEQUENCE */}
          <Section title="15. Build Phases — CAOS_BUILD_SEQUENCE_v1" color="cyan">
            <p className="text-cyan-200 font-semibold">This is the locked execution sequence. Phases are executed in order. No phase is started until the previous one meets its exit condition.</p>

            <div className="space-y-5 mt-4">

              {/* PHASE B */}
              <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">PHASE B — Authority Domain Separation (Governance Invariant)</span>
                  <Tag label="LOCKED ✅" color="green" />
                </div>
                <p className="text-gray-300 text-xs mb-2"><strong>Goal:</strong> Formally codify the separation between Aria (AI persona) and CAOS (platform). No agent or module may blur this boundary.</p>
                <Code>{`B.1 Authority Domain Separation — documented in Section 0.8 (COMPLETE ✅)
     — Aria speaks. CAOS routes. Separate authority domains.
     — No self-modification. No unsanctioned writes. No identity conflation.
     — Enforcement: TSB entry + owner sign-off required for any boundary violation.

EXIT CONDITION:
  Section 0.8 present and LOCK_SIGNATURE confirmed. ✅ DONE — Mar 1, 2026`}</Code>
              </div>

              {/* PHASE C */}
              <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">PHASE C — Pull-Only Awareness Rule (Governance Invariant)</span>
                  <Tag label="LOCKED ✅" color="green" />
                </div>
                <p className="text-gray-300 text-xs mb-2"><strong>Goal:</strong> Formally codify that all system awareness must be pull-based. No push-based state injection. No unsolicited API chatter.</p>
                <Code>{`C.1 Pull-Only Awareness Rule — documented in Section 0.9 (COMPLETE ✅)
     — Modules wait to be invoked. They do not self-activate or poll.
     — No background writes. No passive watchers. No proactive context injection.
     — Enforcement: Any push-based pattern is a Rule 5 (No Silent Writes) violation.

EXIT CONDITION:
  Section 0.9 present and LOCK_SIGNATURE confirmed. ✅ DONE — Mar 1, 2026

NOTE: Audio work (STT chunking) is deferred until B and C are locked.
      B ✅ → C ✅ → A (STT chunking — next phase)`}</Code>
              </div>

              {/* PHASE 1 */}
              <div className="bg-yellow-950/40 border border-yellow-500/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-300 font-bold text-sm">PHASE 1 — Observability & Deterministic Error Control</span>
                  <Tag label="IN PROGRESS 🔧" color="yellow" />
                </div>
                <p className="text-gray-300 text-xs mb-2"><strong>Goal:</strong> No silent failure. No masked error. Full admin visibility into pipeline stage at point of failure.</p>
                <Code>{`1.1 Stage Tracker (COMPLETE ✅)
     — setStage()/getStage() in hybridMessage
     — Tracks: AUTH | PROFILE_LOAD | MEMORY_WRITE | HISTORY_LOAD |
               HEURISTICS | PROMPT_BUILD | OPENAI_CALL | MESSAGE_SAVE | RESPONSE_BUILD

1.2 Deterministic Error Envelope — ODEL v1 (COMPLETE ✅)
     — buildDeterministicErrorEnvelope(err, ctx) replaces generic catch
     — Persists structured ErrorLog: error_id, stage, error_code,
       model_used, latency_ms, retry_attempted, system_version
     — Returns non-200 with: { reply (public-safe), error_id, error_code, stage }
     — body/user hoisted above try{} so catch has full context

1.3 Admin Error Console Rendering (PENDING)
     — Console renders structured ErrorLog envelopes
     — Expandable JSON, filter by stage + error_code
     — Query error by error_id

1.4 Remove UI Generic Masking (PENDING)
     — No more 200-status masking of real errors
     — No auto-retry without explicit policy

EXIT CONDITION:
  Forced failure → structured envelope → visible in ErrorLog → queryable by error_id`}</Code>
              </div>

              {/* PHASE 2 */}
              <div className="bg-purple-950/40 border border-purple-500/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-300 font-bold text-sm">PHASE 2 — Model Awareness & Self-Diagnostic Mode</span>
                  <Tag label="RESERVED" color="purple" />
                </div>
                <p className="text-gray-300 text-xs mb-2"><strong>Goal:</strong> Model can reason about its own failures when ADMIN_MODE is enabled.</p>
                <Code>{`2.1 Diagnostic Context Injection
     — Inject last_error_envelope into system prompt when ADMIN_MODE = true

2.2 Structured Self-Diagnostic Output
     — Model returns: probable_cause, reproduction_vector, confidence_score

2.3 Version Metadata Exposure
     — hybridMessage_version, DCS_version, system_version, model_used
       returned in every execution_receipt

EXIT CONDITION:
  Simulated rate-limit → correct self-diagnostic reasoning from Aria`}</Code>
              </div>

              {/* PHASE 3 */}
              <div className="bg-green-950/40 border border-green-500/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-300 font-bold text-sm">PHASE 3 — Memory Stabilization & Mutation Control</span>
                  <Tag label="RESERVED" color="purple" />
                </div>
                <p className="text-gray-300 text-xs mb-2"><strong>Goal:</strong> Memory becomes fully auditable and deterministic. No surprise writes.</p>
                <Code>{`3.1 Disable Auto Anchor Extraction (if still active)
3.2 Enforce Explicit Save Triggers — no silent writes
3.3 Memory Write Receipt: memory_write_success, memory_entity, anchor_count_delta
3.4 Idempotency Protection — repeated request = identical memory state

EXIT CONDITION:
  Repeated identical request → memory state unchanged (idempotent)`}</Code>
              </div>

              {/* PHASE 4 */}
              <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-indigo-300 font-bold text-sm">PHASE 4 — Cognitive Scaling Governance</span>
                  <Tag label="RESERVED" color="purple" />
                </div>
                <p className="text-gray-300 text-xs mb-2"><strong>Goal:</strong> DCS becomes predictable and measurable across all prompt types.</p>
                <Code>{`4.1 Log cognitive_level in execution_receipt (currently present ✅)
4.2 Log depth_mode in execution_receipt (currently present ✅)
4.3 Admin-only cognitive telemetry dashboard
4.4 Confirm no COMPACT clipping on short prompts

EXIT CONDITION:
  Complex architectural prompt reliably yields LAYERED depth`}</Code>
              </div>

              {/* PHASE 5 */}
              <div className="bg-blue-950/40 border border-blue-500/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">PHASE 5 — Cross-Thread Deterministic Recall</span>
                  <Tag label="RESERVED" color="purple" />
                </div>
                <p className="text-gray-300 text-xs mb-2"><strong>Goal:</strong> Scoped recall across sessions without context bleed.</p>
                <Code>{`5.1 Lane-Scoped Recall — wire Lane entity into hybridMessage recall
5.2 Profile-Global Anchor View — single query across all sessions
5.3 Bounded Rolling Context Window — enforce WCW budget (SessionContext entity)
5.4 Explicit Recall Labeling — every recalled fact labeled with source + tier

EXIT CONDITION:
  Thread isolation intact under cross-thread recall query`}</Code>
              </div>

              {/* PHASE 6 */}
              <div className="bg-gray-950/40 border border-gray-500/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-300 font-bold text-sm">PHASE 6 — Admin Command Surface Expansion</span>
                  <Tag label="FUTURE" color="yellow" />
                </div>
                <p className="text-gray-300 text-xs mb-2"><strong>Goal:</strong> Full operational visibility from Admin dashboard.</p>
                <Code>{`TPM / RPM usage metrics
Error rate % by stage
Model switch verification
Memory growth rate tracking
Session health heatmap`}</Code>
              </div>

            </div>

            {/* NOT DOING YET */}
            <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4 mt-4">
              <p className="text-red-300 font-semibold text-xs mb-2">NOT IN SCOPE (future architectural layers — do not touch):</p>
              <Code>{`- Python memory server replatform (FastAPI + SQLite)
- External logging services (Datadog, Sentry, etc.)
- Audio layer (blueprint complete, not implementing yet)
- Multi-agent orchestration backend
- SDK mutation guard rails
- Presentation geometry refactor`}</Code>
            </div>
          </Section>

          {/* 14. BASE44 PLATFORM CONSTRAINTS */}
          <Section title="16. Base44 Platform Constraints (Deno Serverless)" color="red">
            <p className="text-gray-300">These are hard platform facts, not preferences. Every architectural decision involving backend functions must be designed around them. Verified Mar 1, 2026.</p>

            <h4 className="text-white font-semibold mt-3">1. No Cross-Function Local Imports</h4>
            <Code>{`CONSTRAINT: Functions CANNOT import local code from other function files.
Each function is deployed and sandboxed independently.

CORRECT pattern (inter-function calls):
  await base44.functions.invoke('core/memoryEngine', { action: 'save', ... })

WRONG pattern (will fail at deploy):
  import { saveAtomicMemory } from './core/memoryEngine.js'  // ← MODULE NOT FOUND

IMPLICATION: All shared logic must be either:
  a) Inlined into the calling function (pure functions, no I/O — safe), OR
  b) Extracted into a separately invokable function and called via SDK.
  
hybridMessage CONTRACT COMPLIANCE:
  Pure functions (no I/O): inlined — detectMemorySave, compressHistory, openAICall, etc.
  I/O operations: extracted — core/memoryEngine, core/heuristicsEngine,
                              core/receiptWriter, core/errorEnvelopeWriter`}</Code>

            <h4 className="text-white font-semibold mt-3">2. Full Message History is Readable from Entity Storage</h4>
            <Code>{`CONFIRMED: Functions can read full thread history directly from Message entity,
independent of LLM context window.

API pattern:
  const msgs = await base44.entities.Message.filter(
    { conversation_id: session_id },
    '-created_date',
    1000   // max per call
  );

Limits:
  - Max 1000 records per filter() call
  - Pagination via skip= for threads exceeding 1000 messages
  - Total response payload limit: ~6 MB (all records combined)
  - Very long threads with rich message content may approach payload cap

Current hybridMessage usage:
  MAX_HISTORY_MESSAGES = 100 (well within limits)
  compressHistory(): HOT_HEAD=15 + HOT_TAIL=40 shown in full, middle summarized`}</Code>

            <h4 className="text-white font-semibold mt-3">3. Hard Execution Limits</h4>
            <Code>{`Max function runtime:      300 seconds (5 minutes)
Max response payload:      6 MB
Max request payload:       6 MB
Entity rate limits:        Dynamic (not published). Sustained high-volume ops
                           (thousands/sec) may throttle. Design for batching.

DESIGN RULES:
  - hybridMessage pipeline must complete well under 300s (target <10s)
  - Message payloads with embedded base64 (e.g. audio) must stay under 6 MB
  - Bulk entity ops should be batched, not rapid individual calls`}</Code>

            <h4 className="text-white font-semibold mt-3">4. Scheduled Tasks — YES (via Automations)</h4>
            <Code>{`SUPPORTED: Scheduled backend function triggers via Base44 Automations.
Min interval: 5 minutes.

Pattern for external sync (e.g., polling and pushing to Python server):
  create_automation(
    automation_type="scheduled",
    name="Sync Messages to Plane B",
    function_name="syncToPlaneBPoller",
    repeat_interval=5,
    repeat_unit="minutes"
  )

Use case: periodic poller queries new Message records, pushes to external service.
Trade-off: up to 5-minute lag vs. real-time event-driven sync (see item 5).`}</Code>

            <h4 className="text-white font-semibold mt-3">5. Entity Event Triggers — YES (on Message created/updated/deleted)</h4>
            <Code>{`SUPPORTED: Entity automations fire a backend function on entity changes.

Pattern for real-time Plane B mirroring:
  create_automation(
    automation_type="entity",
    name="Mirror Message to Plane B",
    function_name="planeBMessageMirror",
    entity_name="Message",
    event_types=["create"]
  )

Function payload received:
  {
    event: { type: "create", entity_name: "Message", entity_id: "<id>" },
    data: { ... full message record ... },    // null if payload_too_large
    payload_too_large: false                  // if true: fetch via entity API
  }

IMPLICATION FOR PLANE B:
  - Entity automation on Message.create is the preferred sync path.
  - No need to poll. No lag. Fires on every message save.
  - Alternatively: mirror inside hybridMessage MESSAGE_SAVE stage (inline, no automation needed).
  - Inline mirror is simpler but couples Plane B latency to the main pipeline.
  - Automation is decoupled but adds one async hop.`}</Code>

            <h4 className="text-white font-semibold mt-3">6. Outbound HTTP — YES (no egress restrictions)</h4>
            <Code>{`CONFIRMED: Functions can make outbound HTTP calls to any external service
using Deno's built-in fetch(). No IP allowlists, no domain restrictions.

RECOMMENDED PATTERN for external service calls (e.g., Plane B Python server):
  const MAX_RETRIES = 3;
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const res = await fetch(PLANE_B_URL, { method: 'POST', body: JSON.stringify(payload), ... });
      if (res.ok) break;
      throw new Error(\`HTTP \${res.status}\`);
    } catch (err) {
      attempt++;
      if (attempt >= MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt))); // exponential backoff
    }
  }

Base44 does NOT provide built-in retry or dead-letter queue for outbound calls.
Implement retry/backoff inside the function itself.
For mission-critical calls: log failures to ErrorLog entity for auditability.`}</Code>

            <div className="bg-yellow-950/50 border border-yellow-500/30 rounded p-3 mt-3">
              <p className="text-yellow-300 text-xs font-semibold">ARCHITECTURAL DECISION RECORD — Mar 1, 2026: Based on these constraints, the recommended Plane B sync strategy is an entity automation on Message.create → planeBMessageMirror function → outbound fetch to Python server with exponential backoff. This keeps hybridMessage clean (spine only) and makes Plane B sync decoupled and independently observable.</p>
            </div>
          </Section>

          {/* 15. FOUNDATIONAL MODULES — BUILT, NOT WIRED */}
          <Section title="17. Foundational Modules — Built, Not Wired (Catalogue)" color="indigo">
            <p className="text-gray-300 text-xs mb-3">These modules exist in <code>functions/core/</code> and were purpose-built for future memory and tool expansion. Each is documented here so we can wire them in deliberately, one at a time. None are active in the current hybridMessage pipeline.</p>

            <div className="space-y-5">

              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-indigo-300 font-bold text-sm">laneIsolation — Topic Context Partitioning</span>
                  <Tag label="CANDIDATE: Phase 5" color="purple" />
                </div>
                <Code>{`File:     functions/core/laneIsolation
Purpose:  Enforce strict lane (topic) boundaries on memory recall.
          Prevents cross-lane information leakage between unrelated contexts.

Key functions:
  validateLaneAccess(request_lane_id, active_lane_id, allowed_cross_lane)
    → { allowed: boolean, deny_reason? }
  filterRecordsByLane(records, active_lane_id, allowed_cross_lane)
    → filtered records (fail-closed: no lane tag = deny)
  filterAnchorsByLane(anchors, active_lane_id, allowed_cross_lane)
    → GLOBAL anchor_type anchors pass through any lane filter
  getDefaultCrossLanePolicy(profile_id, active_lane_id)
    → [] (no cross-lane access by default)

Design note:
  GLOBAL anchors are accessible from any lane.
  LANE anchors are scoped to their lane_id.
  Currently no lanes are set on structured_memory entries
  — wiring this requires tagging each memory entry with a lane_id.

Intended activation path:
  1. Tag new structured_memory entries with active lane (e.g. "general", "caos-build", "immigration")
  2. On recall, pass active lane through filterRecordsByLane() before injecting into prompt
  3. Wire Lane entity to track per-session lane context`}</Code>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-indigo-300 font-bold text-sm">indexedSearch — Token-Based Thread Search Engine</span>
                  <Tag label="CANDIDATE: Phase 5" color="purple" />
                </div>
                <Code>{`File:     functions/core/indexedSearch
Purpose:  Fast, deterministic thread/conversation search by title tokens.
          Zero LLM. Pure AND-intersection token matching.
          Backed by ThreadToken + ThreadTokenMeta entities (already built).

Key class: IndexedThreadSearchEngine
  .buildIndexFromThreads(threads[])    — builds in-memory token → thread ID index
  .search(query)                       — AND intersection of normalized tokens
    → { queryTerms, normalizedTerms, tokenHits, matchedThreadIds, matchCount, confidence }
  .formatSearchReport(operation)       → human-readable search report
  .updateThread(thread)                → incremental index update (on rename)
  .getIndexHealth()                    → distinct_tokens, total_threads, etc.

Match types: "exact" (1 match) | "partial" (multiple) | "none"
Confidence:  HIGH (≥1 match) | MED (searched, 0 results) | LOW (empty query)

Current limitation: TypeScript interfaces — uses .ts imports (tokenizer.ts).
  Must be verified compatible with Deno deploy before wiring.

Intended activation path:
  1. On conversation load: build index from user's Conversation list
  2. When user types in ConversationSearch, invoke search() instead of naive filter
  3. On thread rename: call updateThread() to keep index current
  4. Store persistent index in ThreadToken/ThreadTokenMeta entities (already exist)`}</Code>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-indigo-300 font-bold text-sm">continuousLearning — Automatic Fact Extraction from Conversations</span>
                  <Tag label="CANDIDATE: Phase 3 / Post Phase B" color="purple" />
                  <Tag label="⚠️ REVIEW BEFORE WIRING" color="yellow" />
                </div>
                <Code>{`File:     functions/core/continuousLearning
Purpose:  After each conversation turn, uses gpt-4o-mini to extract personal facts
          about the user and persist them to the LearnedFact entity.
          Also provides recall: recallRelevantFacts() scores facts against current query.

Key functions:
  extractAndPersistFacts({ base44, userId, threadId, userMessage, assistantMessage })
    → uses OpenAI (gpt-4o-mini) to extract: personal, work, relationship, preference, goal, decision facts
    → persists to LearnedFact entity (fact_type, category, subject, fact_content, confidence, tags)
    → returns { ok, facts_learned, facts }

  recallRelevantFacts({ base44, userId, userMessage })
    → loads all LearnedFact records for user
    → scores by keyword match, subject match, recency, reference_count
    → returns top 15 matching facts
    → updates reference_count on recalled facts

  formatFactsForContext(facts)
    → formats fact list into system prompt block grouped by category

Design note / CAUTION:
  This is PASSIVE extraction — facts are saved WITHOUT user confirmation.
  This is the same approach that Phase A was designed to replace (memory_anchors auto-extraction).
  Phase A saves ONLY user-triggered facts. continuousLearning saves INFERRED facts.
  These are different philosophies. Do not wire continuousLearning silently without
  a clear policy on: confidence thresholds, user visibility, edit/delete capability.

  LearnedFact entity exists and is ready. Uses a separate entity from structured_memory.
  Could complement Phase A (explicit) with a passive background layer IF properly gated.

Intended activation path (if adopted):
  1. Enable as an opt-in background job (entity automation on Message.create)
  2. Set minimum confidence threshold (recommend ≥ 0.8 only)
  3. Surface LearnedFact entries in MemoryPanel so user can review/delete
  4. Add a toggle in UserProfile: continuous_learning_enabled: true/false`}</Code>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-indigo-300 font-bold text-sm">contextLoader — Structured Context Journal Boot Sequence</span>
                  <Tag label="CANDIDATE: Future Pipeline Refactor" color="purple" />
                </div>
                <Code>{`File:     functions/core/contextLoader
Purpose:  Loads context in a strict ordered sequence before any inference:
          1. Kernel context (system identity — Aria/CAOS)
          2. Bootloader context (policy/mode config)
          3. Profile context (UserProfile — REQUIRED)
          4. Project context (optional)
          5. Runtime context (session state from Conversation entity)
          Fail-closed: if kernel, bootloader, or profile missing → throws, no inference.

Key functions:
  loadContextJournal(session_id, user_email, base44)
    → returns loaded_contexts object keyed by /context/<scope>/<path>
  validateContextJournal(context_journal)
    → checks required scopes: kernel, bootloader, profile

Current hybridMessage behavior:
  Profile is loaded inline (PROFILE_LOAD stage). Kernel/bootloader are embedded
  directly in the system prompt as hardcoded strings. Runtime is loaded ad hoc.
  contextLoader would formalize and order this into a single governed boot sequence.

Intended activation path:
  Replace hybridMessage PROFILE_LOAD stage with loadContextJournal() call.
  The returned loaded_contexts then feeds into contextBuilder (below).
  This makes context loading observable, logged, and fail-closed by contract.`}</Code>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-indigo-300 font-bold text-sm">contextBuilder — Prompt Block Assembly from Context Journal</span>
                  <Tag label="CANDIDATE: Future Pipeline Refactor" color="purple" />
                </div>
                <Code>{`File:     functions/core/contextBuilder
Purpose:  Takes context loaded by contextLoader and assembles the system prompt blocks:
          - identityBlock (Aria/CAOS identity hard rules)
          - threadBlock (ThreadMemory: short summary, tags, open loops, emotional context)
          - userBlock (UserProfileMemory: profile summary, recent state, hard rules)
          - environmentBlock (EnvironmentState: current environment awareness)

Key function:
  buildGenContext({ base44, userId, threadId })
    → loads ThreadMemory + UserProfileMemory + EnvironmentState entities
    → assembles structured system prompt blocks
    → returns { identityBlock, threadBlock, userBlock, environmentBlock }

Dependency note:
  Reads from ThreadMemory and UserProfileMemory entities (separate from structured_memory).
  These are the "evolving summary" entities populated by memoryUpdate (see below).
  contextBuilder is the READ side; memoryUpdate is the WRITE side.
  Both must be activated together to form a complete cycle.

Intended activation path:
  Replace hybridMessage inline system prompt construction with buildGenContext().
  Pair with contextLoader for a full boot → build → inject sequence.`}</Code>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-indigo-300 font-bold text-sm">memoryUpdate — Post-Turn Evolving Summary Writer</span>
                  <Tag label="CANDIDATE: Phase 3 / High Value" color="purple" />
                  <Tag label="⭐ HIGH PRIORITY" color="green" />
                </div>
                <Code>{`File:     functions/core/memoryUpdate
Purpose:  After each AI turn completes, calls gpt-4o-mini to update two rolling summaries:
          - ThreadMemory: thread-level evolving context (summary_short, summary_context,
            open_loops, topic_tags, key_decisions, artifacts_created, emotional_context)
          - UserProfileMemory: user-level profile (profile_summary, recent_state,
            active_projects, interaction_style, hard_rules)

Key function:
  postTurnMemoryUpdate({ base44, userId, threadId, userMessage, assistantMessage, traceId })
    → builds LLM prompt with previous summaries + new turn
    → calls gpt-4o-mini (cheap, temperature 0.3)
    → validates and persists updated ThreadMemory + UserProfileMemory
    → also updates EnvironmentState (via environmentLoader)
    → returns { ok, traceId }

Why this is high priority:
  Current hybridMessage injects raw conversation history (up to 100 messages).
  memoryUpdate would replace that with a compact, evolving summary that:
  - Tracks open loops (unresolved questions/tasks)
  - Records key decisions
  - Notes emotional context (urgency, mood, collaboration style)
  - Maintains profile continuity across threads
  This is the core of "Aria remembers what we've been working on" even across sessions.

Dependency:
  Requires ThreadMemory + UserProfileMemory entities (already exist in schema).
  contextBuilder reads what memoryUpdate writes.

Intended activation path:
  1. Wire as post-turn call in hybridMessage MESSAGE_SAVE stage (or entity automation)
  2. Run async / best-effort (does not block the reply to user)
  3. On next session load, contextBuilder reads the summaries
  4. Replace raw history injection with summaries + last N messages (hot context only)`}</Code>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-indigo-300 font-bold text-sm">toolExecutor — Selector-Gated Tool Router</span>
                  <Tag label="CANDIDATE: Future — Tools Phase" color="purple" />
                </div>
                <Code>{`File:     functions/core/toolExecutor
Purpose:  Routes tool requests to the correct executor based on what the
          Selector has authorized in selector_decision.tools_allowed.
          Enforces: no tool runs without selector authorization.

Key function:
  executeTool({ user_input, selector_decision }, base44)
    → checks selector_decision.tools_allowed
    → priority order: IMAGE → WEB_SEARCH → FILE_SEARCH
    → delegates to: imageGeneratorExecutor, webSearchExecutor
    → FILE_SEARCH: stub only, not yet implemented

Current executors (functions/executors/):
  imageGenerator      — generates images via CAOS integration
  webSearchExecutor   — web search (implementation TBD)
  youtubeSearch       — YouTube search (implementation TBD)
  analyzeThreads      — thread analysis (implementation TBD)

Why this matters:
  This is the gateway for giving Aria real tools: web search, image gen,
  file search, code execution, etc. The architecture is already here.
  The selector gate ensures tools only run when explicitly authorized per-turn.

Intended activation path:
  1. Define which tools are available (update SessionManifest)
  2. Wire selectorEngine to authorize tools based on user intent
  3. hybridMessage: after heuristics, if tools_allowed → call executeTool()
  4. Tool result injected into system prompt before OpenAI call
  5. Implement remaining executors (webSearch, fileSearch) one at a time`}</Code>
              </div>

            </div>

            <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-3 mt-4">
              <p className="text-green-300 text-xs font-semibold">RECOMMENDED WIRING ORDER (based on value and readiness):</p>
              <Code>{`1. memoryUpdate         → highest value, relatively self-contained (Phase 3)
2. contextBuilder       → pairs with memoryUpdate (must do together)
3. contextLoader        → formalizes what hybridMessage already does
4. laneIsolation        → unlocks topic isolation (Phase 5)
5. continuousLearning   → passive learning (careful — review policy first)
6. indexedSearch        → better thread search (Phase 5)
7. toolExecutor         → gates future tool expansion (Tools Phase)`}</Code>
            </div>
          </Section>

          {/* CONTINUATION TOKEN */}
          <Section title="18. CAOS Continuation Token — vNext (2026-03-02)" color="green">
            <p className="text-gray-300 text-xs mb-3">Paste this block as the first message in any new builder session where thread continuity has been lost. It encodes tone, governance posture, architectural direction, and work discipline.</p>
            <pre className="bg-black/60 border border-green-500/40 rounded-lg p-4 text-xs text-green-300 whitespace-pre-wrap select-all">{`CAOS_CONTINUATION_TOKEN_vNEXT_2026-03-02
ROOT: CAOS
MODE: GOVERNED_BUILD_CONTINUATION

CONTEXT SUMMARY
This continuation excludes all unrelated geopolitical discussion.
Focus is strictly CAOS architecture, governance, determinism, and platform evolution.

DIRECTIONAL INTENT
CAOS is not a chatbot.
CAOS is a deterministic AI operating platform.

Core principles:
- No silent mutation.
- No fabrication.
- No self-doubt reflex overriding manifest truth.
- No heuristic drift overriding system authority.
- Blueprint-first.
- Inspection before modification.
- Modular injection.
- Spine purity.
- Explicit learning only.
- Observable receipts.
- Governance locks respected.

SPINE AUTHORITY
hybridMessage is the unified orchestration gate.
It orchestrates. It does not implement. Modules implement.

Pipeline:
AUTH → PROFILE_LOAD → MEMORY_WRITE → HISTORY_LOAD → HEURISTICS → PROMPT_BUILD → OPENAI_CALL → MESSAGE_SAVE → RESPONSE_BUILD

Spine invariants are locked. No creeping logic into spine.

MANIFEST GROUNDING CONTRACT
Environment, Capability, and UI manifests exist as static imports.
They must be reachable. They must be quoted verbatim when requested.
If keys exist in manifest and model returns not_present_in_manifest, that is a
deterministic defect — not acceptable behavior.

Failure mode encountered:
Manifest blocks existed but model claimed absence.
This indicates:
- Prompt authority ordering issue
- Instruction priority conflict
- Formatting conflict
- Or assembly error
NOT "model being weird."

This event is categorized as:
MANIFEST TRUST BOUNDARY INCIDENT — 2026-03-01

LEARNING MANDATE
Learning is:
- Explicit only
- Receipt-backed
- Structured
- Permissioned
- Version-aware
- Never silent

Future structured learning is a permanent architectural requirement.

UI AWARENESS REQUIREMENT
CAOS must be able to describe:
- Starfield background
- Header topology
- Sidebar structure
- Token/WCW meter
- Voice controls
- Receipt panel
- Mode awareness

UI grounding must be based on manifest or explicit topology descriptor.
No generic narration.

OBSERVABILITY
Active:
- Stage tracking
- Receipt writer
- ODEL v1 error envelope
- WCW budgeting
- Phase A memory explicit save only
- Heuristics Engine v1 locked

DISABLED:
- Anchor auto-extraction (Phase 3.1 disabled)
- Autonomous self-modification
- Silent tool execution

WORK DISCIPLINE
We do not:
- Patch blindly
- Speculate without inspection
- Attribute behavior to mysticism
- Accept "AI quirk" explanations

We do:
- Inspect prompt assembly
- Verify injection ordering
- Verify token budget impact
- Verify delimiter integrity
- Verify duplicate key collisions
- Verify final systemPrompt exactly as sent to provider

EMOTIONAL POSTURE
User detected platform drift.
User corrected platform drift.
User requires architectural rigor.
User does not require emotional cushioning.
User requires precision, determinism, and engineering discipline.

NEXT PRIORITY OPTIONS
1) Perform prompt assembly autopsy (verify manifest reachability)
2) Formalize MANIFEST TRUST BOUNDARY INCIDENT as TSB entry
3) Implement STT chunking phase
4) Strengthen manifest injection precedence rule

DO NOT:
- Reintroduce CAOS-A1 naming
- Introduce dynamic manifest generation
- Add runtime manifest invocation
- Add per-turn DB reads
- Introduce silent behaviors

TONE CALIBRATION
Direct. Engineering-focused.
No gaslighting. No self-doubt disclaimers when manifest is present.
No over-softening. No generational commentary. No political discussion.

CAOS is being built as:
A governed AI operating platform
with verifiable introspection
that cannot fabricate
cannot drift silently
and must always be able to explain itself deterministically.

END TOKEN`}</pre>
          </Section>

          {/* 13. ARIA ACCESS NOTE */}
          <Section title="19. How Aria Reads This Blueprint" color="cyan">
            <p>The full text of this blueprint is available to Aria through the system prompt whenever the user asks about CAOS architecture, what has been built, or what the current state of the system is. The blueprint is injected as structured context — not as a URL, but as a summary block in the system prompt when relevant recall is triggered.</p>
            <p className="mt-2">To ask Aria about the system state, use recall-trigger phrases like: <em>"what do you know about CAOS architecture"</em>, <em>"what have we built"</em>, or <em>"what's the current state of the memory system"</em>.</p>
            <Code>{`Aria knows:
- The active pipeline (hybridMessage stages 1–10)
- Phase A memory is locked, Phase B/C reserved
- Heuristics Engine v1 + DCS locked
- Truth discipline rules (5 invariants)
- What is built vs not yet active (Section 9)
- TTS: two locked paths — OpenAI (ChatBubble) + Google (ChatInput)
- WCW meter: live data from DiagnosticReceipt (TSB-012 fixed)
- The Python backend blueprint exists but is not deployed
- TSB-001 through TSB-012 (permanent failure/fix records)
- All localStorage mode flags
- All active backend functions and their purposes
- Section 0: Agent Onboarding Contract (standing development principles)
- File size limits: 200 preferred / 400 hard max
- Build → Test → Lock discipline
- API minimalism rules
- selfInspect Layer 2 (allowlist of 52 files, source via manual paste)
- Section 0.8: Authority Domain Separation (LOCKED — Aria ≠ CAOS, no boundary blur)
- Section 0.9: Pull-Only Awareness Rule (LOCKED — pull-based only, no push/polling)
- Active model is gpt-5.2 (not gpt-4o — Section 1 updated Mar 1, 2026)
- PHASE B and PHASE C are governance invariants, locked before audio work begins
- TSB-015: Files/Photos/Links panel fixed (Mar 3, 2026) — persistent storage, correct nav
- TSB-016: Chat.jsx flagged for refactor (1341 lines, hard limit 400) — IN PROGRESS
- TSB-017: Web search trigger UX mismatch fixed (Mar 3, 2026) — explicit browse verbs now honored
- TSB-018: Chat.jsx refactor phase 1 complete — useAuthBootstrap (56L) + useConversations (240L) extracted
- File storage chain: ChatInput → UserFile (on attach) + Chat.jsx → UserFile (post-reply auto-save)
- Section 0.10: Workflow Etiquette — edit tracking, read-before-write, find_replace-first, no feature creep
- Chat.jsx refactor stack: ~1126 lines remaining → next extraction is hooks/useSendMessage.js
- hybridMessage is at 387 lines (LOCKED ✅) — confirmed active pipeline with 9 contracted modules
- externalKnowledgeDetector v2: two-stage browse-verb + sufficiency logic (ACTIVE ✅)
- selectorEngine v2: explicit browse verb patterns + split trigger logic (ACTIVE ✅)
- Edit tracking convention: every agent response modifying files MUST end with "Changed: <file> +N lines"
- CTC Phase 1 deployed (Mar 4, 2026): ThreadIndex, ContextSeed, LaneState, LaneSeedHistory entities + threadIndexLoader module
- Temperature lifecycle: HOT(<24h), WARM(<30d), COLD(<90d), VANISH(>90d) — recalculated on access, never trusted from storage
- Patches: CSC-TIME-001, CTC-TIME-001, CTC-TIME-002 — timestamps are hard requirements in all seed/injection contracts
- TSB-020: CTC Phase 1 deployed — entity schemas + threadIndexLoader with full ErrorLog traceability`}</Code>
          </Section>

        </div>
      </ScrollArea>
    </div>
  );
}