import { toast } from 'sonner';

// Module-level ref prevents Chrome from GC'ing the utterance before onstart fires
let _activeUtterance = null;
let _keepAliveInterval = null;
let _sessionId = 0;

function clearKeepAlive() {
  if (_keepAliveInterval) {
    clearInterval(_keepAliveInterval);
    _keepAliveInterval = null;
  }
}

function startKeepAlive() {
  clearKeepAlive();
  _keepAliveInterval = setInterval(() => {
    try {
      const synth = window.speechSynthesis;
      if (synth.speaking) {
        synth.pause();
        synth.resume();
      }
    } catch (err) {}
  }, 10000);
}

export function wakeSpeechSynthesis() {
  try {
    const synth = window.speechSynthesis;
    if (!synth.speaking && !synth.pending) synth.cancel();
  } catch (e) {}
}

const stripEmojis = (s) => (s || '')
  .replace(/\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*/gu, '')
  .replace(/[\uFE0E\uFE0F\u200D]/g, '');

function cleanForSpeech(text) {
  return stripEmojis(text)
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
}

// CRITICAL: speak() MUST be called synchronously within the click handler.
// Any await before speak() breaks Chrome's autoplay policy and silently fails.
export function toggleGoogleReadAloud(lastAIMessage, isPlaying, setIsPlaying) {
  if (!lastAIMessage || !lastAIMessage.trim()) return;

  // Stop if already playing
  if (_activeUtterance || isPlaying) {
    _sessionId++;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    clearKeepAlive();
    _activeUtterance = null;
    setIsPlaying(false);
    return;
  }

  _sessionId++;
  const sid = _sessionId;

  try {
    const synth = window.speechSynthesis;
    const cleanText = cleanForSpeech(lastAIMessage);
    const voicePref = localStorage.getItem('caos_google_voice') || '';
    const speed = parseFloat(localStorage.getItem('caos_google_speech_rate') || '1.0');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = Math.max(0.1, Math.min(speed, 2.0));
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    _activeUtterance = utterance;

    // Apply voice from already-loaded list (synchronous — no await)
    const voices = synth.getVoices();
    if (voices && voices.length > 0) {
      const match = voices.find(v => v.name === voicePref) || voices.find(v => v.lang.startsWith('en'));
      if (match) utterance.voice = match;
    }

    utterance.onstart = () => {
      if (sid !== _sessionId || _activeUtterance !== utterance) return;
      setIsPlaying(true);
      startKeepAlive();
    };
    utterance.onend = () => {
      if (sid !== _sessionId || _activeUtterance !== utterance) return;
      clearKeepAlive();
      _activeUtterance = null;
      setIsPlaying(false);
    };
    utterance.onerror = (e) => {
      if (sid !== _sessionId || _activeUtterance !== utterance) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      clearKeepAlive();
      _activeUtterance = null;
      setIsPlaying(false);
      toast.error('Read aloud failed');
    };

    // MUST be synchronous — speak() called directly in click handler
    synth.speak(utterance);

    // If voices weren't loaded yet, listen for voiceschanged and update voice
    // (utterance is already queued, voice can be updated before it starts)
    if (!voices || voices.length === 0) {
      const onVoicesChanged = () => {
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        if (sid !== _sessionId || _activeUtterance !== utterance) return;
        const v = synth.getVoices();
        const match = v.find(x => x.name === voicePref) || v.find(x => x.lang.startsWith('en'));
        if (match) utterance.voice = match;
      };
      synth.addEventListener('voiceschanged', onVoicesChanged);
    }

  } catch (error) {
    clearKeepAlive();
    _activeUtterance = null;
    setIsPlaying(false);
    console.error('[TTS_ERROR]', error.message);
    toast.error('Read aloud failed');
  }
}

export function openVoiceSettings(setShowVoiceMenu) {
  setShowVoiceMenu(true);
}