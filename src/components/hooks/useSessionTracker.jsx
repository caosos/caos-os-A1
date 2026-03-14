import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function useSessionTracker() {
  const sessionIdRef = useRef(null);

  useEffect(() => {
    // Get or create session ID (persist across same tab via sessionStorage)
    let sid = sessionStorage.getItem('caos_session_id');
    if (!sid) {
      sid = generateSessionId();
      sessionStorage.setItem('caos_session_id', sid);
    }
    sessionIdRef.current = sid;

    // Start session
    base44.functions.invoke('trackSession', {
      action: 'start',
      session_id: sid,
      user_agent: navigator.userAgent,
    }).catch(() => {});

    // Heartbeat every 2 minutes
    const heartbeat = setInterval(() => {
      base44.functions.invoke('trackSession', {
        action: 'heartbeat',
        session_id: sid,
      }).catch(() => {});
    }, 2 * 60 * 1000);

    // End session on tab close
    const handleUnload = () => {
      navigator.sendBeacon && navigator.sendBeacon(
        '/api/functions/trackSession',
        JSON.stringify({ action: 'end', session_id: sid })
      );
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      base44.functions.invoke('trackSession', {
        action: 'end',
        session_id: sid,
      }).catch(() => {});
    };
  }, []);
}