import { toast } from 'sonner';

export function toggleGoogleReadAloud(lastAIMessage, isPlaying, setIsPlaying) {
  if (!lastAIMessage || !lastAIMessage.trim()) return;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    return;
  }

  try {
    const cleanText = lastAIMessage
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
    const speed = parseFloat(localStorage.getItem('caos_google_speech_rate') || '1.0');
    utterance.rate = Math.max(0.1, Math.min(speed, 2.0));
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to match Google voice preference
    const voices = window.speechSynthesis.getVoices();
    const voicePref = localStorage.getItem('caos_google_voice') || 'Google US English';
    const voiceMap = {
      'Google US English': 'en-US',
      'Google UK English': 'en-GB',
      'Google US Spanish': 'es-ES',
      'Google French': 'fr-FR',
      'Google German': 'de-DE',
    };
    const langCode = voiceMap[voicePref] || 'en-US';
    const selectedVoice = voices.find(v => v.lang.startsWith(langCode));
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => {
      setIsPlaying(false);
      toast.error('Google Voice read-aloud failed');
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    setIsPlaying(false);
    console.error('[GOOGLE_VOICE_ERROR]', error.message);
    toast.error('Google Voice failed');
  }
}

export function openVoiceSettings(setShowVoiceMenu) {
  setShowVoiceMenu(true);
}