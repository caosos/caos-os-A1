// TSB-042-DEV-GUARD
// LOCK_SIGNATURE: CAOS_POINTER_EVENTS_GUARD_v1_2026-03-15
//
// Dev-only regression guard: warns in console if the ChatInput speaker button
// is ever found inside a pointer-events-none ancestor.
// Only active when caos_developer_mode === 'true'. Zero effect in production.
//
// Usage: mount once inside ChatInput return JSX:
//   <PointerEventsGuard targetRef={voiceButtonRef} label="TTS speaker button" />

import { useEffect } from 'react';

export default function PointerEventsGuard({ targetRef, label = 'guarded element' }) {
  const isDev = localStorage.getItem('caos_developer_mode') === 'true';

  useEffect(() => {
    if (!isDev) return;

    const check = () => {
      const el = targetRef?.current;
      if (!el) return;

      let node = el.parentElement;
      while (node && node !== document.body) {
        const pe = window.getComputedStyle(node).pointerEvents;
        if (pe === 'none') {
          console.warn(
            `[POINTER_EVENTS_GUARD] ⚠️ TSB-042 REGRESSION DETECTED\n` +
            `"${label}" has a pointer-events:none ancestor.\n` +
            `Ancestor:`, node,
            `\nThis will cause intermittent click failures on the speaker button.`
          );
          return;
        }
        node = node.parentElement;
      }
    };

    // Check on mount and after a short delay (layout may not be final on mount)
    check();
    const t = setTimeout(check, 500);
    return () => clearTimeout(t);
  }, [isDev, targetRef, label]);

  return null;
}