# TSB-044: TTS Dual-System Architecture Clarification
**Date**: 2026-03-15
**Status**: LOCKED
**Lock Signature**: TTS_DUAL_SYSTEM_v1_2026-03-15
**Campaign**: System Documentation & Governance (3/15)

## Problem Statement
System blueprint was unclear on TTS architecture. There are TWO completely separate TTS systems:
1. **Input bar TTS** (Google Web Speech API)
2. **Message bubble TTS** (OpenAI TTS)

They use different APIs, different preferences, different player UIs. They must NEVER be mixed.

## Architecture

### System 1: Input Bar TTS (Google Web Speech API)
**File**: `components/chat/ChatInputReadAloud.jsx`
**API**: Native browser `window.speechSynthesis`
**Trigger**: Click button on far left of input bar
**Content**: Reads `lastAssistantMessage` prop
**User Control**: Manual play/pause/stop (NOT auto-play)
**Voice Pref**: `caos_google_voice` (default: 'Google US English')
**Speed Pref**: `caos_google_speech_rate` (0.5–2.0x, default 1.0)
**Settings UI**: Right-click button → VoiceSettingsMenu modal
**Button State**: Green when playing
**Player UI**: Native HTML controls (play/pause/stop/skip ±10s)
**Keep-Alive**: Monitors for pauses, auto-resumes if needed (Chrome background tab fix)
**Session Safety**: `_sessionId` counter prevents ghost playback

### System 2: Message Bubble TTS (OpenAI TTS)
**File**: `components/chat/ChatBubble.jsx` (lines 110–298)
**API**: OpenAI `textToSpeech` via `base44.functions.invoke()`
**Trigger**: Click Volume2 icon on hover over assistant message
**Content**: Message text, cleaned (emoji/markdown removed, capped at 4096 chars)
**User Control**: Click to generate audio, then play/pause/skip/stop
**Voice Pref**: `caos_voice_preference_message`
**Speed Pref**: `caos_speech_rate`
**Settings UI**: Settings button (gear icon) on message hover
**Button State**: Blue while playing
**Player UI**: Full HTML5 Audio with progress scrubbing
**Cache**: Stores generated audio per (message.id + voice + speed)
**Global Manager**: Only one audio plays at a time (`globalAudioInstance`)

## Critical Invariants (DO NOT VIOLATE)

✅ **Allowed**:
- Input bar button is always visible
- Input bar reads last assistant message when clicked
- Right-click input bar button → voice settings
- Message bubbles have their own read-aloud icon
- Message bubble TTS is independent of input bar TTS
- Both systems use same localStorage for prefs (different keys)

❌ **FORBIDDEN**:
- Do NOT add OpenAI TTS to input bar
- Do NOT add Google Web Speech API to message bubbles
- Do NOT auto-play input bar TTS (user-triggered only)
- Do NOT remove or hide input bar button
- Do NOT modify message bubble TTS settings or behavior
- Do NOT mix voice/speed prefs between the two systems
- Do NOT create a third TTS system

## Implementation Guidance

### When Adding Features to Input Bar TTS:
1. Edit `components/chat/ChatInputReadAloud.jsx` (Google Web Speech)
2. Sync localStorage keys: `caos_google_voice`, `caos_google_speech_rate`
3. Add voice settings via `VoiceSettingsMenu` (right-click)
4. Keep `_sessionId` counter logic intact (prevents ghost playback)

### When Adding Features to Message Bubble TTS:
1. Edit `components/chat/ChatBubble.jsx` (OpenAI TTS)
2. Sync localStorage keys: `caos_voice_preference_message`, `caos_speech_rate`
3. Add settings via Settings button on message hover
4. Keep audio cache and global audio manager intact

### When Debugging TTS:
1. Check which system user is using (input bar vs message bubble)
2. Verify correct API is being called (Google vs OpenAI)
3. Check localStorage keys for that system
4. Do NOT assume one system's fix works for the other

## Files Affected by This Architecture
- `components/chat/ChatInputReadAloud.jsx` (Google Web Speech)
- `components/chat/ChatInput.jsx` (input bar integration)
- `components/chat/VoiceSettingsMenu.jsx` (right-click menu)
- `components/chat/ChatBubble.jsx` (OpenAI TTS — DO NOT TOUCH)
- `components/chat/VoiceSettings.jsx` (message bubble settings — DO NOT TOUCH)

## Related TSBs
- TSB-041: ChatInputReadAloud Session-Safe Refactor
- TSB-042: VoiceSettingsMenu Component

## Rollback
Not applicable (this is documentation). Lock signature ensures no future changes violate dual-system separation.

## Notes
- Google Web Speech API is browser-native (no API calls, no rate limits)
- OpenAI TTS costs credits (integration usage per message)
- Session counter in input bar TTS is intentionally module-level (global state)
- Two prefs objects are intentionally different keys (no cross-contamination)