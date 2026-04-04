import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Native Chrome/browser voices only — no API calls, no network dependency
// Reads from and writes to localStorage keys:
//   caos_google_voice        → voice.name (e.g. "Google US English")
//   caos_google_speech_rate  → speed (e.g. "1.0")

export default function VoiceSettingsMenu({ onClose }) {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(
    localStorage.getItem('caos_google_voice') || 'Google US English'
  );
  const [speed, setSpeed] = useState(
    parseFloat(localStorage.getItem('caos_google_speech_rate') || '1.0')
  );

  // Load native browser voices
  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      // Prefer Google voices first, then all English, then everything
      const google = all.filter(v => v.name.toLowerCase().includes('google'));
      const english = all.filter(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('google'));
      const rest = all.filter(v => !v.lang.startsWith('en') && !v.name.toLowerCase().includes('google'));
      setVoices([...google, ...english, ...rest]);
    };

    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const handleVoiceSelect = (voiceName) => {
    setSelectedVoice(voiceName);
    localStorage.setItem('caos_google_voice', voiceName);
  };

  const handleSpeedChange = (e) => {
    const v = parseFloat(e.target.value);
    setSpeed(v);
    localStorage.setItem('caos_google_speech_rate', v.toString());
  };

  const handlePreview = () => {
    window.speechSynthesis.cancel();
    const all = window.speechSynthesis.getVoices();
    const voice = all.find(v => v.name === selectedVoice);
    const utt = new SpeechSynthesisUtterance("Hey, this is how I sound.");
    utt.rate = speed;
    if (voice) utt.voice = voice;
    window.speechSynthesis.speak(utt);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Read Aloud Voice</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">Uses your browser's built-in voices — no API call, plays instantly.</p>

        {/* Speed */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Speed: <span className="text-blue-600 font-semibold">{speed.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speed}
            onChange={handleSpeedChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5x</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Voice list */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {voices.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Loading voices...</p>
            )}
            {voices.map((v) => (
              <button
                key={v.name}
                onClick={() => handleVoiceSelect(v.name)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                  selectedVoice === v.name
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="font-medium">{v.name}</span>
                <span className="ml-2 text-xs opacity-70">{v.lang}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            className="flex-1"
          >
            Preview
          </Button>
          <Button onClick={onClose} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}