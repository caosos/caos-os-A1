import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export function useAuthBootstrap() {
  const [user, setUser] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // ALWAYS check real auth status first — never trust localStorage alone
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (!mounted) return;

        if (!isAuthenticated) {
          // Not authenticated — check if user chose guest mode
          const guestUserRaw = localStorage.getItem('caos_guest_user');
          if (guestUserRaw) {
            setUser(JSON.parse(guestUserRaw));
            setDataLoaded(true);
            return;
          }

          // Not authenticated, not guest — send to Welcome
          navigate(createPageUrl('Welcome'), { replace: true });
          return;
        }

        // Authenticated user: clear any stale guest flag immediately
        localStorage.removeItem('caos_guest_user');

        const me = await base44.auth.me();
        if (!mounted) return;

        setUser(me);
        setDataLoaded(true);
      } catch (e) {
        if (!mounted) return;
        localStorage.removeItem('caos_guest_user');
        navigate(createPageUrl('Welcome'), { replace: true });
      }
    })();

    return () => { mounted = false; };
  }, [navigate]);

  const isGuestMode = !!localStorage.getItem('caos_guest_user');

  return { user, isGuestMode, dataLoaded };
}