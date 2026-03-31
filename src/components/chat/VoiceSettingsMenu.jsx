import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VoiceSettingsMenu({ onClose }) {
  const [ttsProvider, setTtsProvider] = useState(localStorage.getItem('caos_tts_provider') || 'openai');
  const [speed, setSpeed] = useState(parseFloat(localStorage.getItem('caos_speech_rate') || '1.0'));
  
  // OpenAI voices
  const openaiVoices = ['nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer'];
  const [openaiVoice, setOpenaiVoice] = useState(localStorage.getItem('caos_voice_preference_message') || 'nova');
  
  // Gemini voices
  const geminiVoices = ['Aoede', 'Charon', 'Fenrir', 'Kore', 'Orpheus'];
  const [geminiVoice, setGeminiVoice] = useState(localStorage.getItem('caos_voice_preference_gemini') || 'Aoede');

  const voices = ttsProvider === 'gemini' ? geminiVoices : openaiVoices;

  const handleProviderChange = (provider) => {
    setTtsProvider(provider);
    localStorage.setItem('caos_tts_provider', provider);
  };

  const handleVoiceChange = (v) => {
    if (ttsProvider === 'gemini') {
      setGeminiVoice(v);
      localStorage.setItem('caos_voice_preference_gemini', v);
    } else {
      setOpenaiVoice(v);
      localStorage.setItem('caos_voice_preference_message', v);
    }
  };

  const handleSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);
    localStorage.setItem('caos_speech_rate', newSpeed.toString());
  };

  const currentVoice = ttsProvider === 'gemini' ? geminiVoice : openaiVoice;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Voice Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">TTS Provider</label>
            <div className="space-y-2">
              {['openai', 'gemini'].map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleProviderChange(provider)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors capitalize ${
                    ttsProvider === provider
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {provider === 'openai' ? 'OpenAI TTS' : 'Gemini TTS'}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Voice</label>
            <div className="space-y-2">
              {voices.map((v) => (
                <button
                  key={v}
                  onClick={() => handleVoiceChange(v)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    currentVoice === v
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Speed Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
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
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0.5x</span>
              <span>2.0x</span>
            </div>
          </div>
        </div>

        <Button onClick={onClose} className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
          Done
        </Button>
      </div>
    </div>
  );
}