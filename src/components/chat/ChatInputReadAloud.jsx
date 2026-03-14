import { toast } from 'sonner';

// Module-level ref prevents Chrome from GC'ing the utterance before onstart fires
let _activeUtterance = null;
let _keepAliveInterval = null;

function clearKeepAlive() {
  if (_keepAliveInterval) {
    clearInterval(_keepAliveInterval);
    _keepAliveInterval = null;
  }
}

// Chrome bug: speechSynthesis pauses after ~15s in background tabs
// Fix: pause/resume every 10s to keep it alive
function startKeepAlive() {
  clearKeepAlive();
  _keepAliveInterval = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } else {
      clearKeepAlive();
    }
  }, 10000);
}

export function toggleGoogleReadAloud(lastAIMessage, isPlaying, setIsPlaying) {
  if (!lastAIMessage || !lastAIMessage.trim()) return;

  // If already speaking — stop
  if (window.speechSynthesis.speaking || isPlaying) {
    window.speechSynthesis.cancel();
    clearKeepAlive();
    _activeUtterance = null;
    setIsPlaying(false);
    return;
  }

  try {
    const stripEmojis = (s) => (s || '')
      .replace(/\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*/gu, '')
      .replace(/[\uFE0E\uFE0F\u200D]/g, '');

    const cleanText = stripEmojis(lastAIMessage)
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

    const utterance = new SpeechSynthesisUtterance(cleanText);
    _activeUtterance = utterance; // prevent GC

    const speed = parseFloat(localStorage.getItem('caos_google_speech_rate') || '1.0');
    utterance.rate = Math.max(0.1, Math.min(speed, 2.0));
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voicePref = localStorage.getItem('caos_google_voice') || 'Google US English';
    const voiceMap = {
      'Google US English': 'en-US',
      'Google UK English': 'en-GB',
      'Google US Spanish': 'es-ES',
      'Google French': 'fr-FR',
      'Google German': 'de-DE',
    };
    const langCode = voiceMap[voicePref] || 'en-US';

    utterance.onstart = () => {
      setIsPlaying(true);
      startKeepAlive();
    };
    utterance.onend = () => {
      clearKeepAlive();
      _activeUtterance = null;
      setIsPlaying(false);
    };
    utterance.onerror = (e) => {
      // 'interrupted' is not a real error — it means cancel() was called intentionally
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      clearKeepAlive();
      _activeUtterance = null;
      setIsPlaying(false);
      toast.error('Google Voice read-aloud failed');
    };

    const speakWithVoice = (voices) => {
      const selectedVoice = voices.find(v => v.lang.startsWith(langCode));
      if (selectedVoice) utterance.voice = selectedVoice;
      window.speechSynthesis.cancel(); // clear any queue
      // Small delay after cancel() — Chrome needs a tick before speak() after cancel
      setTimeout(() => window.speechSynthesis.speak(utterance), 50);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      speakWithVoice(voices);
    } else {
      // Voices not loaded yet — wait for the event, with a 500ms hard fallback
      let spoken = false;
      window.speechSynthesis.onvoiceschanged = () => {
        if (spoken) return;
        spoken = true;
        window.speechSynthesis.onvoiceschanged = null;
        speakWithVoice(window.speechSynthesis.getVoices());
      };
      setTimeout(() => {
        if (spoken) return;
        spoken = true;
        window.speechSynthesis.onvoiceschanged = null;
        speakWithVoice(window.speechSynthesis.getVoices());
      }, 500);
    }
  } catch (error) {
    clearKeepAlive();
    _activeUtterance = null;
    setIsPlaying(false);
    console.error('[GOOGLE_VOICE_ERROR]', error.message);
    toast.error('Google Voice failed');
  }
}

export function openVoiceSettings(setShowVoiceMenu) {
  setShowVoiceMenu(true);
}