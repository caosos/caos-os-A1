// LOCK_SIGNATURE: CAOS_BUBBLE_READALOUD_v2_2026-03-14
// Wired to ttsController (server engine). Replaced local globalAudioManager.
// Sanitization: ttsTextSanitizer. Prefs: ttsPrefs (canonical keys).
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { ttcSpeak, ttsStop } from './ttsController';

export async function handleReadAloud(message, messageId, onPlaybackStart, onPlaybackEnd) {
  if (!message) return;

  // Stop anything playing first (controller is single authority)
  ttsStop();

  onPlaybackStart?.();

  try {
    await ttcSpeak(message, {
      engine: 'server',
      base44,
      onStart: () => {},
      onEnd: () => { onPlaybackEnd?.(); },
      onError: (err) => {
        onPlaybackEnd?.();
        console.error('[BUBBLE_READ_ALOUD_ERROR]', err.message);
        toast.error(`Read aloud failed: ${err.message}`);
      },
    });
  } catch (error) {
    onPlaybackEnd?.();
    console.error('[BUBBLE_READ_ALOUD_ERROR]', error.message);
    toast.error(`Read aloud failed: ${error.message}`);
  }
}