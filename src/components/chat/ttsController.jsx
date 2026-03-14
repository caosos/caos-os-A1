// LOCK_SIGNATURE: CAOS_TTS_CONTROLLER_v1_2026-03-14
// Single audio authority for all TTS in CAOS.
// ROLLBACK: Delete this file + revert ChatInput, ChatBubbleReadAloud, VoiceSettings.

import { sanitizeForTTS } from './ttsTextSanitizer';
import { getTTSPrefs } from './ttsPrefs';

let _state = {
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
      if (_state.audio.src?.startsWith('blob:')) URL.revokeObjectURL(_state.audio.src);
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

function _speakWebSpeech(cleanText, prefs, onStart, onEnd, onError, onBoundary) {
  const utterance = new SpeechSynthesisUtterance(cleanText);
  _state.utterance = utterance;
  _state.engine = 'webspeech';

  let voices = _cachedVoices.length ? _cachedVoices : (window.speechSynthesis?.getVoices() || []);
  const lang = prefs.wsLang || 'en-US';
  const voice = voices.find(v => v.lang.startsWith(lang)) || voices[0] || null;
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || lang;
  utterance.rate = Math.max(0.1, Math.min(prefs.rate, 2.0));
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onstart = () => { _startKeepAlive(); onStart?.(); };
  utterance.onend = () => { _stopAll(true); onEnd?.(); _state.onEnd = null; };
  utterance.onerror = (e) => {
    if (e.error === 'interrupted' || e.error === 'canceled') return;
    _stopAll(true);
    onError?.(new Error(`WebSpeech: ${e.error}`));
    _state.onError = null;
  };
  if (onBoundary) utterance.onboundary = onBoundary;

  window.speechSynthesis.cancel();
  setTimeout(() => {
    if (_state.utterance === utterance) window.speechSynthesis.speak(utterance);
  }, 50);
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
    let started = false;
    const autoStart = () => { started = true; onStart?.(); };
    _speakWebSpeech(cleanText, prefs, autoStart, onEnd, async () => {
      if (!started) {
        try { await _speakServer(cleanText, prefs, base44, onStart, onEnd, onError); } catch (e) { onError?.(e); }
      }
    }, onBoundary);
    setTimeout(async () => {
      if (!started && _state.engine === 'webspeech') {
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

export function ttsWarmVoices() {
  _cachedVoices = window.speechSynthesis?.getVoices() || [];
}