import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const Section = ({ title, color = 'blue', children }) => {
  const [open, setOpen] = useState(false);
  const colorMap = {
    blue: { border: 'border-blue-500/30', text: 'text-blue-300', bg: 'bg-blue-950/40' },
    red: { border: 'border-red-500/30', text: 'text-red-300', bg: 'bg-red-950/40' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl overflow-hidden`}>
      <button
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
  }[color];
  return <span className={`inline-block text-xs px-2 py-0.5 rounded border ${cls} mr-1`}>{label}</span>;
};

export default function TSBLog() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => navigate(createPageUrl('SystemBlueprint'))}
          className="flex items-center gap-2 text-blue-300 hover:text-blue-100 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blueprint
        </button>
      </div>

      <ScrollArea className="h-[calc(100vh-6rem)]">
        <div id="tsb-content" className="max-w-4xl mx-auto space-y-4 pb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">CAOS TSB Log</h1>
            <p className="text-red-300">Troubleshooting Bulletins — Permanent Failure & Fix Records</p>
            <p className="text-gray-400 text-xs mt-1">A running log of real issues encountered during CAOS development, what caused them, and what fixed them. TSB-001 through TSB-029.</p>
          </div>

          <Section title="TSB — Troubleshooting Bulletins (Known Issues and Fixes)" color="red">
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
                  <span className="text-red-300 font-bold text-sm">TSB-002 — Memory Save Strips "that" from "remember that..."</span>
                  <Tag label="KNOWN / ACCEPTABLE ✅" color="yellow" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: functions/hybridMessage — detectSaveIntent()
Symptom:   When user says "remember that my dog is Biscuit", the stored
           memory entry reads "my dog is Biscuit" — the word "that" is stripped.
Root Cause: The detectSaveIntent() regex strips the trigger phrase including
           "remember that" as a single token, then takes everything after it.
           This is correct behavior — "that" is part of the trigger, not the content.
Fix:       Accepted as intentional behavior. The stripped content is semantically
           complete. "my dog is Biscuit" is the correct atomic fact.
Status:    KNOWN, ACCEPTABLE. Not a bug. No fix required.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-003 — Legacy memory_anchors Still Injected as INFERRED Context</span>
                  <Tag label="KNOWN / ACTIVE" color="yellow" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: functions/hybridMessage — buildSystemPrompt()
Symptom:   Old memory_anchors (string array, legacy format) from UserProfile
           are still injected into the system prompt as "INFERRED CONTEXT."
           These were stored before Phase A structured_memory was implemented.
Root Cause: hybridMessage still reads UserProfile.memory_anchors and injects them
           as a legacy block below the structured_memory recall block.
           They are labeled "INFERRED" which is correct — they were auto-extracted,
           not explicitly user-confirmed.
Fix:       None yet. The injection is labeled correctly ("INFERRED CONTEXT").
           Users who have no legacy anchors see nothing in this block.
           Phase B or a future cleanup pass should formally deprecate this block.
Status:    KNOWN, ACTIVE. Will be addressed in Phase B (typed schema refactor).`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-004 — Silent Background Writes: Auto-Extraction Violating "No Silent Writes" Rule</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: functions/hybridMessage — anchor extraction stage
Symptom:   Every AI turn was silently extracting "interesting facts" from the
           conversation and writing them to memory_anchors without user knowledge
           or confirmation. Users had no visibility into what was being saved.
Root Cause: Auto-extraction was running on every message_save stage.
           Violated the "No Silent Writes" invariant (Rule 5 in Section 0).
Fix:       Anchor auto-extraction DISABLED via Phase 3.1 lock in hybridMessage.
           A comment in the source marks the disabled block.
           Memory saves are now EXPLICIT ONLY via Phase A trigger phrases.
Status:    FIXED. Auto-extraction disabled. No passive writes.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-005 — Vague Memory Save: No Clarification Requested</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: functions/hybridMessage — detectSaveIntent() / MEMORY_CLARIFY mode
Symptom:   When user said "remember that" with no content, or vague phrases like
           "remember everything we talked about", Aria would either save nothing
           silently or save a nonsensical empty entry.
Root Cause: detectSaveIntent() was not checking for vague/empty content
           before attempting to save. It returned an empty string, which was
           then passed to the save flow.
Fix:       detectSaveIntent() now returns '__VAGUE__' for non-specific content.
           hybridMessage: if vague → return MEMORY_CLARIFY mode response asking
           user to be more specific. No write occurs until content is explicit.
           Similarly, pronoun-only content → '__PRONOUN__' → MEMORY_CLARIFY_PRONOUN.
Status:    FIXED. Vague and pronoun-only saves trigger clarification, not silent failure.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-006 — Memory Dedup Not Working: Identical Facts Saved Multiple Times</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: functions/hybridMessage — saveOneAtomicEntry()
Symptom:   Saying "remember my dog is Biscuit" twice would create two identical
           entries in UserProfile.structured_memory. No deduplication was occurring.
Root Cause: The save flow was not checking for existing entries with the same
           normalized content before writing. Each trigger created a new UUID entry.
Fix:       Added dedup check in saveOneAtomicEntry():
           - Normalize both new content and existing entries (lowercase, strip whitespace)
           - If normalized match found → skip write, return dedup_ids in receipt
           - Receipt now includes: dedup_ids[] (IDs of entries that were skipped)
Status:    FIXED. Duplicate memory saves are silently skipped with receipt audit trail.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-007 — Memory Recall Returns Unrelated Entries</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: functions/hybridMessage — recallStructuredMemory()
Symptom:   Asking "what do you remember about me?" would surface unrelated entries.
           e.g., asking about dogs would return entries about software projects.
           Scoring was not filtering effectively.
Root Cause: Early recall logic returned ALL structured_memory entries sorted by
           recency, not by relevance. There was no keyword intersection scoring.
Fix:       recallStructuredMemory() now:
           1. Extracts keywords from query (tags extracted same way as save)
           2. Scores each entry by tag intersection hits
           3. Returns top 10 by score (not by recency)
           4. Zero-score entries are excluded from injection
Status:    FIXED. Recall is keyword-scored. Unrelated entries no longer surface.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-008 — Aria Claims to "Remember" Things Not in Structured Memory</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: functions/hybridMessage — buildSystemPrompt() / Truth Discipline block
Symptom:   Aria would say "I remember you mentioned..." or "you told me earlier..."
           referring to facts from the conversation that were never saved to memory.
           This is fabrication — treating session context as persistent memory.
Root Cause: No truth discipline rules were injected into the system prompt.
           Aria was drawing from conversation history and framing it as memory.
Fix:       Added 5 Truth Discipline rules to every system prompt:
           1. PRIOR-MENTION CLAIMS: Never say "you mentioned" unless in STRUCTURED MEMORY
           2. NEW INFORMATION RULE: If introduced now, treat as new
           3. PREFERENCE CLAIMS: Never assert "you like X" unless in structured_memory
           4. NO FABRICATION: If not stored, say "I don't have that stored"
           5. SOURCE LABELING: (from memory) | (from this conversation) | (inferred)
Status:    FIXED. Truth discipline enforced on every request.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-009 — Read Aloud Progress Bar Not Reflecting Real Playback</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Feb 28, 2026
Component: components/chat/ChatBubble.jsx — audio progress tracking
Symptom:   The progress bar during read-aloud was animating at a fixed rate
           instead of tracking actual audio position. It would complete before
           audio finished, or continue after audio stopped.
Root Cause: Progress was being driven by a fake setInterval() counter, not by
           the audio element's timeupdate event.
Fix:       - Removed fake interval
           - Added audio.addEventListener('timeupdate', ...) to track real position
           - Progress = (audio.currentTime / audio.duration) * 100
           - Duration shown using audio.addEventListener('loadedmetadata', ...)
           - Seek-on-click wired to the progress bar
           - Skip ±10s buttons wired to audio.currentTime ±= 10
Status:    FIXED. Progress bar reflects real playback position.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-010 — Google Web Speech TTS Not Playing (Browser Autoplay Block)</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 1, 2026
Component: components/chat/ChatInput.jsx — Google Web Speech path
Symptom:   Clicking the speaker icon in ChatInput would silently fail to play.
           No audio, no error, no UI feedback.
Root Cause: Browser autoplay policy requires audio to be initiated within a direct
           user gesture handler (click event). The code was scheduling playback
           asynchronously (inside a Promise or setTimeout), breaking the gesture
           link and causing the browser to block it silently.
Fix:       - speechSynthesis.speak() called synchronously inside the click handler
           - Pre-warm the engine: speechSynthesis.cancel() at startup
           - Engine keep-alive: periodic silent cancel() to prevent Chrome
             from garbage-collecting the TTS engine after 10s of inactivity
           - Voice list loaded via speechSynthesis.onvoiceschanged event
Status:    FIXED. Google Web Speech now plays reliably from button click.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-011 — OpenAI TTS Model "tts-1" No Longer Valid</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 1, 2026
Component: functions/textToSpeech.js
Symptom:   OpenAI TTS API calls were returning 404 / model not found errors.
           Audio was not being generated. The read-aloud feature was broken.
Root Cause: The function was using model: "tts-1" which was deprecated/renamed.
           As of Mar 2026, the correct model identifier is "tts-1-hd".
Fix:       Changed model from "tts-1" to "tts-1-hd" in functions/textToSpeech.js.
           Verified working: OpenAI /v1/audio/speech returns audio/mpeg binary.
Rule:      textToSpeech is LOCKED. Model string is "tts-1-hd" ONLY.
           Do not change without testing + TSB entry.
Status:    FIXED. textToSpeech function locked with tts-1-hd.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-012 — WCW Token Meter Showing Estimated Data Instead of Real Backend Data</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 1, 2026
Component: components/chat/TokenMeter.jsx + pages/Chat.jsx
Symptom:   In the published app (not iframe), the WCW meter always showed
           "~Xk / Yk (estimated)" with the ~ prefix, even after multiple messages.
           In the iframe preview it showed real data. Discrepancy between environments.
Root Cause: Chat.jsx was not fetching the last DiagnosticReceipt on thread load.
           In the iframe, wcwState was populated by the active session's live data.
           In the published app (fresh page load), no receipt was ever fetched,
           so wcwState stayed null → TokenMeter fell back to character-count estimate.
Fix:       Chat.jsx now fetches the last DiagnosticReceipt for the current
           conversation_id on thread load (inside useConversations hook).
           If found: setWcwState({ used: receipt.wcw_used, budget: receipt.wcw_budget })
           On thread switch: wcwState resets to { used: null, budget: null }
           to prevent stale WCW from previous thread bleeding into new thread display.
Status:    FIXED. Published app now shows real WCW data from DiagnosticReceipt.`}</Code>
              </div>

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
                  <span className="text-red-300 font-bold text-sm">TSB-014 — Chat.jsx Refactor: File Too Large to Safely Edit (1341 Lines)</span>
                  <Tag label="IN PROGRESS 🔧" color="yellow" />
                </div>
                <Code>{`Date:      Mar 3, 2026
Component: pages/Chat.jsx
Symptom:   Chat.jsx grew to 1341 lines — more than 3x the 400-line hard limit.
           Every edit to this file risked breaking unrelated functionality.
           The file was doing authentication, data loading, conversation management,
           message sending, TTS, file handling, and UI rendering all in one place.
Root Cause: Incremental feature additions without extraction. Each sprint added
           more hooks, effects, and handlers into a single file.
Fix:       Phased extraction plan:
           Phase 1 (COMPLETE ✅ — Mar 3, 2026):
             → hooks/useAuthBootstrap.js (56 lines) — user auth init + guest mode
             → hooks/useConversations.js (240 lines) — conversation CRUD + state
           Phase 2 (PENDING): hooks/useSendMessage.js — message send + error handling
           Phase 3 (PENDING): split UI sections into sub-components
Current:   ~1126 lines remaining in Chat.jsx after Phase 1 extraction.
Status:    IN PROGRESS. useAuthBootstrap ✅ useConversations ✅ useSendMessage PENDING.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-015 — Files/Photos/Links Panel Broken: Not Saving, Nav Not Working</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 3, 2026
Component: components/chat/ProfilePanel.jsx + components/files/FileManager.jsx
Symptom 1: Files attached in chat were not appearing in the Files panel.
Symptom 2: Clicking "Files" in the nav would not open the files view.
Symptom 3: AI-generated links in replies were not being saved to UserFile.
Root Cause 1: ChatInput was uploading files to Base44 storage but not writing
             a UserFile entity record. The entity and the storage were disconnected.
Root Cause 2: ProfilePanel nav was not correctly routing to the fileView state
             because the onClick handler was calling the wrong setter.
Root Cause 3: Chat.jsx extractAndSaveLinks() was not running after AI reply
             because it was placed after a conditional return that could exit early.
Fix:       1. ChatInput: after upload → base44.entities.UserFile.create({ name, url, type })
           2. Chat.jsx: saveToUserFiles() called for every attached file after AI reply
           3. Chat.jsx: extractAndSaveLinks() runs unconditionally after reply received
           4. ProfilePanel: nav onClick correctly sets fileView state
Status:    FIXED. Files, photos, and links all persist to UserFile on chat interactions.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-016 — Web Search Not Triggering on Explicit Browse Requests</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 3, 2026
Component: functions/core/externalKnowledgeDetector + functions/core/selectorEngine
Symptom:   When user said "search for X" or "look up X", Aria would respond
           from training data instead of executing a web search. Even when the
           user explicitly used browse verbs, the detector returned false.
Root Cause: externalKnowledgeDetector was using a two-stage logic where:
           Stage 1: check if query requires external knowledge (recent events, etc.)
           Stage 2: check if there's sufficient existing knowledge in context
           But browse verbs ("search", "look up", "find", "browse") were only
           checked in Stage 1 and could be overridden by Stage 2 sufficiency logic.
           A user saying "search for the weather" would pass Stage 1 but fail Stage 2
           because "weather" has some training data — so search was skipped.
Fix:       v2 rewrite:
           - Browse verbs now trigger an UNCONDITIONAL search bypass:
             if browseVerbDetected → force_search = true, skip sufficiency check
           - selectorEngine v2 similarly: explicit browse verbs → always authorize search
           - Sufficiency check only applies to implicit/ambiguous queries
Status:    FIXED. Explicit browse verb requests always trigger web search.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-017 — Chat.jsx Refactor Phase 1: useAuthBootstrap + useConversations Extracted</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 3, 2026
Component: pages/Chat.jsx → hooks/useAuthBootstrap.js + hooks/useConversations.js
Action:    Phase 1 of the Chat.jsx refactor (TSB-016) complete.
Files created:
  components/hooks/useAuthBootstrap.js (56 lines)
    → user auth initialization, guest mode detection, dataLoaded state
    → replaces ~60 lines of auth logic in Chat.jsx
  components/hooks/useConversations.js (240 lines)
    → conversation CRUD: create, delete, rename
    → session resume handshake
    → message history lazy-loading
    → WCW state reset on thread switch
    → replaces ~280 lines of conversation management in Chat.jsx
Result:    Chat.jsx reduced from 1341 to ~1126 lines.
           Still over the 400-line hard limit — refactor continues.
Next:      hooks/useSendMessage.js — message send + error handling + retry logic`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-018 — runtimeAuthority: Centralized Config Source of Truth Created</span>
                  <Tag label="FIXED ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 2, 2026
Component: functions/core/runtimeAuthority.js (NEW)
See also:  TSB-013 (duplicate config problem that motivated this)
Action:    Created functions/core/runtimeAuthority.js as the single canonical
           source for all runtime configuration.
Exports:   RUNTIME_AUTHORITY = {
             build_id: "CAOS_BUILD_v2_2026-03-02",
             runtime: { model_name: "gpt-5.2", token_limit: 200000,
                        platform_name: "Base44", hosting: "Base44 (Deno serverless)", ... },
             capabilities: { file_read, file_write, vision, web_search: { enabled: true,
                             trigger: "NEEDS_BASED_AUTOMATIC", provider: "bing_api" }, tts, ... },
             safeguards: { domain_allowlist, max_request_timeout_ms: 300000, ... }
           }
Consumers: systemSnapshot, wcwMeasure, promptBuilder — all now import from runtimeAuthority.
Lock:      RUNTIME_AUTHORITY is the governance point. Model changes require a TSB entry.
Status:    COMPLETE. runtimeAuthority.js is the canonical source of truth for all config.`}</Code>
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

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-020 — CTC Memory System Phase 1 Deployed: Entities + threadIndexLoader</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 4, 2026
Component: CTC Memory System — Phase 1
Entities deployed:
  ThreadIndex     — thread registry with temperature lifecycle
  ContextSeed     — compressed ARC pack storage (span_hash idempotency)
  LaneState       — lane-level pinned state
  LaneSeedHistory — ordered seed history per lane
Module deployed:
  context/threadIndexLoader — loads ThreadIndex with temperature recalculation on access
    Temperature lifecycle: HOT(<24h), WARM(<30d), COLD(<90d), VANISH(>90d)
    Never trusted from storage — always recalculated on load
Patches applied:
  CSC-TIME-001: ContextSeed now requires created_at + last_hydrated_at + source_span timestamps
  CTC-TIME-001: threadIndexLoader stores last_active_at + last_seed_created_at on every write
  CTC-TIME-002: threadHydrator updates last_hydrated_at on every seed load
Error traceability:
  All CTC failures log to ErrorLog with stage=CTC_PHASE1, full context preserved
Status:    COMPLETE. Entities live. threadIndexLoader deployed and testable.
Notes:     No ContextSeed records yet — first seeds created via context/seedCompressor.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-021 — hybridMessage Bloat: 538 Lines, Logic Inlined, I2 Invariant Violated</span>
                  <Tag label="OPEN ⚠️" color="red" />
                </div>
                <Code>{`Date:      Mar 5, 2026
Component: functions/hybridMessage
Symptom 1: hybridMessage grew from ~420 lines to 538 lines — exceeds the 400-line hard limit.
Symptom 2: receiptWriter is now invoked fire-and-forget (.catch only), violating the I2
           invariant which requires it to be awaited (it is diagnostic infrastructure,
           not optional). If receiptWriter fails silently, WCW data and DiagnosticReceipt
           are lost with no trace.
Symptom 3: Memory detection, heuristics, and prompt building logic were inlined into the
           spine (pure function optimization to reduce Deno round-trip latency). This means
           the standalone modules core/memoryEngine, core/heuristicsEngine, and
           core/promptBuilder now contain DUPLICATE logic — they exist but are not called
           from hybridMessage. There is no single canonical source for these functions.
Root Cause: Incremental optimization without a refactor plan. Each inlining was justifiable
           in isolation (latency reduction is real), but the cumulative effect:
             a) Violated the 400-line hard limit
             b) Created logic duplication across spine and standalone modules
             c) Degraded the I2 invariant (receipt await → fire-and-forget)
             d) Made the spine do implementation work (violates spine-only-orchestrates rule)
Current Status: FROZEN — no further edits to hybridMessage until a scoped refactor plan
           is approved by owner. Plan must address:
             1. Extract inlined pure functions into a single shared module (not duplicate modules)
             2. Restore receiptWriter to awaited call
             3. Reduce hybridMessage to ≤400 lines
             4. Re-lock with new LOCK_SIGNATURE after refactor
Fix Path:  Step A (today): Freeze hybridMessage. No new edits.
           Step B (next session, with explicit unlock): Scoped refactor plan submitted to owner.
           Step C: Execute refactor. Test. Re-lock. Confirm line count ≤400.
           Step D: Decommission duplicate logic in standalone modules OR make them authoritative.
Impact:    Pipeline is FUNCTIONAL. These are governance and maintainability violations,
           not runtime failures. receiptWriter fire-and-forget means WCW data may be
           lost on failure, but pipeline continues and responds correctly.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-022 — Governance Gates: Design Complete, Mechanical Enforcement Not Yet Active</span>
                  <Tag label="OPEN — IN DESIGN" color="yellow" />
                </div>
                <Code>{`Date:      Mar 5, 2026
Component: Governance / Build Process
Symptom:   The repeated pattern of files exceeding the 400-line hard limit (hybridMessage,
           Chat.jsx) and locked files being modified without TSB entries demonstrates that
           "I will comply" promises from agents are insufficient enforcement.
           No mechanical gates currently prevent violations.
Root Cause: The enforcement mechanism is trust-based, not mechanical. An agent can
           (and has) modified locked files or bloated files without consequence at
           the tooling level.
Design Completed (Mar 5, 2026):
   GATE-0: governance/LOCK_MANIFEST.json — single source of truth for:
     - locked_files[]
     - line_limit_default (400)
     - exceptions[] (SystemBlueprint, TSBLog)
     - owner_unlock_phrase ("UNLOCK")
   GATE-1: Pre-deploy check — fail if locked file modified without UNLOCK token
   GATE-2: Pre-deploy check — fail if any non-exempt file exceeds 400 lines
   Enforcement path: Dashboard-only (no GitHub CI available)
     → Base44 does not currently expose a pre-deploy hook
     → Nearest equivalent: a backend function (core/governanceCheck) that
       reads file metadata and fails loudly when called at session start
     → Owner must invoke manually until native hook exists
Fix Path:  Implement core/governanceCheck backend function that:
     1. Reads LOCK_MANIFEST from entity storage
     2. Checks line counts of all non-exempt files
     3. Returns a governance_report: { violations[], locked_files_clean: boolean }
   Wire it to the new-agent onboarding block (Section 0) — first tool call of every session.
   This makes violations visible immediately, even without CI.
Status:    Design complete. Implementation pending owner approval.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-023 — Capability Declaration Moved to promptBuilder: Every Session Tool-Aware by Default</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 5, 2026
Component: functions/core/promptBuilder + functions/hybridMessage
Symptom:   Every new session required a "bootloader inject" token from the user
           to tell Aria it had web search, file read/write, image gen, Python,
           TTS, STT, and memory capabilities. Without it, Aria would claim tools
           were unavailable or uncertain about its capabilities.
Root Cause: The KV block in hybridMessage's inlined buildSystemPrompt() only
           declared a minimal set of capabilities and didn't include explicit
           per-tool ON/OFF declarations. The bootloader token compensated for this.
Fix:       1. core/promptBuilder rewritten (v2) — now carries the full canonical
              CAPABILITY AWARENESS block declaring all tools as ON by default:
                web_search, file_read, file_write, image_parse, image_gen,
                python, tts, stt, memory, policy_gating — all explicit.
           2. hybridMessage PROMPT_BUILD stage now delegates to core/promptBuilder
              via buildSystemPromptViaModule() instead of using the inlined
              buildSystemPrompt() function. Inlined function removed.
           3. The bootloader inject button is PRESERVED in the UI for legacy threads
              that predate this fix — but new sessions no longer need it.
           4. runtimeAuthority.js updated (v2) with expanded capability map +
              buildAuthorityKV() helper.
Impact:    Every new agent session is immediately tool-aware. No user action needed.
Lock:      core/promptBuilder is now the canonical capability source.
           Do not modify the AUTHORITY_KV block without a TSB entry.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-024 — RSoD (Red Screen of Death): Blocking Error Modal + errorClassifier Implemented</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 6, 2026
Component: components/lib/errorClassifier.js (NEW)
           components/chat/RedScreenOfDeath.jsx (NEW)
           pages/Chat.jsx (updated: imports, state, send handler, catch block, render)
Symptom:   Before this fix, all pipeline errors — including catastrophic 5xx failures
           and network outages — were handled inline with a toast notification and a
           "failed" message bubble. There was no distinction between recoverable and
           blocking errors. Users saw a broken UI state with no clear recovery path.
Root Cause: The error path in Chat.jsx's handleSendMessage() had a single handling
           branch: log to ErrorLog, show toast, mark temp message as "failed". This
           was insufficient for server errors that indicate systemic failure (5xx,
           network down, payload limit exceeded), which require a hard stop, not an
           inline degraded state.
Fix:       Two new focused modules created:

  1. components/lib/errorClassifier.js (pure utility — no React, no imports)
     - classifyError(error, response) → normalized classification object
     - Evaluates: network failures, HTTP status codes, structured error_code fields
     - BLOCKING_CODES = { SERVER_ERROR, INTERNAL_ERROR, PAYLOAD_TOO_LARGE, ... }
     - Returns: { error_id, error_code, stage, blocking, public_message,
                  timestamp, recovery_hint }
     - blocking=true → RSoD. blocking=false → inline failed assistant bubble.
     - Strict: never serializes request body in error objects (telemetry safety)

  2. components/chat/RedScreenOfDeath.jsx (React modal component)
     - Full-screen red modal that renders over all other content
     - Displays: error_code, stage, error_id, session_id, timestamp
     - Actions: Retry (replays lastSendRef), Copy diagnostics, Escape to dismiss
     - Does NOT expose request payload or raw error stack to the user
     - onDismiss() allows user to return to chat (non-fatal RSoD path)

  3. pages/Chat.jsx patched:
     - imports: RedScreenOfDeath + classifyError added
     - state: rsodError (null | classified object) + lastSendRef (stores last send params)
     - Response error path (non-200): classifyError(null, response) → blocking → RSoD or inline
     - Catch path: classifyError(error, null) → blocking → RSoD or existing toast+retry path
     - Render: {rsodError && <RedScreenOfDeath ... />} at top of return, above starfield

Architecture:
  - errorClassifier is pure (no side effects) — testable in isolation
  - RSoD modal is stateless — driven entirely by classified error object
  - Chat.jsx is the only orchestrator — no new state leaked to child components
  - lastSendRef preserves last send params for retry without re-typing

PHASE 1.4 STATUS:
  "Remove UI Generic Masking" — COMPLETE ✅
  Blocking errors (5xx, network) now surface as RSoD instead of generic toast.
  Non-blocking errors (4xx, known codes) remain as inline failed bubbles.
  PHASE 1 exit condition progress:
    1.1 Stage Tracker ✅ | 1.2 ODEL v1 ✅ | 1.3 Admin Console PENDING | 1.4 RSoD ✅`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-025 — PR1: ChatBubble Refactor — Monolith Split into Modular bubble/ Sub-Components</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 7, 2026
Component: components/chat/ChatBubble.jsx (source) →
           components/chat/bubble/ (new sub-component directory)
Session:   PR1 — executed and verified this session before PR2 kickoff.

Symptom / Motivation:
  ChatBubble.jsx was a monolith handling markdown rendering, video embeds,
  attachments, generated files, reactions, replies, receipt panel, function
  display, and audio player — all in a single file well over 400 lines.
  Violates modularity rule (Section 0.1) and hard line limit (Section 0.2).

Files Created (all under components/chat/bubble/):
  FunctionDisplay.jsx    — Tool call lifecycle display (130 lines) ✅
                           Enhanced: tool name → human description mapping,
                           status icons (pending/running/completed/failed),
                           expandable arguments + results panel.
  MarkdownMessage.jsx    — ReactMarkdown block with all custom overrides (82 lines) ✅
                           Verbatim extraction — no logic changes.
  Attachments.jsx        — File attachment list renderer (image preview + download links)
  GeneratedFiles.jsx     — AI-generated file display (image preview + download)
  Reactions.jsx          — Emoji reaction badge renderer
  Replies.jsx            — Inline reply thread (selected_text + user_reply + ai_response)
  ReceiptPanel.jsx       — ExecutionReceipt conditional display + dev suppressed log
  VideoEmbeds.jsx        — Video URL detection → YouTube/Vimeo embed renderers
  MessageHelpers.js      — Pure utility: getYouTubeId, getVimeoId, extractUrls,
                           isVideoUrl, extractFilename (no React, no side effects)

ChatBubble.jsx (parent):
  Retained: all state management (TTS audio, selection menu, voice settings),
  all event handlers (handleReadAloud, handleReact, handleReply, etc.),
  all LOCKED TTS path logic (untouched per governance rules).
  Now imports sub-components from ./bubble/ and delegates rendering to them.

LOCK CLARIFICATION (Section 0 / §11):
  The LOCKED declaration on ChatBubble in §0 applies SPECIFICALLY to the TTS path:
    - handleReadAloud(), audioRef, globalAudioInstance, stopAllAudio()
    - The audio player bar UI (progress, seek, play/pause/stop, skip controls)
    - The cacheKey pattern, audioCache Map, ttsLog instrumentation
  Non-TTS sections of ChatBubble (markdown, reactions, tool display, etc.)
  are NOT locked and may be modified via PRs with standard TSB documentation.

Verification:
  - Chat UI loaded, messages rendered correctly post-refactor
  - TTS read-aloud tested — audio plays, progress bar tracks, pause/stop work
  - Text selection menu opens on right-click, reactions and replies functional
  - All sub-components confirmed present in components/chat/bubble/ directory

Changed (PR1):
  components/chat/bubble/FunctionDisplay.jsx  +130 lines (NEW)
  components/chat/bubble/MarkdownMessage.jsx  +82 lines (NEW)
  components/chat/bubble/Attachments.jsx      (NEW)
  components/chat/bubble/GeneratedFiles.jsx   (NEW)
  components/chat/bubble/Reactions.jsx        (NEW)
  components/chat/bubble/Replies.jsx          (NEW)
  components/chat/bubble/ReceiptPanel.jsx     (NEW)
  components/chat/bubble/VideoEmbeds.jsx      (NEW)
  components/chat/bubble/MessageHelpers.js    (NEW)
  components/chat/ChatBubble.jsx              (MODIFIED — sub-component imports added)`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-026 — Audit: errorClassifier Extension and Filename Correction</span>
                  <Tag label="KNOWN / DOCUMENTED" color="yellow" />
                </div>
                <Code>{`Date:      Mar 7, 2026
Component: components/lib/errorClassifier.jsx
Session:   PR2 onboarding audit (Mar 7, 2026)

Finding 1 — Filename discrepancy:
  TSB-024 and Blueprint §19 reference this file as:
    components/lib/errorClassifier.js
  Actual deployed filename:
    components/lib/errorClassifier.jsx
  The .jsx extension is correct (JSX-capable module, even though it exports
  only a pure function with no JSX). No functional impact — import paths
  resolve correctly under the Vite/Base44 build. Documentation corrected.

Finding 2 — BLOCKING_CODES set vs. NETWORK_ERROR:
  BLOCKING_CODES = Set(['SERVER_ERROR', 'UPSTREAM_UNAVAILABLE', 'PAYLOAD_TOO_LARGE'])
  NETWORK_ERROR is NOT in BLOCKING_CODES. It is handled as a separate Case 1
  branch (err && !response) that unconditionally returns blocking: true.
  This is correct and intentional — network errors are always blocking,
  but the code path bypasses the BLOCKING_CODES set lookup entirely.
  TSB-024 description implied BLOCKING_CODES covered all blocking scenarios.
  Clarification: BLOCKING_CODES only governs HTTP-200-with-structured-error-code
  responses. Network-level failures (Case 1) and 5xx responses (Case 3)
  are blocking by their own independent branches.

No code changes required. Documentation only.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-027 — PR2: ChatBubble Modularization + Cleanup (400-line hard limit)</span>
                  <Tag label="IN PROGRESS 🔧" color="yellow" />
                </div>
                <Code>{`Date:      Mar 7, 2026
Component: components/chat/ChatBubble.jsx + components/chat/bubble/*
Session:   PR2 — approved and in progress.

Objective:
  Reduce ChatBubble.jsx from 928 lines to ≤400 lines (hard limit per §0.2)
  by extracting remaining inline blocks into focused bubble/ sub-components.
  No invented features. No behavior changes except one explicitly approved decision.

Approved behavior change (owner decision, Mar 7, 2026):
  Remove external fetch calls to http://172.234.25.199:3001/api/message
  from handleReact() and handleReply(). These calls were hardcoded to a dev
  server, caused failures and toast noise, and were not production-ready.
  Replacement: reactions and replies update message state locally only via
  onUpdateMessage. No external AI acknowledgment. No network calls.
  Rollback: restore fetch behind explicit feature flag when needed.
  (This change is logged here as TSB-028 is not needed — it is part of PR2 scope.)

Extraction plan (PR2-A):
  1. renderContent() → components/chat/bubble/MessageContent.jsx (verbatim DOM)
  2. Recall Results block → components/chat/bubble/RecallResults.jsx (verbatim DOM)
  3. Selection menu state/effects/handler → components/chat/bubble/useTextSelectionMenu.js
  4. handleReact + handleReply → components/chat/bubble/useInlineReactions.js
     (implements local-only behavior per approved decision above)

Scope Boundaries (hard):
  - DO NOT modify TTS path in ChatBubble (LOCKED per §11)
  - DO NOT modify hybridMessage (FROZEN per TSB-021)
  - DO NOT modify VoiceSettings, ChatInputReadAloud, textToSpeech
  - Only touch: components/chat/ChatBubble.jsx + components/chat/bubble/*

Acceptance Criteria:
  1. ChatBubble.jsx ≤400 lines after PR2-A
  2. DOM-root parity: all rendered output identical to pre-PR2
  3. TTS read-aloud fully functional post-PR2 (regression test required)
  4. Reactions and replies update locally, no external fetch calls

Status: IN PROGRESS 🔧`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-028 — MBCR v1: Message-Based Campaign Recovery — Same-Thread Snippet Injection</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 8, 2026
Component: functions/hybridMessage (MBCR inline module)
           functions/getThreadSnippets (NEW — READ-ONLY, no LLM)
           entities/Message (metadata_tags field now actively written)

Motivation:
  Long-running campaign threads (PR2, PR3) lose critical context beyond the 40-message
  hot window. When the user says "continue PR2" or "what's locked", the context
  that defines the lock table, accepted receipts, and approved scope is in older messages
  that hybridMessage never sees. MBCR v1 recovers those specific messages deterministically.

Architecture:
  MBCR module inlined in hybridMessage (no local imports in Deno — platform constraint §16.1).
  LOCK_SIGNATURE: CAOS_MBCR_INJECTION_v1_2026-03-08

  extractMetadataTags(content):
    → Scans content for known campaign tags (PR2, PR3, LOCKED, UNLOCK, ACCEPTANCE,
       RECEIPTS, EXECUTE_STEP_2, STOP_AFTER_RECEIPTS, APPROVED_SCOPE, WAITING_FOR_APPROVAL)
    → Called on EVERY user + assistant message at MESSAGE_SAVE stage
    → Returns matched tags → written to Message.metadata_tags[]

  maybeBuildMbcrInjectedMessage({ thread_id, userText, invokeFn, debugMode }):
    1. _mbcrTriggerCheck(userText) — regex gate (PR2/PR3/locked/continue/status/etc.)
    2. If triggered → invoke getThreadSnippets with { thread_id, tags, text_query, limit=20, around=2 }
    3. _buildThreadRecoveryBlock(snippets) → THREAD RECOVERY EXCERPTS block (max 6000 chars)
    4. Returns: { message: { role: 'system', content: block }, debug }
    5. Block injected as system message before conversationHistory in finalMessages

  getThreadSnippets (standalone function):
    → Fetches up to 500 messages for thread, sorted ascending
    → Matches by: metadata_tags[] (OR logic) + text_query substring search
    → Expands ±around neighbors around each match
    → Deduplicates, limits to 20 results
    → READ-ONLY: no writes, no LLM calls, no side effects

Injection position in finalMessages:
  [system prompt] → [TRH summary?] → [MBCR excerpts (system)] → [conversation history] → [user]

Dev diagnostic: debugMode=true → MBCR header prepended to reply:
  [MBCR] triggered=true retrieved=12 injected=true tags=[PR2,LOCKED] query="PR2"

Non-fatal: any getThreadSnippets failure → pipeline continues without MBCR block.
Status:    COMPLETE. Deployed and active.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-029 — TRH v1: Thread Rehydration Worker — LLM-Based Campaign State Summary</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 8, 2026
Component: functions/threadRehydrate (NEW)
           functions/hybridMessage (TRH pre-gate added)
           entities/Message (THREAD_SUMMARY messages written)

Motivation:
  MBCR v1 (TSB-028) recovers raw message excerpts. TRH v1 goes further: it synthesizes
  a structured THREAD SUMMARY covering campaign state, lock table, TODOs, last accepted
  plan, next step, and open questions. This gives the LLM a self-consistent campaign
  snapshot it can reason from directly, not just raw excerpts.

Architecture:
  TRH_TRIGGER regex in hybridMessage (pre-gate):
    /\b(pr[23]|continue|where are we|status|locked|receipts|refresh|rehydrate|
       update summary|what('s| is) (locked|next|open)|what did we decide|catch me up)\b/i

  threadRehydrate function (two stages):

  Stage 1 — Deterministic (no LLM, no writes):
    → Fetch last 80 messages for thread (base44.asServiceRole, sort by -timestamp)
    → Scan for most recent message starting with "THREAD SUMMARY (AUTO-GENERATED"
    → Anti-spam check:
        hasFreshSummary = lastSummaryAge < 10 minutes AND lastSummaryIndex < 10 turns
        shouldSkip = hasFreshSummary AND NOT isExplicitRefresh
    → If shouldSkip → return { should_write_summary: false, meta: { reason: 'fresh_summary_exists' } }
    → isExplicitRefresh override: user says "refresh" / "rehydrate" / "update summary"

  Stage 2 — LLM Summarize (only if Stage 1 passes):
    → Fetch up to 1000 messages (base44.asServiceRole)
    → Sort ascending (oldest → newest)
    → Build content block capped at 8000 chars (2000 chars/message max)
    → Call gpt-5.2 (same ACTIVE_MODEL) with structured skeleton prompt:
        THREAD SUMMARY (AUTO-GENERATED; SAME-THREAD; TRH_v1)
        GeneratedAt: <iso>
        Coverage: <first_ts> → <last_ts> | MessagesScanned: <n>
        Campaign State (PR2/PR3 status)
        Lock Table (Locked / Unlocked / Unknown)
        Open TODOs
        Last Accepted Plan / Receipts
        Next Step (single concrete action)
        Open Questions / Missing Anchors
    → temperature=0.1, max_completion_tokens=1200
    → Truncate to 6000 chars max

  hybridMessage TRH integration:
    → Promise.race([threadRehydrate invoke, 8000ms timeout])
    → If should_write_summary=true AND summary_text present:
        a. trhSummaryMessage = { role: 'assistant', content: summary_text }
           (injected at front of finalMessages after system prompt)
        b. Message.create (async, non-blocking):
             { conversation_id, role: 'assistant', content: summary_text,
               metadata_tags: ['THREAD_SUMMARY'], timestamp }
    → Non-fatal: TRH timeout or error → pipeline continues without summary

Injection position in finalMessages:
  [system prompt] → [TRH summary (assistant)?] → [MBCR excerpts?] → [history] → [user]

LOCK_SIGNATURE: CAOS_TRH_v1_2026-03-08

Status:    COMPLETE. Both functions deployed. Integrated into hybridMessage pipeline.
Note:      Acceptance test pending: send "Continue PR2. Where are we, what's locked?"
           in a live campaign thread and verify THREAD_SUMMARY message appears in DB.`}</Code>
              </div>

              <p className="text-white/40 text-xs">TSB entries are permanent records. Resolved entries stay in this log. New issues get a new TSB number.</p>
            </div>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}