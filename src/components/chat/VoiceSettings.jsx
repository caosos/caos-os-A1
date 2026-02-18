import React, { useState, useEffect } from 'react';
import { X, Volume2, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function VoiceSettings({ isOpen, onClose }) {
  // OpenAI TTS voices - high quality, natural sounding
  const voices = [
    { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
    { id: 'echo', name: 'Echo', description: 'Male, clear' },
    { id: 'fable', name: 'Fable', description: 'British, expressive' },
    { id: 'onyx', name: 'Onyx', description: 'Male, deep' },
    { id: 'nova', name: 'Nova', description: 'Female, warm' },
    { id: 'shimmer', name: 'Shimmer', description: 'Female, soft' }
  ];

  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [rate, setRate] = useState(1.0);
  const [testingVoice, setTestingVoice] = useState(null);
  const audioRef = React.useRef(null);

  useEffect(() => {
    const savedVoice = localStorage.getItem('caos_voice_preference');
    if (savedVoice) setSelectedVoice(savedVoice);

    const savedRate = localStorage.getItem('caos_speech_rate');
    if (savedRate) setRate(parseFloat(savedRate));
  }, []);

  const testVoice = async (voiceId) => {
    if (testingVoice === voiceId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setTestingVoice(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setTestingVoice(voiceId);

    try {
      const result = await base44.functions.invoke('textToSpeech', {
        text: "Hey, I'm Aria. How does this voice sound?",
        voice: voiceId,
        speed: rate
      });

      if (!result.data || result.data.error) {
        throw new Error(result.data?.error || 'Failed to generate speech');
      }

      // The function returns binary audio data
      const audioBlob = new Blob([result.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audioRef.current = audio;
      
      audio.onended = () => {
        setTestingVoice(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setTestingVoice(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        toast.error('Playback failed');
      };

      await audio.play();
    } catch (error) {
      console.error('Test voice error:', error);
      setTestingVoice(null);
      toast.error('Failed to play voice');
    }
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
            <label className="text-sm text-white/70 mb-2 block">Select Voice (OpenAI TTS)</label>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
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

        <div className="p-4 border-t border-white/10">
          <Button onClick={saveSettings} className="w-full bg-blue-600 hover:bg-blue-700">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}