/**
 * ChatBubbleReadAloudProxy — router for ChatBubble TTS through ttsController
 * Isolates ChatBubble from its own Audio management; delegates to single controller authority
 */

import { ttcSpeak, ttsStop, ttsPause, ttsResume, ttsGetSessionId } from './ttsController.jsx';
import { sanitizeForTTS } from './ttsTextSanitizer';
import { getTTSPrefs } from './ttsPrefs';
import { base44 } from '@/api/base44Client';

const bubbleAudioCache = new Map();

export async function handleBubbleReadAloud({
  messageId,
  content,
  onStart,
  onEnd,
  onError,
  onProgress,
  ttsLog = () => {},
}) {
  const cleanText = sanitizeForTTS(content);
  if (!cleanText) {
    onError?.(new Error('No text to read'));
    return;
  }

  const cacheKey = `${messageId}_${getTTSPrefs().voice}_${getTTSPrefs().rate}`;

  // If controller is already playing, toggle pause/resume
  if (ttsGetSessionId() > 0) {
    ttsPause();
    return;
  }

  // Check cache first
  if (bubbleAudioCache.has(cacheKey)) {
    ttsLog('using_cached_audio', { msgId: messageId?.slice(0, 8) });
    ttcSpeak(cleanText, {
      engine: 'server',
      base44,
      onStart,
      onEnd: () => {
        onEnd?.();
        onProgress?.(100);
      },
      onError,
    });
    return;
  }

  // Generate TTS and cache it
  try {
    ttsLog('tts_generate_start', { msgId: messageId?.slice(0, 8) });
    const { data } = await base44.functions.invoke('textToSpeech', {
      text: cleanText,
      voice: getTTSPrefs().voice || 'nova',
      speed: getTTSPrefs().rate,
    });

    if (!data?.audio_base64) {
      throw new Error(data?.error || 'No audio returned');
    }

    bubbleAudioCache.set(cacheKey, data.audio_base64);
    ttsLog('generated_audio', { msgId: messageId?.slice(0, 8), len: data.audio_base64.length });

    // Hand off to controller
    ttcSpeak(cleanText, {
      engine: 'server',
      base44,
      onStart,
      onEnd: () => {
        onEnd?.();
        onProgress?.(100);
      },
      onError,
    });
  } catch (err) {
    ttsLog('tts_gen_error', { error: err.message });
    onError?.(err);
  }
}

export function handleBubbleStopReading() {
  ttsStop();
}

export function handleBubblePauseResume() {
  const sessionId = ttsGetSessionId();
  if (sessionId > 0) {
    ttsPause();
  }
}

export function handleBubbleResume() {
  ttsResume();
}

export function handleBubbleSeek(ratio, duration) {
  // Note: ttsController doesn't expose direct audio seek; this would need extension
  // For now, pause and user must restart
  ttsPause();
}