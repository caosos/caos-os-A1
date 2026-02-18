import React, { useState, useEffect } from 'react';
import { X, Volume2, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export default function VoiceSettings({ isOpen, onClose }) {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(0.95);
  const [testingSpeech, setTestingSpeech] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
      setVoices(englishVoices);

      const savedVoiceURI = localStorage.getItem('caos_voice_preference');
      if (savedVoiceURI) {
        setSelectedVoice(savedVoiceURI);
      }

      const savedRate = localStorage.getItem('caos_speech_rate');
      if (savedRate) setRate(parseFloat(savedRate));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const testVoice = (voiceURI) => {
    if (testingSpeech) {
      window.speechSynthesis.cancel();
      setTestingSpeech(false);
      return;
    }

    const voice = voices.find(v => v.voiceURI === voiceURI);
    const utterance = new SpeechSynthesisUtterance("Hey, I'm Aria. How does this voice sound?");
    utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    utterance.onstart = () => setTestingSpeech(true);
    utterance.onend = () => setTestingSpeech(false);
    utterance.onerror = () => setTestingSpeech(false);

    window.speechSynthesis.speak(utterance);
  };

  const saveSettings = () => {
    localStorage.setItem('caos_voice_preference', selectedVoice);
    localStorage.setItem('caos_speech_rate', rate.toString());
    toast.success('Voice settings saved');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1f3d] border border-white/20 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Voice Settings</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded transition-colors">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-2 block">Reading Speed</label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50">Slow</span>
              <Slider
                value={[rate]}
                onValueChange={(val) => setRate(val[0])}
                min={0.5}
                max={1.5}
                step={0.05}
                className="flex-1"
              />
              <span className="text-xs text-white/50">Fast</span>
            </div>
            <p className="text-xs text-white/40 mt-1">{rate.toFixed(2)}x speed</p>
          </div>

          <div>
            <label className="text-sm text-white/70 mb-2 block">Select Voice</label>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {voices.map((voice) => (
                <div
                  key={voice.voiceURI}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedVoice === voice.voiceURI
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => setSelectedVoice(voice.voiceURI)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{voice.name}</p>
                    <p className="text-xs text-white/50">{voice.lang}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedVoice === voice.voiceURI && (
                      <Check className="w-4 h-4 text-blue-400" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testVoice(voice.voiceURI);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <Play className="w-4 h-4 text-white/70" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <Button onClick={saveSettings} className="w-full bg-blue-600 hover:bg-blue-700">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}