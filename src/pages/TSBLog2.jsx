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
          onClick={() => navigate('/TSBLog1')}
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
              <p><strong>Last TSB:</strong> TSB-052 (Mar 29, 2026)</p>
              <p><strong>Scope locks active:</strong><br/>
                — functions/hybridMessage: LOCKED (CAOS_HYBRID_MESSAGE_SPINE_v4_2026-03-15 + RIA_WRAPPER_v1_2026-03-23)<br/>
                — functions/core/promptBuilder: LOCKED (CAOS_PROMPT_BUILDER_v2_2026-03-05)<br/>
                — functions/core/geminiInference: LOCKED (CAOS_GEMINI_INFERENCE_v1_2026-03-29)<br/>
                — components/chat/ttsController.jsx: LOCKED (CAOS_TTS_CONTROLLER_v1_2026-03-14)<br/>
                — components/chat/ChatInputReadAloud.jsx: LOCKED (CAOS_GOOGLE_TTS_LOCK_v1_2026-03-15)</p>
              <p><strong>Active providers:</strong><br/>
                OpenAI: gpt-4o (default) | Gemini: models/gemini-2.5-flash<br/>
                Toggle: Engine menu in ChatHeader → persists to caos_session_provider</p>
              <p><strong>Canonical TTS paths:</strong><br/>
                Input bar = Google Web Speech API (ChatInputReadAloud.jsx)<br/>
                Message bubble = OpenAI TTS (ChatBubble.jsx → textToSpeech function)</p>
              <p><strong>Current focus:</strong> Gemini live, RIA tiered fallback wired, UI polish complete</p>
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
        </div>
      </ScrollArea>
    </div>
  );
}