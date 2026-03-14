// LOCK_SIGNATURE: CAOS_TTS_PREFS_v1_2026-03-14
// Canonical TTS preference keys. All TTS paths MUST read/write through here.
//
// CANONICAL KEYS:
//   caos_tts_voice      = server voice id (e.g. 'nova')
//   caos_tts_rate       = playback rate (number string, e.g. '1.0')
//   caos_tts_engine     = 'webspeech' | 'server' | 'auto' (default: 'webspeech')
//   caos_tts_ws_lang    = WebSpeech lang code (e.g. 'en-US')
//
// MIGRATION: reads legacy keys once and writes canonical on first access.

const KEYS = {
  voice:  'caos_tts_voice',
  rate:   'caos_tts_rate',
  engine: 'caos_tts_engine',
  wsLang: 'caos_tts_ws_lang',
};

let _migrated = false;
function migrateOnce() {
  if (_migrated) return;
  _migrated = true;

  // voice: prefer legacy server key, then google key
  if (!localStorage.getItem(KEYS.voice)) {
    const legacy = localStorage.getItem('caos_voice_preference_message')
      || localStorage.getItem('caos_voice_preference')
      || 'nova';
    localStorage.setItem(KEYS.voice, legacy);
  }

  // rate: prefer caos_speech_rate (server), then google rate
  if (!localStorage.getItem(KEYS.rate)) {
    const legacy = localStorage.getItem('caos_speech_rate')
      || localStorage.getItem('caos_google_speech_rate')
      || '1.0';
    localStorage.setItem(KEYS.rate, legacy);
  }

  // engine: default to webspeech (input bar legacy behavior)
  if (!localStorage.getItem(KEYS.engine)) {
    localStorage.setItem(KEYS.engine, 'webspeech');
  }

  // webspeech lang: migrate from google voice name
  if (!localStorage.getItem(KEYS.wsLang)) {
    const voiceMap = {
      'Google US English': 'en-US',
      'Google UK English': 'en-GB',
      'Google US Spanish': 'es-ES',
      'Google French': 'fr-FR',
      'Google German': 'de-DE',
    };
    const googleVoice = localStorage.getItem('caos_google_voice') || 'Google US English';
    localStorage.setItem(KEYS.wsLang, voiceMap[googleVoice] || 'en-US');
  }
}

export function getTTSPrefs() {
  migrateOnce();
  return {
    voice:  localStorage.getItem(KEYS.voice)  || 'nova',
    rate:   parseFloat(localStorage.getItem(KEYS.rate) || '1.0'),
    engine: localStorage.getItem(KEYS.engine) || 'webspeech',
    wsLang: localStorage.getItem(KEYS.wsLang) || 'en-US',
  };
}

export function setTTSPrefs({ voice, rate, engine, wsLang }) {
  migrateOnce();
  if (voice  !== undefined) localStorage.setItem(KEYS.voice,  voice);
  if (rate   !== undefined) localStorage.setItem(KEYS.rate,   String(rate));
  if (engine !== undefined) localStorage.setItem(KEYS.engine, engine);
  if (wsLang !== undefined) localStorage.setItem(KEYS.wsLang, wsLang);
}