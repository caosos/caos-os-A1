import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function getGeoFromIP(ip) {
  try {
    if (!ip || ip === '127.0.0.1' || ip.startsWith('::')) return {};
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,regionName`);
    if (!res.ok) return {};
    const data = await res.json();
    return { country: data.country || '', city: data.city || '', region: data.regionName || '' };
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, session_id, user_agent } = await req.json();

    // Get IP from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || '';

    let userEmail = null;
    let isGuest = true;
    let loginMethod = 'guest';

    try {
      const user = await base44.auth.me();
      if (user?.email) {
        userEmail = user.email;
        isGuest = false;
        // Detect google login by checking if it's a google-based account
        loginMethod = user.email.endsWith('@gmail.com') ? 'google' : 'email';
      }
    } catch { /* guest */ }

    if (action === 'start') {
      const geo = await getGeoFromIP(ip);
      const existing = await base44.asServiceRole.entities.UserLogin.filter({ session_id });

      if (existing.length === 0) {
        await base44.asServiceRole.entities.UserLogin.create({
          session_id,
          user_email: userEmail,
          login_method: loginMethod,
          is_guest: isGuest,
          user_agent: user_agent || '',
          country: geo.country || '',
          city: geo.city || '',
          region: geo.region || '',
          login_time: new Date().toISOString(),
          last_active_time: new Date().toISOString(),
        });
      } else {
        await base44.asServiceRole.entities.UserLogin.update(existing[0].id, {
          last_active_time: new Date().toISOString(),
        });
      }
    } else if (action === 'heartbeat') {
      const existing = await base44.asServiceRole.entities.UserLogin.filter({ session_id });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.UserLogin.update(existing[0].id, {
          last_active_time: new Date().toISOString(),
        });
      }
    } else if (action === 'end') {
      const existing = await base44.asServiceRole.entities.UserLogin.filter({ session_id });
      if (existing.length > 0) {
        const record = existing[0];
        const loginTime = new Date(record.login_time || record.created_date);
        const duration = (Date.now() - loginTime.getTime()) / 60000;
        await base44.asServiceRole.entities.UserLogin.update(record.id, {
          logout_time: new Date().toISOString(),
          session_duration_minutes: parseFloat(duration.toFixed(1)),
          last_active_time: new Date().toISOString(),
        });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});