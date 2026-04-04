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

// Chrome bug: speechSynthesis silently freezes after ~15s — does NOT set .paused=true
// Fix: forced pause+resume heartbeat every 10s while speaking (proven Chrome workaround)
function startKeepAlive() {
  clearKeepAlive();
  _keepAliveInterval = setInterval(() => {
    try {
      const synth = window.speechSynthesis;
      if (synth.speaking) {
        synth.pause();
        synth.resume();
      }
    } catch (err) {
      console.warn('[KEEP_ALIVE]', err.message);
    }
  }, 10000);
}

// Wake the synthesis engine — call this on any new AI message to prevent zombie state
export function wakeSpeechSynthesis() {
  try {
    const synth = window.speechSynthesis;
    if (!synth.speaking && !synth.pending) {
      // Fire a silent cancel to reset internal Chrome state between uses
      synth.cancel();
    }
  } catch (e) {}
}

export function toggleGoogleReadAloud(lastAIMessage, isPlaying, setIsPlaying) {
  if (!lastAIMessage || !lastAIMessage.trim()) return;

  // Session semantics: clicking while active = hard stop, and invalidates any pending delayed starts
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
    const waitForVoices = () =>
      new Promise((resolve) => {
        const synth = window.speechSynthesis;
        const voicesNow = synth.getVoices();
        if (voicesNow && voicesNow.length > 0) return resolve(voicesNow);

        let done = false;
        const handler = () => {
          if (done) return;
          done = true;
          synth.removeEventListener('voiceschanged', handler);
          resolve(synth.getVoices());
        };

        synth.addEventListener('voiceschanged', handler);

        // Safety timeout: resolve anyway (some browsers never fire voiceschanged)
        setTimeout(() => {
          if (done) return;
          done = true;
          synth.removeEventListener('voiceschanged', handler);
          resolve(synth.getVoices());
        }, 1200);
      });

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

    const voicePref = localStorage.getItem('caos_google_voice') || '';

    utterance.onstart = () => {
      if (sid !== _sessionId) return;
      if (_activeUtterance !== utterance) return;
      setIsPlaying(true);
      startKeepAlive();
    };
    utterance.onend = () => {
      if (sid !== _sessionId) return;
      if (_activeUtterance !== utterance) return;
      clearKeepAlive();
      _activeUtterance = null;
      setIsPlaying(false);
    };
    utterance.onerror = (e) => {
      if (sid !== _sessionId) return;
      if (_activeUtterance !== utterance) return;
      // 'interrupted' is not a real error — it means cancel() was called intentionally
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      clearKeepAlive();
      _activeUtterance = null;
      setIsPlaying(false);
      if (e.error !== 'network_error') {
        toast.error('Google Voice read-aloud failed');
      }
    };

    const speakWithVoice = (voices) => {
      if (sid !== _sessionId) return;
      if (_activeUtterance !== utterance) return;
      // Match by exact name first, then fall back to any English voice
      const selectedVoice = voices.find(v => v.name === voicePref)
        || voices.find(v => v.lang.startsWith('en'));
      if (selectedVoice) utterance.voice = selectedVoice;
      // Do NOT cancel before speak — cancel() kills the pending utterance in Chrome
      try { window.speechSynthesis.speak(utterance); } catch (e) {}
    };

    // Fetch voices and start playback
    (async () => {
      const voices = await waitForVoices();
      if (sid !== _sessionId) return;
      if (_activeUtterance !== utterance) return;
      speakWithVoice(voices || window.speechSynthesis.getVoices());

      // Watchdog: if speech never started after a generous window, retry once then give up.
      // 3000ms accounts for slow Chrome voice load + 250ms post-cancel delay.
      setTimeout(() => {
        if (sid !== _sessionId) return;
        if (_activeUtterance !== utterance) return;

        const synth = window.speechSynthesis;
        if (synth.speaking || synth.pending) return; // started fine

        // Retry once: cancel queue and re-speak
        console.warn('[TTS_WATCHDOG] Speech not started — retrying once');
        try { synth.cancel(); } catch (e) {}
        setTimeout(() => {
          if (sid !== _sessionId) return;
          if (_activeUtterance !== utterance) return;
          try {
            window.speechSynthesis.speak(utterance);
          } catch (e) {}

          // Final check: if STILL not speaking after retry window, give up cleanly
          setTimeout(() => {
            if (sid !== _sessionId) return;
            if (_activeUtterance !== utterance) return;
            if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
              _sessionId++;
              clearKeepAlive();
              _activeUtterance = null;
              setIsPlaying(false);
              try { toast?.error?.('Read aloud failed to start'); } catch (e) {}
            }
          }, 1500);
        }, 300);
      }, 3000);
    })();
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