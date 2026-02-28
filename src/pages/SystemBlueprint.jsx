import React, { useState } from 'react';
import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const Section = ({ title, color = 'blue', children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const borderColor = {
    blue: 'border-blue-500/30', green: 'border-green-500/30', red: 'border-red-500/30',
    purple: 'border-purple-500/30', yellow: 'border-yellow-500/30', cyan: 'border-cyan-500/30',
    indigo: 'border-indigo-500/30', orange: 'border-orange-500/30'
  }[color];
  const textColor = {
    blue: 'text-blue-300', green: 'text-green-300', red: 'text-red-300',
    purple: 'text-purple-300', yellow: 'text-yellow-300', cyan: 'text-cyan-300',
    indigo: 'text-indigo-300', orange: 'text-orange-300'
  }[color];
  const bgColor = {
    blue: 'bg-blue-950/40', green: 'bg-green-950/40', red: 'bg-red-950/40',
    purple: 'bg-purple-950/40', yellow: 'bg-yellow-950/40', cyan: 'bg-cyan-950/40',
    indigo: 'bg-indigo-950/40', orange: 'bg-orange-950/40'
  }[color];

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
      >
        <h2 className={`text-xl font-bold ${textColor}`}>{title}</h2>
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
      <button
        onClick={() => navigate(createPageUrl('Chat'))}
        className="mb-6 flex items-center gap-2 text-blue-300 hover:text-blue-100 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Chat
      </button>

      <ScrollArea className="h-[calc(100vh-6rem)]">
        <div className="max-w-4xl mx-auto space-y-4 pb-8">

          {/* HEADER */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">CAOS System Blueprint</h1>
            <p className="text-blue-300">Cognitive Adaptive Operating Space — Living Architecture Document</p>
            <p className="text-gray-400 text-xs mt-1">Last Updated: Feb 28, 2026 · ODEL v1: IN PROGRESS 🔧 · Phase A Memory: LOCKED ✅ · Heuristics Engine v1: LOCKED ✅</p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <Tag label="hybridMessage: ACTIVE" color="green" />
              <Tag label="Phase A Memory: LOCKED" color="green" />
              <Tag label="Heuristics Engine v1: LOCKED" color="green" />
              <Tag label="PHASE 1 — Observability: IN PROGRESS" color="yellow" />
              <Tag label="PHASE 2–6: RESERVED" color="purple" />
            </div>
          </div>

          {/* 1. WHAT CAOS IS */}
          <Section title="1. What CAOS Is" color="blue" defaultOpen={true}>
            <p>CAOS (Cognitive Adaptive Operating Space) is a personal AI assistant platform. The AI persona is named <strong className="text-white">Aria</strong>. CAOS is the platform name — Aria never introduces herself as "CAOS".</p>
            <p className="mt-2">The system is built on Base44 (React + Deno backend functions) with OpenAI gpt-4o as the inference engine. It has a deterministic memory system, a heuristics formatting layer, and a chat UI with thread management, file support, and developer tools.</p>
            <Code>{`Platform:   Base44 (React + Deno serverless functions)
AI:         OpenAI gpt-4o (primary), gpt-4o-mini (utility tasks)
Storage:    Base44 entities (database)
Auth:       Base44 built-in auth + guest mode
Key file:   functions/hybridMessage  ← everything runs through here`}</Code>
          </Section>

          {/* 2. ACTIVE ARCHITECTURE */}
          <Section title="2. Active Architecture — hybridMessage Pipeline" color="cyan" defaultOpen={true}>
            <p>All messages flow through a single backend function: <code className="text-cyan-300">hybridMessage</code>. It is the unified governance gate. There is no separate pipeline runner — everything is in this one file.</p>
            <Code>{`Request → hybridMessage
  │
  ├─ 1. AUTH: base44.auth.me() — reject if not authenticated
  │
  ├─ 2. LOAD USER PROFILE: UserProfile entity (structured_memory, anchors, tone, project)
  │
  ├─ 3. PHASE A: ATOMIC MEMORY SAVE (if input matches trigger phrases)
  │      └─ detectMemorySave() → '__VAGUE__' | '__PRONOUN__' | content string | null
  │      └─ If vague → ask for clarification (MEMORY_CLARIFY mode)
  │      └─ If pronoun → ask who (MEMORY_CLARIFY_PRONOUN mode)
  │      └─ If content → splitAtomicFacts() → saveAtomicMemory() → receipt
  │      └─ Returns immediately — BYPASSES inference entirely
  │
  ├─ 4. LOAD SESSION HISTORY: Message entity, up to 200 messages
  │      └─ compressHistory() → HOT_HEAD(20) + summary block + HOT_TAIL(80)
  │
  ├─ 5. DETERMINISTIC RECALL: if detectMemoryRecall(input)
  │      └─ recallStructuredMemory() → keyword match against structured_memory
  │      └─ Returns top 10 matched entries, injected into system prompt
  │
  ├─ 6. HEURISTICS ENGINE v1 (internal — never surfaced in output)
  │      └─ classifyIntent() → MEMORY_ACTION | TECHNICAL_DESIGN | PARTNER_REVIEW |
  │                              EXECUTION_DIRECTIVE | SUMMARY_COMPACT | TOOL_INVOCATION | GENERAL_QUERY
  │      └─ calibrateDepth() → COMPACT | STANDARD | LAYERED
  │      └─ buildHeuristicsDirective() → appended to system prompt
  │      └─ MEMORY_ACTION bypasses — no directive injected
  │
  ├─ 7. BUILD SYSTEM PROMPT
  │      └─ Aria identity + truth discipline rules
  │      └─ OUTPUT FORMAT: prose only, no lists/headers unless asked
  │      └─ Recalled memories (if any)
  │      └─ Legacy memory_anchors (filtered, labeled INFERRED)
  │      └─ Tone/project context from UserProfile
  │      └─ Heuristics directive (depth + posture)
  │
  ├─ 8. OPENAI CALL: gpt-4o, max_tokens=2000
  │
  ├─ 9. SAVE MESSAGES: Message entity (user + assistant)
  │
  ├─ 10. BACKGROUND: auto-extract legacy anchors (every 5 turns)
  │
  └─ RETURN: { reply, mode, request_id, execution_receipt, ... }`}</Code>
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
            <Code>{`Conversation  — thread metadata (title, last_message_time, summary, keywords)
Message       — individual messages (conversation_id, role, content, tool_calls,
                execution_receipt, reactions, replies, file_urls)
UserProfile   — persistent user data:
                  preferred_name, assistant_name, environment_name
                  tone: { style, humor_ok, emoji_light, no_scaffold_titles, no_flattery }
                  project: { name, current_focus, known_friction_points }
                  memory_anchors: string[]   (legacy auto-extracted)
                  structured_memory: []       (Phase A atomic entries — ACTIVE)
UserFile      — uploaded files (name, url, type, folder_path, size, mime_type)`}</Code>

            <h4 className="text-white font-semibold mt-3">Governance / Advanced (built, partially used):</h4>
            <Code>{`Anchor         — hash-chained profile-global memory anchors (BUILT, not fully active)
Record         — Plane B message storage (BUILT, not the primary message store)
SessionContext — WCW budget tracking (BUILT)
Lane           — topic-based context windows (BUILT, not active in hybridMessage v2)
LexicalRule    — normalization rules (BUILT)
SessionManifest — capability contracts (BUILT)
DriftEvent     — contract violation log (BUILT)
RetrievalReceipt — retrieval audit trail (BUILT)
ThreadToken/Meta — title search index (BUILT)
ErrorLog       — failed message log (ACTIVE)
ConfigChangeLog — config audit trail (BUILT)`}</Code>
          </Section>

          {/* 6. FRONTEND STRUCTURE */}
          <Section title="6. Frontend Structure" color="orange">
            <h4 className="text-white font-semibold">Pages:</h4>
            <Code>{`Welcome         — auth gate (Google sign-in, email, guest mode)
Chat            — main interface (all chat logic lives here)
Admin           — admin dashboard (errors, stats, pipeline visualizer)
Console         — SSH/terminal console view
Implementation  — CAOS-A1 Python backend blueprint (FastAPI + SQLite)
MemoryIsolation — memory isolation architecture docs
SystemBlueprint — THIS FILE (living architecture doc)
News            — news feed page`}</Code>

            <h4 className="text-white font-semibold mt-3">Key Components:</h4>
            <Code>{`components/chat/
  ChatBubble       — message rendering (markdown, code, reactions, replies, receipts)
  ChatHeader       — header (thread controls, search, token meter)
  ChatInput        — input (file upload, voice, screen capture, camera, TTS)
  ThreadList       — conversation sidebar
  ProfilePanel     — user profile + file manager + memory panel
  TokenMeter       — WCW usage visualization
  ConversationSearch — in-thread search with jump-to
  StarfieldBackground — animated canvas backdrop
  WelcomeGreeting  — randomized greeting on empty thread

components/game/   — embedded game viewer (iframe)
components/terminal/ — code terminal panel (developer mode)
components/admin/  — admin widgets (StatsViewer, RecentErrors, etc.)
components/profile/MemoryPanel — structured_memory viewer
components/docs/   — architecture doc components`}</Code>

            <h4 className="text-white font-semibold mt-3">Modes (localStorage flags):</h4>
            <Code>{`caos_developer_mode   — shows resizable code terminal panel
caos_game_mode        — shows embedded game viewer
caos_multi_agent_mode — shows blackboard panel (placeholder)
caos_guest_user       — guest session data`}</Code>
          </Section>

          {/* 7. BACKEND FUNCTIONS */}
          <Section title="7. Backend Functions" color="green">
            <Code>{`hybridMessage          ← MAIN FUNCTION. All chat goes through here.
simpleMessage          — lightweight fallback (no memory)
textToSpeech           — TTS using OpenAI audio
transcribeAudio        — Whisper transcription
generateThreadSummary  — summarize a thread
systemHealth           — admin health check
diagnosticSnapshot     — session state snapshot
diagnosticRecall       — memory recall diagnostic
inspectPipeline        — pipeline inspection
inspectRouting         — routing trace
quickInspect           — fast inspection
postPatchAudit         — post-deploy audit
testAnchors            — anchor system test
extractUserPreference  — preference extraction
pinMemory              — pin a memory entry
grokProvider           — Grok/xAI API integration (built, not primary)
checkGrokModels        — list Grok models`}</Code>
          </Section>

          {/* 8. TRUTH DISCIPLINE */}
          <Section title="8. Aria Truth Discipline (Active Rules)" color="red">
            <p>These rules are injected into Aria's system prompt on every request:</p>
            <Code>{`1. PRIOR-MENTION CLAIMS: Never say "you mentioned" / "you previously said" / "as we discussed"
   unless the fact is in STRUCTURED MEMORY or verbatim in session history.

2. NEW INFORMATION RULE: If user introduces a fact in the current message,
   respond with "Got it —" and treat it as new.

3. PREFERENCE CLAIMS: Never assert "you like X" or "you prefer X" unless in
   structured_memory or stated this session. Use "It sounds like..." for inferences.

4. NO FABRICATION: If a fact isn't stored, say "I don't have that stored."

5. SOURCE LABELING: When recalling facts, label the source:
   "(from memory)" | "(from this conversation)" | "(inferred)"`}</Code>
          </Section>

          {/* 9. WHAT IS NOT YET ACTIVE */}
          <Section title="9. Built But Not Yet Active" color="yellow">
            <Code>{`Lane-based context isolation    — entities exist, not wired into hybridMessage
Plane B (Record entity)         — schema built, not the primary message store
Anchor hash-chain               — entity schema built, not active
ThreadSnapshot / rotation       — built, not triggered (no 90K limit in current pipeline)
LexicalRule normalization       — entity built, not applied in hybridMessage
Drift detection (DriftEvent)    — entity built, detection not active
SessionManifest capability gate — built, not enforced
Multi-agent blackboard          — UI placeholder only, no backend
CAOS-A1 Python backend          — full FastAPI+SQLite blueprint documented in /Implementation
                                   but not deployed (no external Python server running)`}</Code>
          </Section>

          {/* 10. KNOWN ISSUES / NEXT WORK */}
          <Section title="10. Known Issues & Candidate Next Work" color="blue">
            <Code>{`KNOWN:
- Memory save strips "that" from "remember that my dog..." → saves "my dog's name is Biscuit"
  (acceptable — content is accurate)
- Legacy memory_anchors (auto-extracted) are still injected as INFERRED context
  → could accumulate noise over time → Phase B will replace this
- hybridMessage is 620 lines — consider splitting into sub-modules

CANDIDATE NEXT:
- Phase B: Typed schema normalization for structured_memory entries
  (person/place/preference/date classification)
- Phase C: Entity graph (link related facts)
- Wire hybridMessage to read UserProfile.tone.style and apply to Aria's personality
- Expose structured_memory in ProfilePanel MemoryPanel (partially done)
- Add memory delete/edit capability to MemoryPanel
- Activate LexicalRule normalization (chaos → CAOS)
- Thread auto-summary on conversation close`}</Code>
          </Section>

          {/* 11. AUDIO BLUEPRINT */}
          <Section title="11. Audio Blueprint v1 — CAOS Audio Layer (PENDING)" color="orange">
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
          <Section title="TSB — Troubleshooting Bulletins (Known Issues & Fixes)" color="red">
            <p className="text-gray-300 text-xs mb-4">A running log of real issues encountered during CAOS development, what caused them, and what fixed them. Each entry is a permanent record.</p>

            <div className="space-y-4">

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
            (gpt-4o context window — more accurate reference).
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

            <div className="bg-white/5 border border-white/10 rounded p-3 mt-4">
            <p className="text-white/40 text-xs">TSB entries are permanent records. Resolved entries stay in this log. New issues get a new TSB number.</p>
            </div>
            </Section>

          {/* BUILD SEQUENCE */}
          <Section title="CAOS_BUILD_SEQUENCE_v1 — Controlled Build Phases" color="cyan">
            <p className="text-cyan-200 font-semibold">This is the locked execution sequence. Phases are executed in order. No phase is started until the previous one meets its exit condition.</p>

            <div className="space-y-5 mt-4">

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

          {/* 12. ARIA ACCESS NOTE */}
          <Section title="12. How Aria Reads This Blueprint" color="cyan">
            <p>The full text of this blueprint is available to Aria through the system prompt whenever the user asks about CAOS architecture, what has been built, or what the current state of the system is. The blueprint is injected as structured context — not as a URL, but as a summary block in the system prompt when relevant recall is triggered.</p>
            <p className="mt-2">To ask Aria about the system state, use recall-trigger phrases like: <em>"what do you know about CAOS architecture"</em>, <em>"what have we built"</em>, or <em>"what's the current state of the memory system"</em>.</p>
            <Code>{`Aria knows:
- The active pipeline (hybridMessage stages)
- Phase A memory is locked, Phase B/C reserved
- Heuristics Engine v1 is locked
- Truth discipline rules
- What is built vs not yet active
- The Python backend blueprint exists but is not deployed`}</Code>
          </Section>

        </div>
      </ScrollArea>
    </div>
  );
}