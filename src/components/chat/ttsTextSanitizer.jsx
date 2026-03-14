// LOCK_SIGNATURE: CAOS_TTS_SANITIZER_v1_2026-03-14
// Single source of truth for TTS text sanitization.

export function sanitizeForTTS(text, maxLength = 4096) {
  if (!text) return '';
  const stripEmojis = (s) => s
    .replace(/\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*/gu, '')
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/[\u2600-\u27BF][\uFE0F]?/g, '')   // misc symbols & dingbats (⚙️ ⏱️ ✅ ⚠️ etc.)
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')       // all supplemental emoji blocks
    .replace(/[\uFE0E\uFE0F\u200D]/g, '');

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
    .substring(0, maxLength);
}