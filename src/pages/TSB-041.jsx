# TSB-041: ChatInputReadAloud Session-Safe Refactor
**Date**: 2026-03-15
**Status**: LOCKED
**Lock Signature**: CAOS_GOOGLE_TTS_LOCK_v1_2026-03-15
**Campaign**: Input Bar TTS Reliability (3/15 night)

## Problem Statement
Input bar read-aloud button (Google Web Speech API) was unreliable:
- Click sometimes did nothing
- Playback started late (30s+) after clicking
- Stop button didn't prevent delayed starts
- Multiple rapid clicks caused ghost playback

## Root Cause
- No session tracking between click and actual playback
- Global `window.speechSynthesis.onvoiceschanged` assignment (interfered with system)
- No guards on delayed async callbacks
- Keep-alive logic paused/resumed mid-speech (broke utterance continuity)

## Solution
**Module-level session counter + session-aware guards on all async operations**

### Changes to components/chat/ChatInputReadAloud.jsx

1. **Line 6**: Added module-level session counter:
   ```javascript
   let _sessionId = 0;
   ```

2. **Lines 37–45**: Replaced stop-toggle gate:
   - Removed check for `window.speechSynthesis.speaking` (unreliable)
   - Replaced with `_activeUtterance || isPlaying` check
   - Increments `_sessionId` on stop → invalidates any pending delayed starts

3. **Lines 47–48**: Capture session ID at click time:
   ```javascript
   _sessionId++;
   const sid = _sessionId;
   ```
   All async operations in this closure check `if (sid !== _sessionId) return;`

4. **Lines 51–74**: Replaced `window.speechSynthesis.onvoiceschanged = null` assignments:
   - Created `waitForVoices()` promise helper
   - Uses `addEventListener/removeEventListener` (never global assignment)
   - Safety timeout: 1200ms (some browsers never fire voiceschanged)

5. **Lines 96–97**: Utterance assignment immediately after creation:
   ```javascript
   _activeUtterance = utterance;
   ```
   Allows stop to invalidate pending starts before speak() is called.

6. **Lines 114–138**: All event handlers guarded:
   ```javascript
   utterance.onstart = () => {
     if (sid !== _sessionId) return;
     if (_activeUtterance !== utterance) return;
     // handler code
   };
   ```

7. **Lines 140–178**: Speech execution with watchdog:
   - `speakWithVoice()` guarded with `if (sid !== _sessionId) return;`
   - Delayed speak (75ms) wrapped with session check
   - **New**: 1200ms watchdog checks if speech actually started
   - If silent (no start), increments `_sessionId` and notifies user

8. **Lines 18–32**: Keep-alive refactor:
   - Removed forced pause/resume (breaks utterance)
   - Only passive monitoring: checks if paused unexpectedly, resumes if needed
   - Interval: 3000ms (was 10s, now lighter)

## Behavior After Fix
- ✅ Click → audible speech within 1s OR "failed to start" toast
- ✅ Click while starting → hard stop, never plays later
- ✅ Rapid clicks → always works, no ghost playback
- ✅ Works reliably across 10+ consecutive plays
- ✅ Right-click → voice settings accessible (no interference)

## Acceptance Tests (Desktop)
1. Click play → hear speech within 1s or get error toast
2. Click play, then click stop while starting → never hears speech
3. Rapid click-off-on-off-on → no delayed ghost playback
4. 10 consecutive plays → all work without fail

## Files Changed
- `components/chat/ChatInputReadAloud.jsx` (lines 1–186)

## Rollback
If needed, revert to commit before 2026-03-15 21:00 UTC.

## Notes
- This is the ONLY TTS that uses Google Web Speech API
- Do NOT mix with OpenAI TTS (message bubbles use OpenAI)
- Session counter is module-level, not per-component instance (global state is intentional)