import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Global audio manager - only one audio plays at a time
let globalAudioManager = {
  currentAudio: null,
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }
  }
};

export async function handleReadAloud(message, messageId, onPlaybackStart, onPlaybackEnd) {
  if (!message) return;

  try {
    // Stop any playing audio
    globalAudioManager.stop();

    onPlaybackStart?.();

    const stripEmojis = (s) => (s || '')
      .replace(/\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*/gu, '')
      .replace(/[\uFE0E\uFE0F\u200D]/g, '');

    const cleanText = stripEmojis(message)
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^[-*+]\s/gm, '')
      .replace(/^\d+\.\s/gm, '')
      .replace(/>/g, '')
      .replace(/\|/g, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .substring(0, 4096);

    // Fetch audio from OpenAI TTS via SDK
    const { data } = await base44.functions.invoke('textToSpeech', {
      text: cleanText,
      voice: localStorage.getItem('caos_voice_preference') || 'nova',
      speed: parseFloat(localStorage.getItem('caos_speech_rate') || '1.0')
    });

    if (!data?.audio_base64) {
      throw new Error('No audio returned from TTS');
    }

    // Decode base64 to blob
    const byteChars = atob(data.audio_base64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio();
    audio.src = audioUrl;
    audio.volume = 1.0;
    globalAudioManager.currentAudio = audio;

    audio.addEventListener('ended', () => {
      onPlaybackEnd?.();
      globalAudioManager.stop();
    });

    audio.addEventListener('error', () => {
      onPlaybackEnd?.();
      toast.error('Audio playback failed');
    });

    await audio.play();
  } catch (error) {
    onPlaybackEnd?.();
    console.error('[READ_ALOUD_ERROR]', error.message);
    toast.error(`Read aloud failed: ${error.message}`);
  }
}