import React from 'react';
import { Zap, Brain } from 'lucide-react';

/**
 * ModelSwitcherBar
 * Isolated provider/model toggle component.
 * Accepts: provider ('openai' | 'gemini'), onProviderToggle callback.
 * No backend logic, no STT/TTS, no send logic.
 */
export default function ModelSwitcherBar({ provider, onProviderToggle }) {
  const isGemini = provider === 'gemini';

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1.5">
      <Brain className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
      <button
        onClick={onProviderToggle}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
          isGemini
            ? 'bg-blue-500/20 border-blue-400/50 text-blue-200 hover:bg-blue-500/30'
            : 'bg-yellow-500/15 border-yellow-400/40 text-yellow-200 hover:bg-yellow-500/25'
        }`}
        title={`Engine: ${isGemini ? 'Gemini' : 'OpenAI'} — click to switch`}
      >
        <Zap className="w-3 h-3" />
        {isGemini ? 'Gemini' : 'OpenAI'}
      </button>
    </div>
  );
}