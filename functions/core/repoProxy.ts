/**
 * core/repoProxy
 * Browser-safe proxy: authenticated Base44 users → caosInvoke (server-side key injection).
 * The CAOS_SERVICE_KEY never leaves the server.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_FNS = new Set(['core/repoList', 'core/repoRead', 'core/repoReadChunked']);

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

        const { fn, payload = {} } = await req.json();
        if (!fn || !ALLOWED_FNS.has(fn)) {
            return Response.json({ error: `fn '${fn}' not allowed` }, { status: 403 });
        }

        const invokeUrl = Deno.env.get('CAOS_INVOKE_URL') ||
            'https://caos-chat-9c5683d8.base44.app/api/functions/caosInvoke';
        const serviceKey = Deno.env.get('CAOS_SERVICE_KEY');
        if (!serviceKey) return Response.json({ error: 'CAOS_SERVICE_KEY not configured' }, { status: 500 });

        const upstream = await fetch(invokeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CAOS-SERVICE-KEY': serviceKey
            },
            body: JSON.stringify({ fn, payload })
        });

        const data = await upstream.json();
        return Response.json(data, { status: upstream.status });
    } catch (err) {
        console.error('🔥 [REPO_PROXY_ERROR]', err.message);
        return Response.json({ error: err.message }, { status: 500 });
    }
});