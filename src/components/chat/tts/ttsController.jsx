// LOCK_SIGNATURE: CAOS_TTS_CONTROLLER_v1_2026-03-14
// Single audio authority for all TTS in CAOS.
// Owns: sanitization, prefs, play/pause/stop, engine selection, exclusivity.
//
// TWO ENGINES:
//   'webspeech' — browser Web Speech API (no network, default for input bar)
//   'server'    — OpenAI TTS via base44.functions.invoke('textToSpeech') (bubble path)
//   'auto'      — try webspeech; fallback to server if not started within 800ms
//
// INVARIANT: Only one audio session active at a time across all callers.
// ROLLBACK: Delete this file + revert ChatInput, ChatBubbleReadAloud, VoiceSettings.

import { sanitizeForTTS } from './ttsTextSanitizer.js';
import { getTTSPrefs } from './ttsPrefs.js';

// ── Module-level audio state (single authority) ──────────────────────────────
let _state = {
  engine: null,          // 'webspeech' | 'server'
  audio: null,           // HTMLAudioElement (server path)
  utterance: null,       // SpeechSynthesisUtterance (webspeech path)
  keepAliveId: null,     // setInterval id for Chrome keepalive
  onEnd: null,           // current session end callback
  onError: null,         // current session error callback
};

// ── Cached WebSpeech voices ───────────────────────────────────────────────────
let _cachedVoices = [];
if (typeof window !== 'undefined') {
  const loadVoices = () => { _cachedVoices = window.speechSynthesis?.getVoices() || []; };
  loadVoices();
  window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
}

// ── Internal stop ─────────────────────────────────────────────────────────────
function _stopAll(silent = false) {
  // Clear keepalive
  if (_state.keepAliveId) { clearInterval(_state.keepAliveId); _state.keepAliveId = null; }

  // Stop WebSpeech
  if (_state.engine === 'webspeech' || _state.utterance) {
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    _state.utterance = null;
  }

  // Stop server audio
  if (_state.audio) {
    try {
      _state.audio.pause();
      _state.audio.currentTime = 0;
      if (_state.audio.src?.startsWith('blob:')) URL.revokeObjectURL(_state.audio.src);
    } catch (_) {}
    _state.audio = null;
  }

  if (!silent) _state.onEnd?.();
  _state.engine = null;
  _state.onEnd = null;
  _state.onError = null;
}

// ── Chrome keepalive (background tab prevention) ─────────────────────────────
function _startKeepAlive() {
  if (_state.keepAliveId) clearInterval(_state.keepAliveId);
  _state.keepAliveId = setInterval(() => {
    if (window.speechSynthesis?.speaking && !window.speechSynthesis?.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } else if (!window.speechSynthesis?.speaking) {
      clearInterval(_state.keepAliveId);
      _state.keepAliveId = null;
    }
  }, 10000);
}

// ── WebSpeech engine ──────────────────────────────────────────────────────────
function _speakWebSpeech(cleanText, prefs, onStart, onEnd, onError) {
  const utterance = new SpeechSynthesisUtterance(cleanText);
  _state.utterance = utterance;
  _state.engine = 'webspeech';

  // Voice selection
  let voices = _cachedVoices.length ? _cachedVoices : (window.speechSynthesis?.getVoices() || []);
  const lang = prefs.wsLang || 'en-US';
  const voice = voices.find(v => v.lang.startsWith(lang)) || voices[0] || null;
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || lang;
  utterance.rate = Math.max(0.1, Math.min(prefs.rate, 2.0));
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onstart = () => {
    _startKeepAlive();
    onStart?.();
  };
  utterance.onend = () => {
    _stopAll(true); // silent — we'll call onEnd manually
    onEnd?.();
    _state.onEnd = null;
  };
  utterance.onerror = (e) => {
    if (e.error === 'interrupted' || e.error === 'canceled') return;
    _stopAll(true);
    onError?.(new Error(`WebSpeech: ${e.error}`));
    _state.onError = null;
  };

  window.speechSynthesis.cancel();
  setTimeout(() => {
    // Guard: utterance may have been cancelled already
    if (_state.utterance === utterance) {
      window.speechSynthesis.speak(utterance);
    }
  }, 50);
}

// ── Server TTS engine ─────────────────────────────────────────────────────────
async function _speakServer(cleanText, prefs, base44Client, onStart, onEnd, onError) {
  const { data } = await base44Client.functions.invoke('textToSpeech', {
    text: cleanText,
    voice: prefs.voice || 'nova',
    speed: prefs.rate,
  });

  if (!data?.audio_base64) throw new Error('No audio returned from TTS');

  const byteChars = atob(data.audio_base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
  const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(audioBlob);

  const audio = new Audio(audioUrl);
  _state.audio = audio;
  _state.engine = 'server';

  audio.addEventListener('ended', () => {
    _stopAll(true);
    onEnd?.();
    _state.onEnd = null;
  });
  audio.addEventListener('error', (e) => {
    _stopAll(true);
    onError?.(new Error(`Audio playback error: ${e.message || 'unknown'}`));
    _state.onError = null;
  });

  await audio.play();
  onStart?.();
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * speak(text, options)
 * @param {string} text - raw message text (will be sanitized)
 * @param {object} options
 *   engine?: 'webspeech' | 'server' | 'auto' — override prefs engine
 *   base44?: base44 client — required for 'server' or 'auto' engine
 *   onStart?: () => void
 *   onEnd?: () => void
 *   onError?: (err) => void
 *   onBoundary?: () => void — WebSpeech only
 */
export async function ttcSpeak(text, { engine, base44, onStart, onEnd, onError, onBoundary } = {}) {
  // Stop any prior session first (ensures single audio across all callers)
  _stopAll(true);

  const prefs = getTTSPrefs();
  const resolvedEngine = engine || prefs.engine || 'webspeech';
  const cleanText = sanitizeForTTS(text);
  if (!cleanText) return;

  // Store callbacks so stopAll can fire them on forced stop
  _state.onEnd = onEnd;
  _state.onError = onError;

  if (resolvedEngine === 'server') {
    if (!base44) throw new Error('ttsController: base44 client required for server engine');
    await _speakServer(cleanText, prefs, base44, onStart, onEnd, onError);
    return;
  }

  if (resolvedEngine === 'webspeech') {
    // Add boundary tracking if requested
    const origUtterance = { onBoundary };
    _speakWebSpeech(cleanText, prefs, onStart, onEnd, (err) => {
      onError?.(err);
    });
    // Wire onBoundary
    if (onBoundary && _state.utterance) {
      _state.utterance.onboundary = onBoundary;
    }
    return;
  }

  if (resolvedEngine === 'auto') {
    // Try WebSpeech; if not started in 800ms, fall back to server
    if (!base44) {
      // No client — can only try webspeech
      _speakWebSpeech(cleanText, prefs, onStart, onEnd, onError);
      return;
    }
    let started = false;
    const autoStart = () => { started = true; onStart?.(); };
    _speakWebSpeech(cleanText, prefs, autoStart, onEnd, async () => {
      // WebSpeech failed — try server
      if (!started) {
        try {
          await _speakServer(cleanText, prefs, base44, onStart, onEnd, onError);
        } catch (e) {
          onError?.(e);
        }
      }
    });
    // Fallback timer: if WebSpeech hasn't started in 800ms, try server
    setTimeout(async () => {
      if (!started && _state.engine === 'webspeech') {
        _stopAll(true);
        try {
          await _speakServer(cleanText, prefs, base44, onStart, onEnd, onError);
        } catch (e) {
          onError?.(e);
        }
      }
    }, 800);
  }
}

/** Stop all audio immediately. Fires onEnd callback. */
export function ttsStop() {
  _stopAll(false);
}

/** Pause WebSpeech (noop for server path). */
export function ttsPause() {
  if (_state.engine === 'webspeech') {
    window.speechSynthesis?.pause();
  } else if (_state.engine === 'server' && _state.audio) {
    _state.audio.pause();
  }
}

/** Resume paused speech. */
export function ttsResume() {
  if (_state.engine === 'webspeech') {
    window.speechSynthesis?.resume();
  } else if (_state.engine === 'server' && _state.audio) {
    _state.audio.play().catch(() => {});
  }
}

/** Is any TTS currently playing? */
export function ttsIsPlaying() {
  if (_state.engine === 'webspeech') return window.speechSynthesis?.speaking ?? false;
  if (_state.engine === 'server') return _state.audio != null && !_state.audio.paused;
  return false;
}

/** Is TTS paused? */
export function ttsIsPaused() {
  if (_state.engine === 'webspeech') return window.speechSynthesis?.paused ?? false;
  if (_state.engine === 'server') return _state.audio != null && _state.audio.paused;
  return false;
}

/** Warm up voice cache (call on mount). */
export function ttsWarmVoices() {
  _cachedVoices = window.speechSynthesis?.getVoices() || [];
}