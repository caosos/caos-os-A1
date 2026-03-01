import React, { useState, useEffect } from 'react';
import { X, Volume2, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// ██████████████████████████████████████████████████████████████████
// ██  FORT KNOX LOCK — DO NOT TOUCH — OPENAI TTS VOICE SETTINGS    ██
// ██  LOCKED: 2026-03-01 — WORKING AND CONFIRMED                   ██
// ██  LOCK_SIGNATURE: CAOS_OPENAI_TTS_LOCK_v1_2026-03-01           ██
// ██                                                                ██
// ██  INVARIANT BEHAVIOR (must not change):                         ██
// ██    - Uses base44.functions.invoke('textToSpeech', {...})        ██
// ██    - Expects response: { audio_base64: string }                ██
// ██    - Decodes via chunked atob loop (NOT spread — stack safe)   ██
// ██    - Model: tts-1-hd (NOT tts-1, NOT gpt-5.2, NOT any other)  ██
// ██    - Voice pref: localStorage caos_voice_preference_message    ██
// ██    - Speed pref: localStorage caos_speech_rate                 ██
// ██                                                                ██
// ██  KNOWN FALSE PREMISE (do not reintroduce):                     ██
// ██    - "TTS 5.2" / "gpt-5.2 TTS" DOES NOT EXIST (Mar 2026)     ██
// ██    - OpenAI TTS models are: tts-1, tts-1-hd ONLY               ██
// ██    - Do not attempt to upgrade TTS model without verifying     ██
// ██      the model name against OpenAI's live model list first     ██
// ██                                                                ██
// ██  DEPENDENCY BOUNDARY:                                          ██
// ██    - Requires functions/textToSpeech backend to return JSON    ██
// ██    - Breaking change if backend returns binary instead of JSON ██
// ██                                                                ██
// ██  BREAKING CHANGE = any of:                                     ██
// ██    - Switching from base64 JSON to raw binary response         ██
// ██    - Changing localStorage key names                           ██
// ██    - Replacing chunked atob with spread (stack overflow risk)  ██
// ██    - Changing the TTS model without verifying it exists        ██
// ██    - Removing playBase64Audio shared helper                    ██
// ██                                                                ██
// ██  UNLOCK PROTOCOL:                                              ██
// ██    1. Explicit user intent stated in chat                      ██
// ██    2. Acceptance criteria defined before any edit              ██
// ██    3. Rollback plan: revert to this locked version             ██
// ██    4. TSB entry written BEFORE deploying change                ██
// ██                                                                ██
// ██  DO NOT MODIFY: playBase64Audio, testVoice, saveSettings,      ██
// ██  voice list, or localStorage keys                              ██
// ██████████████████████████████████████████████████████████████████
// CAOS_OPENAI_TTS_LOCK_v1_2026-03-01 (grep anchor — do not remove)
export default function VoiceSettings({ isOpen, onClose }) {
  // OpenAI TTS voices - high quality, natural sounding
  const voices = [
    { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
    { id: 'echo', name: 'Echo', description: 'Male, clear' },
    { id: 'fable', name: 'Fable', description: 'British, expressive' },
    { id: 'onyx', name: 'Onyx', description: 'Male, deep' },
    { id: 'nova', name: 'Nova', description: 'Female, warm (Default)' },
    { id: 'shimmer', name: 'Shimmer', description: 'Female, soft' }
  ];
  
  // Note: OpenAI doesn't have a "Maple" voice. Available voices are above.
  // For similar quality to what you're looking for, Nova or Shimmer are closest.

  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [rate, setRate] = useState(1.0);
  const [testingVoice, setTestingVoice] = useState(null);
  const audioRef = React.useRef(null);

  useEffect(() => {
    const savedVoice = localStorage.getItem('caos_voice_preference_message');
    if (savedVoice) setSelectedVoice(savedVoice);

    const savedRate = localStorage.getItem('caos_speech_rate');
    if (savedRate) setRate(parseFloat(savedRate));
  }, []);

  const playBase64Audio = async (voiceId, text) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const { data } = await base44.functions.invoke('textToSpeech', { text, voice: voiceId, speed: rate });
    if (!data?.audio_base64) throw new Error('No audio returned');
    const byteChars = atob(data.audio_base64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
    const audioUrl = URL.createObjectURL(new Blob([byteArray], { type: 'audio/mpeg' }));
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => { URL.revokeObjectURL(audioUrl); audioRef.current = null; };
    await audio.play();
    return audio;
  };

  const testVoice = async (voiceId) => {
    if (testingVoice === voiceId) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setTestingVoice(null);
      return;
    }
    setTestingVoice(voiceId);
    try {
      const audio = await playBase64Audio(voiceId, "Hey, I'm Aria. How does this voice sound?");
      audio.onended = () => { setTestingVoice(null); audioRef.current = null; };
    } catch (error) {
      setTestingVoice(null);
      toast.error(`Error: ${error.message}`);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('caos_voice_preference_message', selectedVoice);
    localStorage.setItem('caos_speech_rate', rate.toString());
    toast.success('Voice settings saved');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-24">
      <div className="bg-[#0f1f3d] border border-white/20 rounded-lg w-full max-w-md max-h-[70vh] flex flex-col">
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
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                    selectedVoice === voice.id
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => setSelectedVoice(voice.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{voice.name}</p>
                    <p className="text-xs text-white/50">{voice.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedVoice === voice.id && (
                      <Check className="w-4 h-4 text-blue-400" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testVoice(voice.id);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <Play className={`w-4 h-4 ${testingVoice === voice.id ? 'text-blue-400' : 'text-white/70'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Button 
            onClick={async () => {
              try {
                await playBase64Audio(selectedVoice, "This is a test of the selected voice and speed settings.");
                toast.success('Playing with current settings');
              } catch (error) {
                toast.error('Failed to play');
              }
            }}
            variant="outline"
            className="w-full"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Read Aloud with These Settings
          </Button>
          <Button onClick={saveSettings} className="w-full bg-blue-600 hover:bg-blue-700">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}