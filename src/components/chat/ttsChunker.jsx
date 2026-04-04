/**
 * ttsChunker — Split text into chunks for sequential TTS playback
 * Aims for ~500 char chunks, splits on sentence boundaries to avoid mid-word splits
 */

export function chunkTextForTTS(text, maxChunkSize = 500) {
  if (!text || text.length <= maxChunkSize) {
    return [text];
  }

  const chunks = [];
  let currentChunk = '';

  // Split on sentences (period, exclamation, question mark + optional whitespace)
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];

  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit and we have content, save and start new
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Generates TTS audio for a single chunk via the backend
 * Provider can be 'openai' or 'gemini'
 */
import { base44 } from '@/api/base44Client';

export async function generateChunkAudio(text, provider, voice, speed, devMode = false) {
  const functionName = provider === 'gemini' ? 'googleTTSGemini' : 'textToSpeech';
  const { data } = await base44.functions.invoke(functionName, {
    text,
    voice,
    speed,
    ...(devMode ? { dev_mode: true } : {}),
  });

  if (!data?.audio_base64) {
    throw new Error(data?.error || `${provider} TTS returned no audio`);
  }

  const byteChars = atob(data.audio_base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
  const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
  return URL.createObjectURL(audioBlob);
}