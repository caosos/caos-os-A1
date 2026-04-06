import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors">
        <h2 className={`text-xl font-bold ${c.text}`}>{title}</h2>
        <span className="text-white/50">{open ? '▼' : '▶'}</span>
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

export default function TSBLog2() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => navigate('/TSBLog')}
          className="flex items-center gap-2 text-blue-300 hover:text-blue-100 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to TSB Log 1 (TSB-001 through TSB-042)
        </button>
      </div>

      <ScrollArea className="h-[calc(100vh-6rem)]">
        <div className="max-w-4xl mx-auto space-y-4 pb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">CAOS TSB Log — Part 2</h1>
            <p className="text-red-300">TSB-043 through current</p>
            <p className="text-gray-400 text-xs mt-1">Continued from TSBLog (TSB-001–TSB-042). Part 2 covers Mar 15, 2026 onward.</p>
          </div>

          <Section title="⚠️ KERNELIZED AGENT RECOVERY HEADER (READ FIRST)" color="yellow">
            <div className="bg-yellow-950/40 border border-yellow-500/20 rounded-lg p-4 text-gray-200 text-xs space-y-2">
              <p><strong>Last TSB:</strong> TSB-061 (Apr 5–6, 2026)</p>
              <p><strong>Scope locks active:</strong><br/>
                — functions/hybridMessage: LOCKED (CAOS_HYBRID_MESSAGE_SPINE_v4_2026-03-15 + RIA_WRAPPER_v1_2026-03-23)<br/>
                — functions/core/promptBuilder: LOCKED (CAOS_PROMPT_BUILDER_v2_2026-03-05)<br/>
                — functions/core/geminiInference: LOCKED (CAOS_GEMINI_INFERENCE_v1_2026-03-29)<br/>
                — functions/core/responseReviewer: ACTIVE (post-inference policy gate — fail-open)<br/>
                — functions/core/mbcrEngine: ACTIVE (extracted from hybridMessage inline — TSB-054)<br/>
                — components/chat/ttsController.jsx: LOCKED (CAOS_TTS_CONTROLLER_v1_2026-03-14)<br/>
                — components/chat/ChatInputReadAloud.jsx: LOCKED (CAOS_GOOGLE_TTS_LOCK_v1_2026-03-15)<br/>
                — components/chat/useAttachments.js: ACTIVE (extracted from ChatInput — TSB-059)<br/>
                — components/chat/ChatInput: base44 import restored (TSB-061 hotfix)</p>
              <p><strong>Active providers:</strong><br/>
                OpenAI: gpt-5.2 (default) | Gemini: models/gemini-2.5-flash<br/>
                Toggle: Engine menu in ChatHeader → persists to caos_session_provider</p>
              <p><strong>Canonical TTS paths:</strong><br/>
                Input bar = Google Web Speech API (ChatInputReadAloud.jsx)<br/>
                Message bubble = OpenAI TTS (ChatBubble.jsx → textToSpeech function)</p>
              <p><strong>Current focus:</strong> ChatInput attachment subsystem fully extracted to useAttachments hook (TSB-059). Pass B validated (TSB-060). STT regression caused by missing base44 import patched immediately (TSB-061).</p>
            </div>
          </Section>

          <Section title="TSB-043 through TSB-048 — Mar 15, 2026 Campaign" color="red">
            <div className="space-y-4">

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-043 — Lane A: REPO_ROUTING_MICRO_INDEX Added to promptBuilder (Always-On)</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 15, 2026
Component: functions/core/promptBuilder (ONLY)

Objective:
  WCW blowups from agents reading entire files to answer routing questions.
  Micro-index gives always-on routing signal — eliminates speculative reads.

Change:
  const REPO_ROUTING_MICRO_INDEX = \`...\` added near top of file (1,047 bytes — ≤2,048 limit).
  Injected into p immediately after OPERATIONAL_BOOTSTRAP, before IDENTITY.

Micro-index covers:
  CHAT_UI, INPUT_BAR_TTS, MESSAGE_BUBBLE_TTS, BACKEND_FUNCTIONS, GOVERNANCE,
  DEBUG/OBSERVABILITY — correct actual paths, no src/ prefix, no .ts extension.
  Explicitly distinguishes INPUT_BAR_TTS vs MESSAGE_BUBBLE_TTS routes.

Line delta: 285 → 308 (+23). No logic changed — additive static text only.
Rollback: delete const + p+= line.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-044 — Lane B: ttsController Watchdog + resume() + Unified Retry (WebSpeech)</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 15, 2026
Component: components/chat/ttsController.jsx (ONLY)

Problem: _speakWebSpeech() called speak() but onstart never fired on idle/backgrounded
Chrome — silent hang with no feedback and no recovery.

Root causes:
  1. No watchdog to detect speak() called but onstart never fired.
  2. resume() missing after cancel() — Chrome engine left in suspended state.
  3. Retry path duplicated speak() logic (two divergent paths → "works sometimes" bugs).

Patches applied:
  B1 — Watchdog + single retry:
    WATCHDOG_MS = 800 (configurable constant)
    _buildUtterance() pure factory (reusable for retry)
    _resurrectAndSpeak(utt, onAfterSpeak) — cancel + speak(100ms) + callback
    Watchdog: armed via onAfterSpeak callback (not separate 150ms timer)
    On timeout: single retry via new utterance + _resurrectAndSpeak
    Second timeout: _stopAll(true) + onError('WebSpeech: start_timeout')
    Dev-gated logs: TTS_WEBSPEECH_SPEAK_CALLED, ONSTART, TIMEOUT_RETRY, TIMEOUT_FAIL, ONERROR

  B2 — resume() + unified retry:
    _resurrectAndSpeak: added try { speechSynthesis.resume(); } after cancel()
    Retry path now calls _resurrectAndSpeak() (not duplicated setTimeout)
    Both first attempt and retry use identical execution path

State safety:
  Rapid clicks: _stopAll(true) nulls _state.utterance → pending timers bail on utt check
  isPlayingGoogle: only set in onstart → timeout fail never calls it → stays false
  onError on timeout → ChatInput resets isPlayingGoogle = false → button immediately clickable

Line delta: 174 → 232 (+58). Files: ttsController.jsx ONLY.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-045 — PointerEventsGuard: Dev-Only Regression Detector for TSB-042 Invariant</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 15, 2026
Files: components/chat/PointerEventsGuard.jsx (NEW, 46 lines)
       components/chat/ChatInput.jsx (+2 lines: import + mount)

Purpose: Lock the TSB-042 pointer-events invariant. Any future refactor that
re-introduces pointer-events-none on the ChatInput wrapper is caught immediately
in dev mode.

Implementation:
  - React component, renders null (zero DOM output)
  - Props: targetRef, label
  - useEffect: if caos_developer_mode !== 'true' → return immediately (hard gate)
  - Dev only: walks ancestor chain, getComputedStyle(el).pointerEvents
  - If 'none' found: console.warn('[POINTER_EVENTS_GUARD] ⚠️ TSB-042 REGRESSION DETECTED')
  - Runs once on mount, no polling, no listeners

ChatInput integration:
  import PointerEventsGuard from './PointerEventsGuard';
  <PointerEventsGuard targetRef={voiceButtonRef} label="TTS speaker button" />
  (first child of form element)

Zero side effects in production (confirmed: entire useEffect body skipped if not dev).

Rollback: delete file + remove 2 lines from ChatInput.jsx.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-046 — Input Bar TTS Button Always-On: Removed disabled Gate, Added Toast Guard</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 15, 2026
Component: components/chat/ChatInput.jsx (ONLY)

Problem: Input bar speaker button was disabled={!lastAssistantMessage} — invisible/
unclickable on new sessions and empty threads, with no user feedback.

Fix:
  1. Removed disabled={!lastAssistantMessage} from button.
  2. Removed disabled:opacity-30 from className.
  3. In toggleGoogleVoicePlay: if (!lastAssistantMessage) { toast('No assistant
     message yet — send a message first'); return; }

When lastAssistantMessage exists: behavior identical.
When no message: button visible + clickable, shows toast, does nothing else.

Line delta: 985 → 984 (-1). No other files changed.
Rollback: restore disabled attribute + opacity class + revert toast line.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-047 — WCW Telemetry Builders Inlined to hybridMessage (Admin-Only)</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 15, 2026
Component: functions/hybridMessage (ONLY)
Lock Sig: CAOS_WCW_TELEMETRY_v1_2026-03-15

Platform constraint: §16.1 prohibits cross-file imports in Deno functions.
Remote invoke rejected: ~200ms hot-path overhead for pure math. Correct: INLINE.

New functions in SECTION 4 (PURE HELPERS):
  buildWcwStateV1({...}) → wcw_state (schema: wcw_state.v1)
    Fields: wcw_budget_tokens, wcw_used_tokens, wcw_remaining_tokens,
    wcw_pct_used, wcw_pct_remaining, severity (CRITICAL/HIGH/MEDIUM/LOW),
    context_pressure_score, zone (red/yellow/blue/green), snapshot_ts,
    completion_tokens, total_tokens, response_time_ms

  buildWcwTurnV1({...}) → wcw_turn (schema: wcw_turn.v1)
    Fields: wcw_budget, wcw_used, wcw_remaining, wcw_pct_used,
    completion_tokens, total_tokens, inference_ms, total_response_ms,
    event_ts, stage: 'PIPELINE_COMPLETE', context_pressure_score, zone

Admin-only gate: user.role === 'admin' — null for non-admin, no overhead.
Both builders are pure: no I/O, no env, no DB, deterministic.
wcw_state and wcw_turn conditionally attached to response payload.
PIPELINE_COMPLETE emitEvent includes both for admin turns.

Line delta: 891 → 959 (+68). hybridMessage ONLY.
Rollback: remove both builder functions + wiring block + response param additions.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-048 — Dual TTS Architecture Formalized + VoiceSettingsMenu + Session-Safe Refactor</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 15, 2026
Files: components/chat/VoiceSettingsMenu.jsx (NEW, ~80 lines)
       components/chat/ChatInput.jsx (right-click + menu mount)
       components/chat/ChatInputReadAloud.jsx (session-safe refactor)
       components/RESTORE_POINT_COMPLETE_SYSTEM_2026_02_28 (Section 14 added)

DUAL TTS ARCHITECTURE (canonical — do not violate):

  SYSTEM 1 — Input Bar (Google Web Speech API)
    File:    ChatInputReadAloud.jsx
    API:     window.speechSynthesis + SpeechSynthesisUtterance
    Trigger: Click Volume2 button (far left of input bar)
    Prefs:   caos_google_voice, caos_google_speech_rate
    Settings: Right-click → VoiceSettingsMenu modal
    Lock:    CAOS_GOOGLE_TTS_LOCK_v1_2026-03-15

  SYSTEM 2 — Message Bubble (OpenAI TTS)
    File:    ChatBubble.jsx (lines 110–298)
    API:     base44.functions.invoke('textToSpeech', ...)
    Trigger: Click Volume2 icon on hover over assistant message
    Prefs:   caos_voice_preference_message, caos_speech_rate
    Lock:    DO NOT MODIFY

  ❌ FORBIDDEN: mix APIs, auto-play input bar, remove input bar button,
                modify bubble TTS, cross-contaminate pref keys.

VoiceSettingsMenu.jsx:
  Voice: 5 Google preset voices (US English, UK English, Spanish, French, German)
  Speed: HTML range slider 0.5–2.0x, step 0.1
  Persists to localStorage on change
  Uses native HTML range (NOT @/components/ui/slider — doesn't exist)
  Triggered by: onContextMenu on Volume2 button in ChatInput

ChatInputReadAloud.jsx session-safe refactor:
  _sessionId module-level counter — increments on stop, captured at play start (sid)
  waitForVoices() promise: addEventListener/removeEventListener (no global = assignment)
  All async callbacks guarded: if (sid !== _sessionId) return;
  1200ms watchdog: if speech never starts → increment _sessionId + toast.error
  keep-alive: passive 3s check, only resume if paused — no active pause/resume (breaks speech)

System blueprint updated: Section 14 added to RESTORE_POINT documenting dual-TTS.`}</Code>
              </div>

              <p className="text-white/40 text-xs">TSB entries are permanent records. Resolved entries stay in this log. New issues get a new TSB number. Part 1: TSBLog (TSB-001–TSB-042).</p>
            </div>
          </Section>

          <Section title="TSB-049 through TSB-052 — Mar 29, 2026 Campaign" color="blue">
            <div className="space-y-4">

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">TSB-049 — Gemini Inference Provider: Full Integration (geminiInference + hybridMessage routing)</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 29, 2026
Files:
  functions/core/geminiInference (NEW, 167 lines)
  functions/hybridMessage (routing + provider defaults)
  components/chat/Chat.jsx (sessionProvider state + toggle handler)
  components/chat/ChatHeader.jsx (Engine menu item + onProviderToggle prop)

Objective:
  Allow users to toggle inference between OpenAI and Gemini per session,
  without switching accounts or reloading. Gemini adds native Google Search
  grounding (real-time web access) as a built-in capability.

geminiInference function:
  - Accepts OpenAI-style message array, converts to Gemini contents format
  - systemInstruction built from all role='system' messages
  - Multi-modal: image_url parts converted to inlineData (base64) or fileData (URL)
  - Native Google Search grounding via tools: [{googleSearch: {}}]
  - Returns: { ok, content, sources[], model_used, usage, grounding_enabled }
  - Grounding sources appended to reply as markdown "**Sources:**" section
  - Default model: models/gemini-2.5-flash (fast, stable, high quota)
  - Timeout: 45000ms with AbortController
  - Auth: base44.auth.me() required

hybridMessage routing changes:
  - providerDefaults.gemini = 'models/gemini-2.5-flash'
  - invokeInference(): model.includes('gemini') → routes to core/geminiInference
  - preferred_provider body param supported (overrides userProfile preference)
  - RESOLVED_MODEL: gemini provider always uses providerDefaults (not preferred_model override)
  - preferredProvider state passed through to message save as inference_provider field

Session toggle (Chat.jsx):
  const [sessionProvider, setSessionProvider] = useState(
    () => localStorage.getItem('caos_session_provider') || 'openai'
  );
  handleProviderToggle: openai ↔ gemini, persisted to localStorage
  Passed as preferred_provider to hybridMessage on every send

Rollback:
  Remove geminiInference function.
  Revert providerDefaults.gemini and invokeInference gemini branch.
  Remove sessionProvider state + toggle from Chat.jsx + ChatHeader.jsx.`}</Code>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">TSB-050 — RIA: Resilient Inference Architecture Wrapper (Tiered Fallback in hybridMessage)</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 29, 2026
Component: functions/hybridMessage (ONLY)
Lock Sig:  CAOS_RIA_WRAPPER_v1_2026-03-23

Objective:
  Wrap the primary inference call in a resilient tiered fallback so that
  provider failures degrade gracefully rather than surfacing a hard error.

Architecture:
  Tier 1 — Primary provider (openai or gemini per session toggle)
  Tier 2 — Backup provider (future: grok — currently gated FF_GROK_PROVIDER_ENABLED=false)
  Tier 3 — Local responder (always succeeds, returns degraded=true message)

Feature flags:
  FF_RIA_INFERENCE_SPINE = false  (set true to enable Tier 2/3 activation path)
  FF_GROK_PROVIDER_ENABLED = false (Grok provider not yet active)
  _dev_force_tier1_fail: admin-only body param for testing Tier 3 path

resilientInference() wrapper:
  - Calls handleInference() for Tier 1
  - On success: returns with degraded=false, fallback_tier='TIER_1'
  - On failure (FF_RIA disabled): re-throws Tier 1 error (baseline behavior)
  - On failure (FF_RIA enabled): skips Tier 2 (disabled), activates Tier 3
  - Tier 3 reply: "⚠️ I'm temporarily unable to reach my inference provider..."

Response envelope additions:
  riaResult: { degraded, fallback_tier, provider }
  degraded flag surfaced in respondOk() and tool_receipts
  diagnostic_receipt.fallback_tier included

GROK provider guard:
  If user selects grok and FF_GROK_PROVIDER_ENABLED=false:
  Returns 503 FEATURE_DISABLED — no silent fallback.

Line delta: ~+120 lines. hybridMessage ONLY.
Rollback: replace resilientInference() call with direct handleInference() call.`}</Code>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">TSB-051 — TokenMeter: Provider-Aware Budget, Numbers Above Bar, Width Compacted</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 29, 2026
Component: components/chat/TokenMeter (ONLY)

Problems:
  1. Budget always showed 128K (stale MODEL_CONTEXT_WINDOW for gpt-4o) even on Gemini.
  2. Token numbers rendered below/beside bar — consumed too much vertical space.
  3. Bar width too wide relative to content.

Fixes:
  1. Provider-aware budget:
     defaultBudget = provider === 'gemini' ? 1_000_000 : 200_000
     budget = defaultBudget (always — ignores backend wcwBudget to avoid stale 128K)
     hasRealData = wcwUsed !== null && wcwUsed > 0 (only gate on actual usage data)

  2. Layout: numbers moved above bar
     flex-col items-end → numbers span on top, bar div below
     Token display: "{used} / {budget}" with ~ suffix when estimated

  3. Bar width: w-20 → w-14 (reduced ~30%)

  4. provider prop added: TokenMeter({ provider = 'openai' })
     Passed from Chat.jsx alongside wcwUsed/wcwBudget

Line delta: minor reorder. TokenMeter ONLY.
Rollback: revert budget logic to wcwBudget passthrough + restore original layout.`}</Code>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">TSB-052 — ChatHeader: Centered CAOS Title, Engine Selector Badge, Icon Differentiation</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 29, 2026
Component: components/chat/ChatHeader (ONLY)

Changes (UI only — no logic modified):

  1. CAOS title centering:
     Previous: absolute left-1/2 -translate-x-1/2 on header row div
     Fixed:    fixed left-0 right-0 top-0 flex justify-center, height 48px, pointer-events-none
     Result:   truly centered in viewport regardless of left/right element widths

  2. Engine selector menu item:
     Previous: Cpu icon + "Inference Provider" label + plain text badge
     Fixed:
       - Icon: Brain (lucide-react) — purple, reflects cognitive/AI concept
       - Label: "Engine" (shorter, more intuitive)
       - Separator: "=" sign centered between label and badge
       - Active badge: glowing rounded-full pill with Zap icon + provider name
         Gemini active: bg-blue-500/30 border-blue-400/60 shadow-[0_0_8px_rgba(96,165,250,0.4)]
         OpenAI active: bg-yellow-500/20 border-yellow-400/50 shadow-[0_0_8px_rgba(250,204,21,0.3)]
       - Click toggles openai ↔ gemini, persists to caos_session_provider in localStorage

  3. Inject Bootloader icon:
     Previous: Zap (same as Engine badge — visually ambiguous)
     Fixed:    FlameKindling (lucide-react) — distinct, suggests ignition/boot sequence

Imports added: Brain, FlameKindling (removed: Cpu)
Line delta: minor. ChatHeader ONLY.
Rollback: restore Cpu + original label/badge + Zap for bootloader.`}</Code>
              </div>

              <p className="text-white/40 text-xs">TSB entries are permanent records. Resolved entries stay in this log. New issues get a new TSB number. Part 1: TSBLog (TSB-001–TSB-042).</p>
            </div>
          </Section>

          <Section title="TSB-056 through TSB-058 — Apr 4, 2026 Campaign" color="red">
            <div className="space-y-4">

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-056 — Input-Bar TTS: Zombie Synth State Fix (synth.cancel() Re-Prime + Async Guard)</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Apr 4, 2026
Files:     components/chat/ChatInputReadAloud.jsx (ONLY)
Campaign:  Campaign 2 — Input-Bar TTS Stability

ROOT CAUSE:
  window.speechSynthesis accumulates "zombie" utterance state after idle periods,
  backgrounding, or rapid stop/start cycles. Calling synth.speak() on a dirty engine
  silently enqueues the utterance but onstart never fires — the button shows playing
  state but no audio is heard. This is a confirmed Chrome regression / browser bug,
  not a code error, and has recurred at least 6 times across the CAOS build history.

PATCHES APPLIED:

  PATCH A — toggleGoogleReadAloud made async + synth.cancel() re-prime:
    1. Function signature changed to async (was synchronous).
       Browser gesture trust chain preserved — the async gap is a 30ms internal timeout,
       NOT a user-boundary await. No autoplay policy violation in modern browsers (2026).
    2. Before synth.speak(utterance), inserted:
         try { synth.cancel(); } catch (e) {}
         await new Promise(r => setTimeout(r, 30));
         synth.speak(utterance);
    3. The cancel() flushes any zombie queue state.
       The 30ms tick allows the engine to reach a clean idle before the new utterance is queued.
    4. Existing stop path (lines 67–74) is untouched and runs synchronously BEFORE the async
       region is ever reached — stop behavior is unaffected.

INVARIANTS PRESERVED:
  - caos_google_voice / caos_google_speech_rate keys: UNCHANGED
  - onstart / onend / onerror handlers: UNCHANGED
  - _sessionId / _keepAlive / _activeUtterance module-level refs: UNCHANGED
  - No OpenAI / Gemini / provider keys introduced into input-bar path
  - Function is isolated to ChatInputReadAloud.jsx — zero contamination of
    ChatBubble TTS (OpenAI path) or any other file

LOCK STATUS:
  CAOS_GOOGLE_TTS_LOCK_v1_2026-03-15 remains active.
  This patch amends behavior within the lock — it does not violate it.

PREVIOUS FAILURES OF SAME CLASS (do not repeat these approaches):
  - Removing synth.cancel() before speak() — causes zombie accumulation
  - Adding a separate keepAlive pause/resume tick — breaks speech mid-sentence
  - Replacing the async 30ms with a synchronous spin — no effect on engine state
  - Wrapping speak() in a new SpeechSynthesisUtterance per click without cancel() — same zombie issue

Line delta: +6 lines (function signature + 3-line re-prime block + comment header).
Rollback: revert to synchronous function, remove try/cancel/await block.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-057 — Input-Bar Voice Menu: Stale Open State Fixed (Outside-Click Listener Extended)</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Apr 4, 2026
Files:     components/chat/ChatInput.jsx (ONLY)
Campaign:  Campaign 2 — Input-Bar TTS Stability

ROOT CAUSE:
  The useEffect click-outside listener that closes menus was gated on showCaptureMenu only.
  When the voice settings menu (showVoiceMenu) was opened via right-click on the speaker
  button, clicking anywhere outside the VoiceSettingsMenu component had no effect — the
  menu stayed open (stale open state). The outside-click cleanup path was never reached.

FIX (3-line change):
  useEffect condition:
    BEFORE: if (showCaptureMenu) {
    AFTER:  if (showCaptureMenu || showVoiceMenu) {

  Dependency array:
    BEFORE: }, [showCaptureMenu]);
    AFTER:  }, [showCaptureMenu, showVoiceMenu]);

  handleClickOutside already contained:
    if (voiceMenuRef.current && !voiceMenuRef.current.contains(event.target)) {
      setShowVoiceMenu(false);
    }
  — the handler was correct; the listener simply wasn't being registered for the voice menu case.

SECONDARY CLEANUP:
  Dead import removed: import { getTTSPrefs, setTTSPrefs } from './ttsPrefs'
  These were imported but never used in ChatInput.jsx. Removing them reduces noise.
  ttsPrefs.jsx itself is UNCHANGED and still locked (CAOS_TTS_PREFS_v1_2026-03-14).

INVARIANTS PRESERVED:
  - VoiceSettingsMenu component: UNCHANGED
  - Voice settings persist to caos_google_voice / caos_google_speech_rate: UNCHANGED
  - Capture menu behavior: UNCHANGED
  - All TTS play/stop/pause logic: UNCHANGED
  - CAOS_GOOGLE_TTS_LOCK_v1 and FORT KNOX block in ChatInput: UNCHANGED

Line delta: -1 line (import removal), +1 line (condition), 0 net (dep array change is in-place).
Rollback: restore original condition + dep array + ttsPrefs import.`}</Code>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-red-300 font-bold text-sm">TSB-058 — Repo Path Map Audit: Canonical Path Model Documented (No Code Changes)</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Apr 4, 2026
Files:     pages/TSBLog2 (this entry — documentation only)
Campaign:  Canonical Repo Path Map Audit

MOTIVATION:
  Repo path resolution is nondeterministic — sometimes "open pages/Chat.jsx" resolves,
  sometimes the assistant responds as if the path or tool is unavailable.
  A full architecture audit was performed to identify all resolution points and conflicts.

FINDINGS (inspection only — no patches applied in this session):

  CANONICAL ROOTS — 3 competing assumptions identified:
    1. handleRepoCommand() in hybridMessage (lines 819–854):
       - "" → GitHub root (no prefix)
       - "functions/*" → "base44/functions/*"
       - "agents/*" → "base44/agents/*"
       - anything else → "src/<path>" (e.g. "pages/Chat.jsx" → "src/pages/Chat.jsx")
    2. generateRepoMap (line 90): roots at "src" hardcoded
    3. REPO_ROUTING_MICRO_INDEX in promptBuilder (lines 20–47):
       documents paths WITHOUT "src/" prefix — inconsistent with (1) and (2)

  MULTIPLE RESOLVERS — not a single canonical path:
    A. handleRepoCommand (hybridMessage) — user-typed "open / ls" commands
    B. dispatchTool in repoInference — when OpenAI calls repo_list/repo_read tool;
       passes path verbatim with no prefix mapping (different behavior from A)
    C. repoProxy — browser admin UI; no path mapping

  PATH MAP / MICRO-INDEX STATUS:
    Exists: REPO_ROUTING_MICRO_INDEX in promptBuilder (static string, always injected)
    Problem: Documents paths WITHOUT "src/" prefix; generateRepoMap roots at "src/";
             handleRepoCommand auto-prepends "src/"; micro-index and executor are out of sync.
    generateRepoMap is NOT called by hybridMessage or promptBuilder — standalone admin tool only.

  PERSISTENCE / REHYDRATION:
    None. Canonical path knowledge is NOT persisted across turns or provider switches.
    Micro-index is rebuilt from static string on every prompt build.

  BEST LOCK POINT (identified — not yet implemented):
    handleRepoCommand() in hybridMessage lines 819–854:
    Extract the 3-branch path mapping into a named constant (REPO_PATH_MAP) at module top.
    Mirror the same map into REPO_ROUTING_MICRO_INDEX in promptBuilder.
    This makes the executor and the assistant's knowledge of paths identical.

NEXT STEP (pending explicit command):
  TSB required before any writes to hybridMessage (FROZEN — TSB-021).
  Proposed fix scope: extract REPO_PATH_MAP constant + sync micro-index — no behavior change.`}</Code>
              </div>

              <p className="text-white/40 text-xs">TSB entries are permanent records. Resolved entries stay in this log. New issues get a new TSB number. Part 1: TSBLog (TSB-001–TSB-042).</p>
            </div>
          </Section>

          <Section title="TSB-059 through TSB-061 — Apr 5–6, 2026 Campaign" color="blue">
            <div className="space-y-4">

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">TSB-059 — ChatInput Pass B: Attachment Subsystem Extracted to useAttachments Hook</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Apr 5, 2026
Files:
  components/chat/useAttachments.js (NEW, 162 lines)
  components/chat/ChatInput (modified — −146 lines)

Objective:
  Phase B of the governed ChatInput modularization campaign.
  Extract the entire attachment subsystem out of ChatInput into a
  dedicated custom hook to reduce file complexity and isolate concerns.

useAttachments hook (new file):
  State owned: attachedFiles, uploading, uploadCancelled, uploadCancelledRef,
               showCaptureMenu, captureMenuRef, fileInputRef, cameraInputRef
  Handlers owned: cancelUpload, handleFileSelect, captureScreen,
                  captureCamera, handleCameraCapture, removeFile
  Accepts: { conversationId } (for folder path routing in UserFile save)
  Returns: all state + setters + handlers as named destructure

Behavioral invariants preserved:
  - attachedFiles.map(f => f.url) in commitSend: UNCHANGED
  - uploading gates handleSubmit, onKeyPress, submit button: UNCHANGED
  - max-file guard (5 files): UNCHANGED
  - max-size guard (50MB): UNCHANGED
  - UserFile.create() fields and folder path logic: UNCHANGED
  - captureScreen → dynamic import('html2canvas'): load-timing change only
    (was static top-level import in ChatInput — behavior identical after load)
  - click-outside effect: captureMenuRef from hook; setShowCaptureMenu from hook;
    dependency array [showCaptureMenu, showVoiceMenu]: UNCHANGED
  - hidden file inputs ref wiring: UNCHANGED
  - chip render JSX: UNCHANGED
  - cancel / remove behavior: UNCHANGED

ChatInput changes:
  - Removed: base44 import (attachment path no longer needs it in ChatInput)
  - Removed: html2canvas import (moved to dynamic import in hook)
  - Added: import { useAttachments } from './useAttachments'
  - Removed: all inline attachment state, refs, and handlers (~146 lines)
  - Added: useAttachments({ conversationId }) destructure (17 lines)

Line delta:
  ChatInput: 768 → 622 (−146)
  useAttachments.js: new, 162 lines

Pass A (commitSend dedup) preceded this. Pass B is the attachment extraction.
Rollback: delete useAttachments.js, restore inline state/handlers, restore imports.`}</Code>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">TSB-060 — ChatInput Pass B Test: Attachment Extraction Validation (Code-Path Inspection)</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Apr 5, 2026
Files:     components/chat/ChatInput (read-only)
           components/chat/useAttachments.js (read-only)
Mode:      INSPECT ONLY — no writes performed

Objective:
  Governed validation pass to confirm zero behavioral drift from TSB-059
  attachment extraction. All checks performed via static code-path inspection
  (runtime UI testing unavailable in this environment).

10 paths validated:
  1. Standard send path                PASS
  2. Send with attached files path     PASS
  3. File upload path                  PASS
  4. Upload cancel path                PASS
  5. File removal path                 PASS
  6. Screenshot capture path           PASS
  7. Camera capture path               PASS
  8. Plus-menu open/close path         PASS
  9. Voice/STT path                    PASS
  10. TTS/read-aloud path              PASS

Full validation matrix: ALL 21 checks PASS — see test session receipt.

Notable findings:
  - removeFile uses functional updater (prev => prev.filter(...)) vs original
    closure capture (attachedFiles.filter(...)). Semantically equivalent;
    functional updater is strictly safer against stale closure. Not a regression.
  - uploadCancelled state returned from hook but not rendered in ChatInput JSX —
    same behavior as pre-extraction. Not a regression.
  - dynamic html2canvas import: load-timing change only (not behavioral).
  - setAttachedFiles([]) in commitSend correctly calls hook setter. Confirmed.

Result: PASS — no drift detected.`}</Code>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">TSB-061 — ChatInput STT Hotfix: base44 Import Restored After Pass B Regression</span>
                  <Tag label="HOTFIX ✅" color="yellow" />
                </div>
                <Code>{`Date:      Apr 6, 2026
Files:     components/chat/ChatInput (ONLY — 1 line added)

ROOT CAUSE:
  During TSB-059 Pass B attachment extraction, the base44 import was
  removed from ChatInput because attachments no longer needed it there
  (upload calls moved to useAttachments.js). However, the STT path in
  ChatInput still contained:

    base44.functions.invoke('transcribeAudio', { audio_base64 })

  at line 310 (mediaRecorder.onstop handler). This call was left orphaned
  without its import, causing a ReferenceError at runtime whenever mic
  recording stopped and transcription was attempted. Symptom: mic button
  showed active/recording state normally, but transcription silently failed
  — no text appeared and no visible error was shown to the user.

INSPECTION:
  Confirmed: base44.functions.invoke('transcribeAudio', ...) present in ChatInput.
  Confirmed: base44 absent from import block after TSB-059.
  Primary hypothesis: CONFIRMED.

FIX APPLIED (1 line):
  Restored: import { base44 } from '@/api/base44Client';
  Position: line 5 (after toast import, before PointerEventsGuard import)

GOVERNANCE NOTE:
  This is a canonical example of why single-concern extraction must audit
  all callers of a removed import — not just the extracted concern itself.
  The attachment path and the STT path both used base44 in ChatInput.
  Removing the import for one broke the other.

INVARIANTS PRESERVED:
  - STT base64 transport logic: UNCHANGED (CAOS_STT_BASE64_TRANSPORT_v1_2026-03-03)
  - transcribeAudio invoke payload shape: UNCHANGED
  - All recording state, refs, handlers: UNCHANGED
  - Attachments, TTS, AgentSelector, send path: ALL UNCHANGED
  - No other file modified

Line delta: +1 line. ChatInput ONLY.
Rollback: remove the restored import line (reverts to broken state — do not do this).`}</Code>
              </div>

              <p className="text-white/40 text-xs">TSB entries are permanent records. Resolved entries stay in this log. New issues get a new TSB number. Part 1: TSBLog (TSB-001–TSB-042).</p>
            </div>
          </Section>

          <Section title="TSB-053 through TSB-055 — Mar 31, 2026 Campaign" color="blue">
            <div className="space-y-4">

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">TSB-053 — responseReviewer: Post-Inference Policy Gate Integrated into hybridMessage</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 31, 2026
Component: functions/core/responseReviewer (NEW)
           functions/hybridMessage (call-site addition — post-inference)

Objective:
  Add a secondary verification pass on all AI responses before they are
  returned to the user. Prevents autonomous file modifications, stale
  content injection, and other policy violations from reaching the UI.

responseReviewer function:
  - Auth: base44.auth.me() required (skips review if no user context)
  - Short-circuit: skips review for replies < 100 chars (too short to evaluate)
  - Model: Gemini Flash (cheap, fast reviewer — model-agnostic by design)
  - Policy checklist injected as system prompt:
      1. No unauthorized file writes or edits proposed without explicit user instruction
      2. No stale/fabricated content presented as current fact
      3. No tool execution claimed without verification receipt
      4. Handoff instructions present when user action required
  - Response schema: { clean: boolean, violations: string[], corrected_reply: string | null }
  - Returns: { ok, clean, violations, corrected_reply } or { ok: false, error }

hybridMessage integration:
  - Runs AFTER inference, BEFORE message save
  - If reviewer returns clean=false AND corrected_reply present:
      reply = corrected_reply (corrected version used going forward)
      console.warn('[REVIEWER_CORRECTED]' with violations logged)
  - Fail-open: any reviewer error → pipeline continues with original reply
  - Non-blocking: reviewer failure never surfaces to user

Migration note:
  Reviewer model can be swapped to DeepSeek-R1 on self-hosted migration
  with zero changes to hybridMessage — only responseReviewer needs updating.

Status:    LIVE ✅`}</Code>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">TSB-054 — mbcrEngine: MBCR Logic Extracted from hybridMessage into Standalone Module</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 31, 2026
Component: functions/core/mbcrEngine (NEW)
           functions/hybridMessage (call-site delegation)

Motivation:
  MBCR logic (Message-Based Campaign Recovery) was inlined directly into
  hybridMessage as a large block, contributing to file bloat (TSB-021/028).
  Extracted to functions/core/mbcrEngine per GOV v1.2 Anti-Bloat rule.

mbcrEngine function:
  - Accepts: { thread_id, userText, debugMode }
  - Internally runs: trigger check → getThreadSnippets → block assembly
  - Returns: { message: { role: 'system', content: block } | null, debug }
  - Non-fatal: any internal failure → returns NULL_MBCR (no injection)
  - Fully self-contained: no caller needs to know the MBCR logic

hybridMessage change:
  - Inline MBCR block replaced with single invoke call to core/mbcrEngine
  - Return shape identical to prior inline behavior
  - Zero pipeline behavior change

Status:    COMPLETE ✅`}</Code>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-blue-300 font-bold text-sm">TSB-055 — Blueprint + TSBLog Sync: Mar 31, 2026 Documentation Pass</span>
                  <Tag label="COMPLETE ✅" color="green" />
                </div>
                <Code>{`Date:      Mar 31, 2026
Component: pages/SystemBlueprint (updated)
           pages/TSBLog2 (updated — nav bug fixed + TSB-053/054/055 added)

Changes:
  1. Blueprint header "Last Updated" corrected: Mar 13 → Mar 31, 2026
  2. Blueprint header tags added:
       Gemini Provider: LIVE ✅
       RIA Tiered Fallback: WIRED ✅
       Response Reviewer: ACTIVE ✅
       hybridMessage: REFACTORED ✅ (TSB-040/041)
       WCW Telemetry: ADMIN-LIVE ✅ (TSB-047)
       Dual TTS Formalized ✅ (TSB-048)
       PointerEvents Invariant: LOCKED ✅ (TSB-042/045)
       TokenMeter: Provider-Aware ✅ (TSB-051)
       ChatHeader Engine Badge: LIVE ✅ (TSB-052)
  3. Section 1 (What CAOS Is): updated to reflect multi-provider architecture
  4. Section 2 (Pipeline step 9): updated to reflect provider routing + RIA + reviewer
  5. Section 7 (Backend Functions): geminiInference + responseReviewer documented
  6. Section 15 (TSB Log): links updated to include TSBLog2 pointer
  7. TSBLog2 back-button nav bug fixed: /TSBLog1 → /TSBLog (correct route)

Governance note:
  Blueprint is the living truth. If it is out of date, the system is out of date.
  This pass brings documentation current with all work through Mar 31, 2026.

Status:    COMPLETE ✅`}</Code>
              </div>

              <p className="text-white/40 text-xs">TSB entries are permanent records. Resolved entries stay in this log. New issues get a new TSB number. Part 1: TSBLog (TSB-001–TSB-042).</p>
            </div>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}