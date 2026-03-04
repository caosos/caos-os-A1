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
            <p className="text-gray-400 text-xs mt-1">A running log of real issues encountered during CAOS development, what caused them, and what fixed them.</p>
          </div>

          <Section title="TSB — Troubleshooting Bulletins (Known Issues and Fixes)" color="red">
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
        </div>
      </ScrollArea>
    </div>
  );
}