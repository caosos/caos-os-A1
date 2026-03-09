/**
 * core/repoProxy
 * Browser-safe proxy: admin user → calls repo functions directly via service role.
 * No cross-app fetch. No hardcoded URLs.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_FNS = new Set(['core/repoList', 'core/repoReadChunked']);

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

        const { fn, payload = {} } = await req.json();
        if (!fn || !ALLOWED_FNS.has(fn)) {
            return Response.json({ ok: false, error: `fn '${fn}' not allowed` }, { status: 403 });
        }

        const res = await base44.asServiceRole.functions.invoke(fn, payload);
        const data = res?.data;

        // Normalize core/repoList → { ok, result: { items } }
        if (fn === 'core/repoList') {
            if (!data?.success) return Response.json({ ok: false, error: data?.error || 'repoList failed' }, { status: 500 });
            return Response.json({ ok: true, result: { items: data.paths || [] } });
        }

        // Normalize core/repoReadChunked → { ok, result: { content, done, total_bytes, next_offset } }
        if (fn === 'core/repoReadChunked') {
            if (!data?.success) return Response.json({ ok: false, error: data?.error || 'repoReadChunked failed' }, { status: 500 });
            return Response.json({ ok: true, result: { content: data.chunk || '', done: data.done, total_bytes: data.total_bytes, next_offset: data.next_offset } });
        }

        return Response.json({ ok: false, error: 'unhandled fn' }, { status: 500 });

    } catch (err) {
        console.error('🔥 [REPO_PROXY_ERROR]', err.message);
        return Response.json({ ok: false, error: err.message }, { status: 500 });
    }
});