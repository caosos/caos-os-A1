import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
  - functions/hybridMessage          (FROZEN — 669 lines, over limit — TSB-021)
  - functions/textToSpeech           (LOCKED — tts-1-hd — TSB-011)
  - functions/transcribeAudio        (LOCKED)
  - functions/threadRehydrate        (LOCKED — TRH v1 — TSB-029)
  - functions/getThreadSnippets      (LOCKED — MBCR v1 READ-ONLY — TSB-028)
  - components/chat/ChatBubble       (TTS path ONLY — handleReadAloud, audioRef, globalAudioInstance)
  - components/chat/VoiceSettings    (LOCKED)
  - components/chat/ChatInputReadAloud (LOCKED)
  - functions/core/memoryEngine      (exists, not called from spine)
  - functions/core/heuristicsEngine  (exists, not called from spine)
  - functions/core/receiptWriter     (LOCKED)
  - functions/core/errorEnvelopeWriter (LOCKED)

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
            <p className="text-gray-400 text-xs mt-1">Last Updated: Mar 8, 2026 · ODEL v1: PHASE 1.4 COMPLETE ✅ · RSoD: ACTIVE ✅ (TSB-024) · errorClassifier: DEPLOYED ✅ · Phase A Memory: LOCKED ✅ · Heuristics Engine v1: LOCKED ✅ · TTS (OpenAI + Google): LOCKED ✅ · WCW Meter: FIXED ✅ · Runtime Authority: CENTRALIZED ✅ · Web Search: IMPLEMENTED ✅ · Active Model: gpt-5.2 (200K) ✅ · Chat.jsx Refactor: IN PROGRESS 🔧 (~1126 lines remaining) · CTC Phase 1–3: WIRED ✅ · PR1 COMPLETE ✅ (TSB-025) · PR2 COMPLETE ✅ (TSB-027/TSB-028) — ChatBubble ≤400 lines, all bubble/ sub-components extracted · MBCR v1 DEPLOYED ✅ (TSB-028) — same-thread tag+text snippet recovery, inlined in hybridMessage, getThreadSnippets function live · TRH v1 DEPLOYED ✅ (TSB-029) — Thread Rehydration Worker, 2-stage LLM summarization, THREAD_SUMMARY injected into finalMessages + saved to Message entity · metadata_tags ACTIVE ✅ — every Message written by hybridMessage now auto-tagged via extractMetadataTags() · hybridMessage: 669 lines ⚠️ OVER LIMIT — FROZEN (TSB-021 open, now further grown with MBCR inline block)</p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <Tag label="Agent Onboarding Contract: Section 0" color="red" />
              <Tag label="hybridMessage: LOCKED" color="green" />
              <Tag label="Phase A Memory: LOCKED" color="green" />
              <Tag label="Heuristics Engine v1: LOCKED" color="green" />
              <Tag label="OpenAI TTS: LOCKED" color="green" />
              <Tag label="Google Web Speech TTS: LOCKED" color="green" />
              <Tag label="WCW Meter: LIVE DATA" color="green" />
              <Tag label="CTC Memory System: LIVE ✅" color="green" />
              <Tag label="MBCR v1: DEPLOYED ✅" color="green" />
              <Tag label="TRH v1: DEPLOYED ✅" color="green" />
              <Tag label="PR2 COMPLETE ✅" color="green" />
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

  CONFIRMED STACK STATE (as of Mar 8, 2026):
  pages/Chat.jsx              ~1126 lines   REFACTOR IN PROGRESS
   └─ hooks/useAuthBootstrap   55 lines    EXTRACTED ✅
   └─ hooks/useConversations  244 lines    EXTRACTED ✅
  components/chat/ChatBubble.jsx           FULLY REFACTORED ✅ (PR1+PR2 — Mar 7-8, 2026 — TSB-025/027/028)
   └─ bubble/FunctionDisplay.jsx  130 lines  EXTRACTED ✅ (PR1)
   └─ bubble/MarkdownMessage.jsx   82 lines  EXTRACTED ✅ (PR1)
   └─ bubble/Attachments.jsx               EXTRACTED ✅ (PR1)
   └─ bubble/GeneratedFiles.jsx            EXTRACTED ✅ (PR1)
   └─ bubble/Reactions.jsx                 EXTRACTED ✅ (PR1)
   └─ bubble/Replies.jsx                   EXTRACTED ✅ (PR1)
   └─ bubble/ReceiptPanel.jsx              EXTRACTED ✅ (PR1)
   └─ bubble/VideoEmbeds.jsx               EXTRACTED ✅ (PR1)
   └─ bubble/MessageHelpers.js             EXTRACTED ✅ (PR1 — pure utility, no React)
   └─ bubble/MessageContent.jsx            EXTRACTED ✅ (PR2-A — verbatim renderContent())
   └─ bubble/RecallResults.jsx             EXTRACTED ✅ (PR2-A — recall results block)
   └─ bubble/useTextSelectionMenu.js       EXTRACTED ✅ (PR2-A — selection menu state+effects)
   └─ bubble/useInlineReactions.js         EXTRACTED ✅ (PR2-A — local-only react/reply handlers)
   └─ bubble/MessageHeader.jsx             EXTRACTED ✅ (PR2-A — user/CAOS label + message ID copy)
   └─ bubble/MessageMetaRow.jsx            EXTRACTED ✅ (PR2-A — timestamp/latency row)
   └─ bubble/MessageMetadataContent.jsx    EXTRACTED ✅ (PR2-A — toolCalls + reactions + replies)
   └─ bubble/CopyButton.jsx                EXTRACTED ✅ (PR2-A — copy icon button)
   └─ bubble/EmailButton.jsx               EXTRACTED ✅ (PR2-A — email icon button)
   └─ bubble/messageUtils.js               EXTRACTED ✅ (PR2-A — formatDateTime, downloadFile, formatTime)
   └─ ChatBubble.jsx (parent) ~536 lines   TTS path fully preserved and locked ✅
  components/lib/errorClassifier.jsx       DEPLOYED ✅ (TSB-024 — note: .jsx not .js)
  components/chat/RedScreenOfDeath.jsx     DEPLOYED ✅ (~119 lines, TSB-024)
  functions/hybridMessage      669 lines   ⚠️ OVER LIMIT — FROZEN (TSB-021 open)
   ── INLINED PURE FUNCTIONS (no network — correct per platform constraint §16.1):
   └─ detectSaveIntent / detectRecallIntent (inlined from memoryEngine)
   └─ classifyIntent / detectCogLevel / calibrateDepth / buildDirective (inlined from heuristicsEngine)
   └─ compressHistory / openAICall / shouldRunCTC (inlined pure logic)
   └─ MBCR module — extractMetadataTags / _mbcrTriggerCheck / _buildThreadRecoveryBlock /
                     maybeBuildMbcrInjectedMessage (INLINED, LOCK_SIGNATURE: CAOS_MBCR_INJECTION_v1_2026-03-08)
   ── EXTERNAL INVOCATIONS (fire-and-forget or gated):
   └─ core/promptBuilder       (AWAITED — builds system prompt, TSB-023)
   └─ core/receiptWriter       (fire-and-forget — ⚠️ TSB-021: I2 invariant violated)
   └─ core/errorEnvelopeWriter (awaited — ODEL v1 error persistence)
   └─ context/crossThreadIntent / threadHydrator / arcAssembler (CTC — gated, non-fatal)
   └─ threadRehydrate          (TRH v1 — awaited with 8s Promise.race timeout, non-fatal)
   └─ getThreadSnippets        (MBCR v1 — same-thread snippet retrieval, non-fatal)
   └─ autoTitleThread          (fire-and-forget)
  NEW FUNCTIONS (deployed Mar 8, 2026):
   └─ functions/threadRehydrate     (TRH v1 — 2-stage: freshness check → LLM summarize)
   └─ functions/getThreadSnippets   (MBCR v1 — tag+text snippet retrieval, no LLM, READ-ONLY)
  STANDALONE MODULES (exist, invokable, NOT called from spine):
   └─ core/memoryEngine        (full save/recall — logic duplicated inline in spine)
   └─ core/heuristicsEngine    (full intent/DCS — logic duplicated inline in spine)
   └─ core/runtimeAuthority    (RUNTIME_AUTHORITY object — single source of truth)
   └─ core/selfDescribe / core/webSearch / core/externalKnowledgeDetector v2 / core/selectorEngine v2
   └─ core/environmentLoader
   GOVERNANCE GATES (designed Mar 5, 2026 — dashboard-only enforcement path):
    └─ GATE-0: LOCK_MANIFEST.json — single source of truth (design complete)
    └─ GATE-1: Lock enforcement — no edits to locked files without UNLOCK token
    └─ GATE-2: Line limit enforcement — block any non-exempt file >400 lines
    └─ hybridMessage refactor FROZEN until explicit scoped plan + owner approval
   MBCR v1 — DEPLOYED ✅ (Mar 8, 2026):
    Message-Based Campaign Recovery — same-thread tag+text snippet injection
    └─ Trigger: regex match on PR2/PR3/locked/receipts/continue/status keywords in input
    └─ Flow: _mbcrTriggerCheck → getThreadSnippets → _buildThreadRecoveryBlock → inject as system message
    └─ Max injection: 6000 chars, 20 snippets, ±2 neighbor expansion around each match
    └─ Tag writes: every saved Message gets metadata_tags[] via extractMetadataTags()
    └─ Tags: PR2, PR3, LOCKED, UNLOCK, ACCEPTANCE, RECEIPTS, EXECUTE_STEP_2, STOP_AFTER_RECEIPTS,
             APPROVED_SCOPE, WAITING_FOR_APPROVAL, THREAD_SUMMARY
    └─ Injection block: role=system, prepended to conversationHistory in finalMessages
    └─ Non-fatal: getThreadSnippets failure → pipeline continues without MBCR context
    └─ Dev diagnostic header in reply when debugMode=true
   TRH v1 — DEPLOYED ✅ (Mar 8, 2026):
    Thread Rehydration — 2-stage LLM summarization for campaign thread continuity
    └─ Gate: TRH_TRIGGER regex in hybridMessage (pr2/pr3/continue/where are we/status/locked/etc.)
    └─ Stage 1 (deterministic): fetch last 80 messages, check freshness anti-spam
      Anti-spam: skip if THREAD_SUMMARY exists within last 10 messages AND last 10 minutes
      Override: user says "refresh" / "rehydrate" / "update summary" → forces Stage 2
    └─ Stage 2 (LLM): fetch up to 1000 messages, summarize via ACTIVE_MODEL (gpt-5.2)
      Output: structured THREAD SUMMARY block (Campaign State, Lock Table, TODOs,
              Last Accepted Plan, Next Step, Open Questions)
      Max: 1200 completion tokens, 8000 char input cap, 6000 char output cap
    └─ Summary saved to Message entity: metadata_tags=['THREAD_SUMMARY'], role='assistant'
    └─ Summary injected into finalMessages as: role='assistant', immediately after system prompt
    └─ Hard timeout: 8000ms Promise.race in hybridMessage (fail-closed — pipeline continues)
    └─ Non-fatal: any TRH failure → pipeline continues without summary
   CTC MEMORY SYSTEM — LIVE ✅ (Mar 4, 2026)
   └─ context/threadIndexLoader    (load ThreadIndex — temperature recalc on access)
   └─ context/crossThreadIntent    (detect explicit/topic/time cross-thread references)
   └─ context/threadHydrator       (load ContextSeed → update last_hydrated_at)
   └─ context/sanitizer            (filter conversational noise from message spans)
   └─ context/seedCompressor       (compress raw spans → ARC pack → ContextSeed entity)
   └─ context/arcAssembler         (assemble ARC_PACK block — 2000 token budget)
  ENTITIES:
   └─ ThreadIndex     (thread registry — temperature, last_active_at, summary_seed_id)
   └─ ContextSeed     (compressed ARC pack — span_hash, arc_pack_json, token metrics)
   └─ LaneState       (lane-level pinned state + active seed IDs)
   └─ LaneSeedHistory (ordered seed creation history per lane)`}</Code>

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
            <Code>{"Conversation  — thread metadata (title, last_message_time, summary, keywords)\nMessage       — messages (conversation_id, role, content, file_urls, timestamp, metadata_tags[])\n                metadata_tags field ACTIVE ✅ — written on every save via extractMetadataTags()\n                Tags: PR2, PR3, LOCKED, UNLOCK, ACCEPTANCE, RECEIPTS, THREAD_SUMMARY, etc.\nUserProfile   — persistent user data:\n  tone, project, memory_anchors (legacy), structured_memory (Phase A ACTIVE)\nUserFile      — files/photos/links (name, url, type, folder_path, size, mime_type)\nUserStorage   — user file storage box (user_email, file_name, mime_type, sha256, base44_file_id)"}</Code>

            <h4 className="text-white font-semibold mt-3">CTC Memory System (ACTIVE ✅ — Mar 4, 2026):</h4>
            <Code>{"ThreadIndex     — thread registry (thread_id, lane_id, user_email, title, tags,\n                  last_active_at, last_seed_created_at, temperature, summary_seed_id)\nContextSeed     — compressed ARC pack (seed_id, lane_id, thread_id, user_email,\n                  created_at, last_hydrated_at, source_span {from_ts, to_ts, message_ids,\n                  span_hash, msg_count}, arc_pack_json {definitions, decisions, constraints,\n                  action_items, references}, arc_pack_hash, approx_tokens_in/out,\n                  token_reduction_ratio, compressor_version, topics, importance_score)\nLaneState       — lane-level pinned state + active_seed_ids, last_active_at\nLaneSeedHistory — ordered seed history per lane (lane_id, seed_id, created_at, temperature)"}</Code>

            <h4 className="text-white font-semibold mt-3">Governance / Advanced (built, partially used):</h4>
            <Code>{"Anchor, Record, SessionContext, Lane, LexicalRule, SessionManifest\nDriftEvent, RetrievalReceipt, ThreadToken/Meta\nErrorLog (ACTIVE), ConfigChangeLog"}</Code>
          </Section>

          {/* 6. FRONTEND STRUCTURE */}
          <Section title="6. Frontend Structure — Pages & Components" color="orange">
            <h4 className="text-white font-semibold">Pages:</h4>
            <Code>{"Welcome - auth gate (Google sign-in, email, guest mode)\nChat - main interface (all chat logic lives here)\nAdmin - admin dashboard (errors, stats, pipeline visualizer)\nConsole - SSH/terminal console view\nImplementation - CAOS-A1 Python backend blueprint v1 (FastAPI + SQLite)\nMemoryIsolation - memory isolation architecture docs\nSystemBlueprint - THIS FILE — System Blueprint v2\nNews - news feed page"}</Code>

            <h4 className="text-white font-semibold mt-3">Key Components:</h4>
            <Code>{`ChatBubble (parent — TTS path LOCKED — all other sections PR2-complete ✅)
            └─ bubble/FunctionDisplay.jsx     — tool call lifecycle display (130 lines) [PR1]
            └─ bubble/MarkdownMessage.jsx     — ReactMarkdown with all custom overrides (82 lines) [PR1]
            └─ bubble/Attachments.jsx         — file attachment list (image preview + download) [PR1]
            └─ bubble/GeneratedFiles.jsx      — AI-generated file display [PR1]
            └─ bubble/Reactions.jsx           — emoji reaction badge renderer [PR1]
            └─ bubble/Replies.jsx             — inline reply thread (selected_text → ai_response) [PR1]
            └─ bubble/ReceiptPanel.jsx        — ExecutionReceipt conditional display [PR1]
            └─ bubble/VideoEmbeds.jsx         — YouTube/Vimeo embed renderers [PR1]
            └─ bubble/MessageHelpers.js       — pure URL/metadata utility (no React) [PR1]
            └─ bubble/MessageContent.jsx      — verbatim renderContent() extraction [PR2-A]
            └─ bubble/RecallResults.jsx       — recall results block [PR2-A]
            └─ bubble/useTextSelectionMenu.js — selection menu state+effects+handler [PR2-A]
            └─ bubble/useInlineReactions.js   — local-only react/reply handlers (no external fetch) [PR2-A]
            └─ bubble/MessageHeader.jsx       — user/CAOS label + message ID copy button [PR2-A]
            └─ bubble/MessageMetaRow.jsx      — timestamp/latency row [PR2-A]
            └─ bubble/MessageMetadataContent.jsx — toolCalls + reactions + replies wrapper [PR2-A]
            └─ bubble/CopyButton.jsx          — copy icon button [PR2-A]
            └─ bubble/EmailButton.jsx         — email icon button [PR2-A]
            └─ bubble/messageUtils.js         — formatDateTime, downloadFile, formatTime [PR2-A]
            ChatHeader, ChatInput, ThreadList, ProfilePanel, TokenMeter,
            ConversationSearch, StarfieldBackground, WelcomeGreeting,
            ExecutionReceipt, LatencyIndicator, ContinuityToken, QuickActionBar
            RedScreenOfDeath   — blocking error modal (TSB-024, ~119 lines)
            components/lib/errorClassifier.jsx — pure error classifier (no React, TSB-024/TSB-026)

            components/game: GameView
            components/terminal: CodeTerminal
            components/mobile: BottomNavBar
            components/admin: StatsViewer, RecentErrors, PipelineVisualizer, WCWMonitor, SystemHealth`}</Code>

            <h4 className="text-white font-semibold mt-3">Modes (localStorage flags):</h4>
            <Code>{"caos_developer_mode, caos_game_mode, caos_multi_agent_mode, caos_guest_user\ncaos_last_conversation, caos_current_lane, caos_voice_preference_message\ncaos_speech_rate, caos_google_voice, caos_google_speech_rate"}</Code>
          </Section>

          {/* 7. BACKEND FUNCTIONS */}
          <Section title="7. Backend Functions (Active)" color="green">
            <Code>{"MAIN: hybridMessage (LOCKED — spine, 669 lines ⚠️ FROZEN)\nVOICE: textToSpeech (LOCKED), transcribeAudio, googleTextToSpeech (LOCKED)\nRUNTIME: runtimeAuthority (centralized source of truth), systemSnapshot\nWEB: webSearch (Bing API), externalKnowledgeDetector, artifactLoader\nDIAGNOSTICS: systemHealth, diagnosticSnapshot, inspectPipeline, quickInspect\nMEMORY: testAnchors, extractUserPreference, pinMemory\nCORE MODULES: contextBuilder, contextLoader, laneIsolation, memoryUpdate,\n  selectorEngine, tieredRecall, toolExecutor, wcwBudget + more\n\nTRH v1 (NEW — Mar 8, 2026 — LIVE ✅):\n  threadRehydrate  — 2-stage: freshness check → LLM summarize (gpt-5.2)\n                     Output: THREAD SUMMARY block saved to Message + injected into finalMessages\n\nMBCR v1 (NEW — Mar 8, 2026 — LIVE ✅):\n  getThreadSnippets — READ-ONLY, no LLM, tag+text match, ±2 neighbor expansion\n                      Used by hybridMessage MBCR inline module for same-thread recovery\n\nCTC MEMORY SYSTEM (LIVE ✅):\n  context/threadIndexLoader  — load ThreadIndex, recalc temperature on access\n  context/crossThreadIntent  — detect cross-thread references in user input\n  context/threadHydrator     — load ContextSeed records, update last_hydrated_at\n  context/sanitizer          — filter filler from message spans (STRICT/STANDARD)\n  context/seedCompressor     — compress raw message spans → ARC pack → ContextSeed\n  context/arcAssembler       — assemble ARC_PACK injection block (2000 token budget)"}</Code>
          </Section>

          {/* 8. TRUTH DISCIPLINE */}
          <Section title="8. Aria Truth Discipline (Active Rules)" color="red">
            <p>These rules are injected into Aria's system prompt on every request:</p>
            <Code>{"1. PRIOR-MENTION CLAIMS: Never say 'you mentioned' unless fact is in STRUCTURED MEMORY.\n2. NEW INFORMATION RULE: If user introduces a fact now, treat it as new.\n3. PREFERENCE CLAIMS: Never assert 'you like X' unless in structured_memory.\n4. NO FABRICATION: If a fact isn't stored, say 'I don't have that stored.'\n5. SOURCE LABELING: Label source: (from memory) | (from this conversation) | (inferred)"}</Code>
          </Section>

          {/* 9. WHAT IS NOT YET ACTIVE */}
          <Section title="9. Built But Not Yet Active" color="yellow">
            <Code>{"Lane-based context isolation - not wired into hybridMessage\nPlane B (Record entity) - schema built, not primary store\nAnchor hash-chain - schema built, not active\nThreadSnapshot / rotation - built, not triggered\nLexicalRule normalization - built, not applied\nDrift detection (DriftEvent) - built, not active\nSessionManifest capability gate - built, not enforced\nMulti-agent blackboard - UI placeholder only\nCAOS-A1 Python backend - blueprinted, not deployed\n\nCTC — SEEDING NOT YET TRIGGERED:\n  seedCompressor exists and is wired — but ContextSeed records must be created\n  before cross-thread recall can actually surface anything. First seeds are\n  created by calling context/seedCompressor directly with a message span.\n  No UI yet to trigger compression from the Chat interface.\n\nLEGACY / ORPHANED:\npinMemory - superseded by Phase A structured_memory. Dead function."}</Code>
          </Section>

          {/* 10. KNOWN ISSUES */}
          <Section title="10. Known Issues and Candidate Next Work" color="blue">
            <Code>{`KNOWN (as of Mar 8, 2026):
- Memory save strips 'that' from 'remember that...' (acceptable)
- Legacy memory_anchors still injected as INFERRED context
- pages/Chat.jsx is ~1126 lines — FLAGGED FOR REFACTOR (in progress)
- No ContextSeed records yet — CTC system is wired but not seeded
- hybridMessage is NOW 669 lines — OVER 400-LINE HARD LIMIT — FROZEN (see TSB-021)
  (grown further with MBCR inline block — Mar 8, 2026)
- receiptWriter called fire-and-forget — I2 invariant (must be awaited) now violated (TSB-021)
- core/memoryEngine and core/heuristicsEngine logic is DUPLICATED inline in spine — modules exist
  but are not called from hybridMessage. Refactor plan must resolve canonical source.
- Governance gates (LOCK_MANIFEST + CI enforcement) designed but NOT yet enforced mechanically
- TRH v1 in production but LLM model name 'gpt-5.2' used in threadRehydrate — verify
  this matches the active model naming convention (same as hybridMessage ACTIVE_MODEL)

FILE STORAGE (confirmed Mar 3, 2026):
- ChatInput uploads → UserFile on attach
- Chat.jsx saveToUserFiles() after AI reply
- Chat.jsx extractAndSaveExplicitResources() — sanitized: only markdown links + bare URL lines saved
  (NOT prose-embedded URLs — Mar 8, 2026 refinement to avoid false positives)

CANDIDATE NEXT:
- hybridMessage refactor — extract inlined MBCR + memory + heuristics logic back to modules
  (TSB required before touching — it is FROZEN)
- Phase 4 (CTC): ARC Inspector UI in developer mode
  → browse ContextSeed records, view injection metadata, trigger compression
- Refactor Chat.jsx (still needed — ~1126 lines remaining)
- useSendMessage hook extraction from Chat.jsx
- Implement LOCK_MANIFEST + governance gate enforcement (dashboard-only path)
- Phase B typed schema for structured_memory
- TRH v1 acceptance test: verify THREAD_SUMMARY messages appear in DB after trigger`}</Code>
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

          {/* TSB — Troubleshooting Bulletins — Now on separate page */}
          <Section title="14. TSB Log — Troubleshooting Bulletins" color="red">
            <p className="text-gray-300 text-xs mb-4">All TSB entries have been moved to a dedicated page for clarity and maintainability.</p>
            <Link to={createPageUrl('TSBLog')} className="inline-block text-blue-300 hover:text-blue-100 underline font-semibold">
              → View Full TSB Log (TSB-001 through TSB-031)
            </Link>
            <p className="text-white/40 text-xs mt-3">TSB entries are permanent records documenting every significant issue, failure, and fix in CAOS development.</p>
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

1.4 Remove UI Generic Masking (COMPLETE ✅ — Mar 6, 2026 — TSB-024)
     — errorClassifier.js: pure utility, classifies errors as blocking or non-blocking
     — RedScreenOfDeath.jsx: full-screen blocking modal for 5xx/network failures
     — Blocking errors → RSoD with retry/dismiss. Non-blocking → inline failed bubble.
     — lastSendRef in Chat.jsx stores last send params for one-click retry from RSoD
     — Payload never serialized in diagnostics output (telemetry safety invariant enforced)

 EXIT CONDITION:
   Forced failure → structured envelope → visible in ErrorLog → queryable by error_id
   PHASE 1.1 ✅ | 1.2 ✅ | 1.3 PENDING (Admin Console) | 1.4 ✅`}</Code>
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
                  <span className="text-green-300 font-bold text-sm">PHASE 3 — CTC Memory System (Cross-Thread Context)</span>
                  <Tag label="WIRED ✅" color="green" />
                </div>
                <p className="text-gray-300 text-xs mb-2"><strong>Goal:</strong> Aria recalls structured context from past threads via idempotent compressed seeds. No re-reading raw history. No compression drift.</p>
                <Code>{`3.1 Anchor auto-extraction DISABLED ✅ (Phase 3.1 lock active in hybridMessage)
3.2 Entities deployed ✅ — ThreadIndex, ContextSeed, LaneState, LaneSeedHistory
3.3 Phase 1 modules ✅ — threadIndexLoader (temperature recalc on access)
3.4 Phase 2 modules ✅ — crossThreadIntent, threadHydrator, sanitizer
3.5 Phase 3 modules WIRED ✅ — seedCompressor + arcAssembler + hybridMessage CTC stages LIVE
    ARC_PACK injected into system prompt between identity and memory recall blocks.
    Anti-drift: seedCompressor only accepts raw Message records (physical enforcement).
    Idempotency: span_hash = SHA256(message_ids+timestamps) — no duplicate seeds per span.
    Token audit: approx_tokens_in/out, token_reduction_ratio, compressor_version on every seed.
    Receipt: every hybridMessage response includes ctc_injected, ctc_seed_ids, ctc_injection_meta.

PENDING — SEEDS NOT YET CREATED:
  No ContextSeed records exist yet. First seed created by calling:
    context/seedCompressor with { messages: [...], thread_id, lane_id, user_email }
  Phase 4 (UI): ARC Inspector panel in developer mode to browse seeds + trigger compression.`}</Code>
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
AUTH → PROFILE_LOAD → MEMORY_WRITE → HISTORY_PREP → CTC_INTENT → CTC_HYDRATE → ARC_ASSEMBLE → HEURISTICS → OPENAI_CALL → MESSAGE_SAVE → RESPONSE_BUILD

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
- The active pipeline (hybridMessage stages 1–13, including TRH v1 + MBCR v1)
- Phase A memory is locked, Phase B/C reserved
- Heuristics Engine v1 + DCS locked
- Truth discipline rules (5 invariants)
- What is built vs not yet active (Section 9)
- TTS: two locked paths — OpenAI (ChatBubble) + Google (ChatInput)
- WCW meter: live data from DiagnosticReceipt (TSB-012 fixed)
- The Python backend blueprint exists but is not deployed
- TSB-001 through TSB-031 (permanent failure/fix records — full log on TSBLog page)
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
- TSB-019: JSX multi-line string literal crash fixed (Mar 4, 2026) — backtick rule enforced
- TSB-023: Capability declaration moved to promptBuilder (Mar 5, 2026) — all tools ON by default, no bootloader needed for new sessions
- TSB-024 (Mar 6, 2026): RSoD + errorClassifier deployed — PHASE 1.4 COMPLETE. Blocking errors (5xx/network) trigger full-screen modal. Non-blocking → inline failed bubble. lastSendRef enables one-click retry. Telemetry safety: no payload in diagnostics.
- components/lib/errorClassifier.js: pure error classification utility (NEW — Mar 6, 2026)
- components/chat/RedScreenOfDeath.jsx: blocking error modal (NEW — Mar 6, 2026)
- File storage chain: ChatInput → UserFile (on attach) + Chat.jsx → UserFile (post-reply auto-save)
- Section 0.10: Workflow Etiquette — edit tracking, read-before-write, find_replace-first, no feature creep
- Chat.jsx refactor stack: ~1126 lines remaining → next extraction is hooks/useSendMessage.js
- hybridMessage is now 669 lines (⚠️ OVER LIMIT — frozen, refactor pending TSB-021 — further grown with MBCR Mar 8)
- externalKnowledgeDetector v2: two-stage browse-verb + sufficiency logic (ACTIVE ✅)
- selectorEngine v2: explicit browse verb patterns + split trigger logic (ACTIVE ✅)
- Edit tracking convention: every agent response modifying files MUST end with "Changed: <file> +N lines"
- CTC Phase 1 deployed (Mar 4, 2026): ThreadIndex, ContextSeed, LaneState, LaneSeedHistory entities + threadIndexLoader module
- Temperature lifecycle: HOT(<24h), WARM(<30d), COLD(<90d), VANISH(>90d) — recalculated on access, never trusted from storage
- Patches: CSC-TIME-001, CTC-TIME-001, CTC-TIME-002 — timestamps are hard requirements in all seed/injection contracts
- TSB-020: CTC Phase 1 deployed — entity schemas + threadIndexLoader with full ErrorLog traceability
- CTC Phase 2 deployed (Mar 4, 2026): crossThreadIntent + threadHydrator + sanitizer modules
- CTC Phase 3 WIRED (Mar 4, 2026): seedCompressor + arcAssembler deployed, hybridMessage CTC stages LIVE
- hybridMessage CTC pipeline: CTC_INTENT → CTC_HYDRATE → ARC_ASSEMBLE (non-fatal, post-history, pre-heuristics)
- ARC_PACK injection: between identity/truth-discipline and RECALLED MEMORY blocks in system prompt
- seedCompressor anti-drift rule: physical signature only accepts raw Message records, not prior seeds
- span_hash idempotency: SHA256(message_ids+timestamps) — duplicate spans return existing seed, no new write
- Truth discipline updated: ARC_PACK entries are "verified facts from past threads" — Aria may reference directly
- No ContextSeed records yet — first seed requires explicit call to context/seedCompressor with a message span
- Phase 4 (CTC): ARC Inspector UI — browse seeds, view injection metadata, trigger compression from developer mode
- TSB-021 (Mar 5, 2026): hybridMessage bloat — 538 lines, logic inlined, I2 violated, receiptWriter fire-and-forget
- Governance gates designed (Mar 5, 2026): LOCK_MANIFEST + GATE-0/1/2 — dashboard-only enforcement path
- Biological Reality Policy added to core/promptBuilder (Mar 5, 2026) — name-only pronouns for biological sex queries
- runtimeAuthority.js confirmed as single source of truth: model_name=gpt-5.2, token_limit=200000, hosting=Base44
- PR1 COMPLETE (Mar 7, 2026 — TSB-025): ChatBubble refactored into modular bubble/ sub-components. TTS path preserved and untouched. FunctionDisplay (130L), MarkdownMessage (82L), Attachments, GeneratedFiles, Reactions, Replies, ReceiptPanel, VideoEmbeds, MessageHelpers extracted.
- LOCK CLARIFICATION (TSB-025): ChatBubble LOCK applies ONLY to TTS path (handleReadAloud, audioRef, globalAudioInstance, audio player bar UI). Non-TTS sections of ChatBubble are open for modification via PRs with TSB documentation.
- TSB-026 (Mar 7, 2026): errorClassifier filename is .jsx not .js. BLOCKING_CODES set covers HTTP-200 structured errors only. NETWORK_ERROR and 5xx handled by independent branches. Documentation-only fix.
- PR2 COMPLETE (Mar 7-8, 2026 — TSB-027/028): ChatBubble.jsx fully modularized. All rendering extracted into bubble/ sub-components (PR2-A). External fetch calls to hardcoded dev server removed. Local-only reactions/replies via useInlineReactions. Parent ChatBubble retained TTS path untouched.
- bubble/ sub-components added in PR2-A: MessageContent, RecallResults, useTextSelectionMenu, useInlineReactions, MessageHeader, MessageMetaRow, MessageMetadataContent, CopyButton, EmailButton, messageUtils
- useAuthBootstrap confirmed 55 lines (not 56 as TSB-017 stated — minor delta)
- useConversations confirmed 244 lines (not 240 as TSB-017 stated — minor delta)
- TSB-028 (Mar 8, 2026): MBCR v1 DEPLOYED — Message-Based Campaign Recovery. extractMetadataTags inlined in hybridMessage. getThreadSnippets new function (READ-ONLY, no LLM). Trigger: PR2/PR3/locked/receipts/continue/status keywords. Injects THREAD RECOVERY EXCERPTS block as system message. metadata_tags written on every Message save.
- TSB-029 (Mar 8, 2026): TRH v1 DEPLOYED — Thread Rehydration Worker. New function: threadRehydrate. 2-stage: (1) deterministic freshness check, (2) LLM summarize up to 1000 messages. Output THREAD SUMMARY injected into finalMessages as assistant message AND saved to Message entity with metadata_tags=['THREAD_SUMMARY']. Hard 8s timeout in hybridMessage. Fail-closed.
- MBCR tag set: PR2, PR3, LOCKED, UNLOCK, ACCEPTANCE, RECEIPTS, EXECUTE_STEP_2, STOP_AFTER_RECEIPTS, APPROVED_SCOPE, WAITING_FOR_APPROVAL
- TRH trigger keywords: pr2, pr3, continue, where are we, status, locked, receipts, refresh, rehydrate, update summary, what's locked/next/open, what did we decide, catch me up
- TRH anti-spam: skip if THREAD_SUMMARY found in last 10 messages AND within last 10 minutes (override: say "refresh" or "rehydrate")
- Chat.jsx link sanitizer updated: extractAndSaveExplicitResources() — only markdown links [text](url) + bare URL lines saved. No prose-embedded links.
- hybridMessage now 669 lines (grown from 538 — MBCR inline block added Mar 8, 2026 — FROZEN)`}</Code>
          </Section>

        </div>
      </ScrollArea>
    </div>
  );
}