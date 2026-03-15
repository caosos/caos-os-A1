# TSB-042: VoiceSettingsMenu Component & Right-Click Integration
**Date**: 2026-03-15
**Status**: ACTIVE
**Campaign**: Input Bar TTS UX Enhancement (3/15 night)

## Problem Statement
Users had no way to change voice or speed for input bar TTS. Needed:
- Voice selection (Google Web Speech voices)
- Speed slider (0.5x–2.0x)
- Modal dialog on right-click of read-aloud button

## Solution
Created `VoiceSettingsMenu` component + integrated into `ChatInput`.

### New File: components/chat/VoiceSettingsMenu.jsx

**Purpose**: Modal dialog for Google Web Speech preferences
**Props**:
- `onClose()` - closes modal
**State**:
- `voice` - current voice from localStorage[caos_google_voice]
- `speed` - current speed from localStorage[caos_google_speech_rate]

**Features**:
- Voice dropdown: 5 preset Google voices (US English, UK English, Spanish, French, German)
- Speed range slider: 0.5x to 2.0x (0.1x increments)
- Persists changes to localStorage immediately
- Clean, dark-mode UI (matches app theme)

**Voices Available**:
- Google US English (default)
- Google UK English
- Google US Spanish
- Google French
- Google German

### ChatInput Integration (components/chat/ChatInput.jsx)

**Lines ~50–51**: Added state:
```javascript
const [showVoiceMenu, setShowVoiceMenu] = useState(false);
const voiceMenuRef = useRef(null);
```

**Lines ~200–210**: Right-click handler on read-aloud button:
```javascript
onContextMenu={(e) => {
  e.preventDefault();
  setShowVoiceMenu(true);
}}
title="Right-click for voice settings"
```

**Lines ~490–495**: VoiceSettingsMenu component mounted:
```javascript
{showVoiceMenu && <VoiceSettingsMenu onClose={() => setShowVoiceMenu(false)} />}
```

**Lines ~170–180**: Click-outside handler to close menu.

## Behavior
1. User right-clicks read-aloud button → modal appears
2. User selects voice and speed
3. Settings persist in localStorage
4. Next time read-aloud plays, uses new voice/speed
5. Click outside modal or "Done" button → modal closes

## Files Changed
- `components/chat/VoiceSettingsMenu.jsx` (NEW, ~80 lines)
- `components/chat/ChatInput.jsx` (added state, right-click handler, modal mount)

## Storage Keys
- `caos_google_voice` - voice name (string)
- `caos_google_speech_rate` - speed multiplier (float 0.5–2.0)

## Dependencies
- None (uses native HTML range input, no external UI library)
- No @/components/ui/* dependencies (Slider was removed as it doesn't exist)

## Rollback
Delete `components/chat/VoiceSettingsMenu.jsx`, remove right-click handler from ChatInput.

## Notes
- Google voices are localized by browser language
- Speed changes apply to ALL input bar playback (global preference)
- Does NOT affect message bubble TTS (OpenAI uses different prefs)