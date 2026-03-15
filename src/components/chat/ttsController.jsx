// LOCK_SIGNATURE: CAOS_TTS_CONTROLLER_v1_2026-03-14
// Single audio authority for all TTS in CAOS.
// ROLLBACK: Delete this file + revert ChatInput, ChatBubbleReadAloud, VoiceSettings.

import { sanitizeForTTS } from './ttsTextSanitizer';
import { getTTSPrefs } from './ttsPrefs';

let _sessionId = 0;
let _state = {
  sessionId: 0,
  engine: null,
  audio: null,
  utterance: null,
  keepAliveId: null,
  onEnd: null,
  onError: null,
};

let _cachedVoices = [];
if (typeof window !== 'undefined') {
  const loadVoices = () => { _cachedVoices = window.speechSynthesis?.getVoices() || []; };
  loadVoices();
  window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
}

function _stopAll(silent = false) {
  if (_state.keepAliveId) { clearInterval(_state.keepAliveId); _state.keepAliveId = null; }
  if (_state.engine === 'webspeech' || _state.utterance) {
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    _state.utterance = null;
  }
  if (_state.audio) {
    try {
      _state.audio.pause();
      _state.audio.currentTime = 0;
      _state.audio.src = '';
      if (_state.audio._blobUrl?.startsWith('blob:')) URL.revokeObjectURL(_state.audio._blobUrl);
    } catch (_) {}
    _state.audio = null;
  }
  if (!silent) _state.onEnd?.();
  _state.engine = null;
  _state.onEnd = null;
  _state.onError = null;
}

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

const WATCHDOG_MS = 800;
const _dev = () => localStorage.getItem('caos_developer_mode') === 'true';

function _buildUtterance(cleanText, prefs, onStart, onEnd, onError, onBoundary, started, retried, watchdogRef) {
  const voices = _cachedVoices.length ? _cachedVoices : (window.speechSynthesis?.getVoices() || []);
  const lang = prefs.wsLang || 'en-US';
  const voice = voices.find(v => v.lang.startsWith(lang)) || voices[0] || null;

  const utt = new SpeechSynthesisUtterance(cleanText);
  if (voice) utt.voice = voice;
  utt.lang = voice?.lang || lang;
  utt.rate = Math.max(0.1, Math.min(prefs.rate, 2.0));
  utt.pitch = 1.0;
  utt.volume = 1.0;

  utt.onstart = () => {
    started.value = true;
    if (watchdogRef.id) { clearTimeout(watchdogRef.id); watchdogRef.id = null; }
    if (_dev()) console.log('[TTS] TTS_WEBSPEECH_ONSTART');
    _startKeepAlive();
    onStart?.();
  };
  utt.onend = () => { _stopAll(true); onEnd?.(); _state.onEnd = null; };
  utt.onerror = (e) => {
    if (e.error === 'interrupted' || e.error === 'canceled') return;
    if (_dev()) console.log(`[TTS] TTS_WEBSPEECH_ONERROR: ${e.error}`);
    _stopAll(true);
    onError?.(new Error(`WebSpeech: ${e.error}`));
    _state.onError = null;
  };
  if (onBoundary) utt.onboundary = onBoundary;
  return utt;
}

function _resurrectAndSpeak(utt, onAfterSpeak) {
  try { window.speechSynthesis.cancel(); } catch (_) {}
  try { window.speechSynthesis.resume(); } catch (_) {}
  setTimeout(() => {
    if (_state.utterance === utt) {
      if (_dev()) console.log(`[TTS] TTS_WEBSPEECH_SPEAK_CALLED chars=${utt.text.length}`);
      window.speechSynthesis.speak(utt);
      onAfterSpeak?.();
    }
  }, 100);
}

function _speakWebSpeech(cleanText, prefs, onStart, onEnd, onError, onBoundary) {
  const started = { value: false };
  const retried = { value: false };
  const watchdogRef = { id: null };
  const sessionId = _state.sessionId;

  const utt = _buildUtterance(cleanText, prefs, onStart, onEnd, onError, onBoundary, started, retried, watchdogRef);
  _state.utterance = utt;
  _state.engine = 'webspeech';

  // Watchdog: fires WATCHDOG_MS after speak() is actually called
  const armWatchdog = (currentUtt) => {
    if (watchdogRef.id) clearTimeout(watchdogRef.id);
    watchdogRef.id = setTimeout(() => {
      watchdogRef.id = null;
      if (started.value || _state.utterance !== currentUtt) return;

      if (!retried.value) {
        retried.value = true;
        if (_dev()) console.log('[TTS] TTS_WEBSPEECH_START_TIMEOUT_RETRY');
        const retryUtt = _buildUtterance(cleanText, prefs, onStart, onEnd, onError, onBoundary, started, retried, watchdogRef);
        _state.utterance = retryUtt;
        _resurrectAndSpeak(retryUtt, () => {
          watchdogRef.id = setTimeout(() => {
            watchdogRef.id = null;
            if (started.value || _state.utterance !== retryUtt) return;
            if (_dev()) console.log('[TTS] TTS_WEBSPEECH_START_TIMEOUT_FAIL');
            _stopAll(true);
            onError?.(new Error('WebSpeech: start_timeout'));
          }, WATCHDOG_MS);
        });
      }
    }, WATCHDOG_MS);
  };

  // Arm watchdog immediately after speak() is called (via onAfterSpeak callback)
  _resurrectAndSpeak(utt, () => {
    if (_state.sessionId !== sessionId) return; // session cancelled
    armWatchdog(utt);
  });
}

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
  const audioUrl = URL.createObjectURL(new Blob([byteArray], { type: 'audio/mpeg' }));

  const audio = new Audio(audioUrl);
  _state.audio = audio;
  _state.engine = 'server';

  audio.addEventListener('ended', () => { _stopAll(true); onEnd?.(); _state.onEnd = null; });
  audio.addEventListener('error', () => { _stopAll(true); onError?.(new Error('Audio playback error')); _state.onError = null; });

  await audio.play();
  onStart?.();
}

export async function ttcSpeak(text, { engine, base44, onStart, onEnd, onError, onBoundary } = {}) {
  _stopAll(true);
  _sessionId++;
  _state.sessionId = _sessionId;
  const prefs = getTTSPrefs();
  const resolvedEngine = engine || prefs.engine || 'webspeech';
  const cleanText = sanitizeForTTS(text);
  if (!cleanText) return;

  _state.onEnd = onEnd;
  _state.onError = onError;

  if (resolvedEngine === 'server') {
    if (!base44) throw new Error('ttsController: base44 client required for server engine');
    await _speakServer(cleanText, prefs, base44, onStart, onEnd, onError);
    return;
  }

  if (resolvedEngine === 'webspeech') {
    _speakWebSpeech(cleanText, prefs, onStart, onEnd, (err) => onError?.(err), onBoundary);
    return;
  }

  if (resolvedEngine === 'auto') {
    if (!base44) { _speakWebSpeech(cleanText, prefs, onStart, onEnd, onError, onBoundary); return; }
    const sessionId = _state.sessionId;
    let started = false;
    const autoStart = () => { started = true; onStart?.(); };
    _speakWebSpeech(cleanText, prefs, autoStart, onEnd, async () => {
      if (!started && _state.sessionId === sessionId) {
        try { await _speakServer(cleanText, prefs, base44, onStart, onEnd, onError); } catch (e) { onError?.(e); }
      }
    }, onBoundary);
    setTimeout(async () => {
      if (!started && _state.sessionId === sessionId && _state.engine === 'webspeech') {
        _stopAll(true);
        try { await _speakServer(cleanText, prefs, base44, onStart, onEnd, onError); } catch (e) { onError?.(e); }
      }
    }, 800);
  }
}

export function ttsStop() { _stopAll(false); }

export function ttsPause() {
  if (_state.engine === 'webspeech') window.speechSynthesis?.pause();
  else if (_state.engine === 'server' && _state.audio) _state.audio.pause();
}

export function ttsResume() {
  if (_state.engine === 'webspeech') window.speechSynthesis?.resume();
  else if (_state.engine === 'server' && _state.audio) _state.audio.play().catch(() => {});
}

export function ttsGetSessionId() { return _state.sessionId; }
export function ttsIsActive() { return _state.sessionId > 0 && (_state.audio || _state.utterance); }

export function ttsWarmVoices() {
  _cachedVoices = window.speechSynthesis?.getVoices() || [];
  // Nudge Chrome engine to prevent silent death on idle tabs
  if (window.speechSynthesis && !window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
}