/**
 * core/repoProxy
 * Browser-safe proxy: admin user → direct GitHub API calls (no cross-function auth chain).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    // Auth guard — outside main try so auth errors return 401/403, not 500
    let user;
    try {
        const base44 = createClientFromRequest(req);
        user = await base44.auth.me();
    } catch (_) {
        return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ ok: false, error: 'Forbidden: admin only' }, { status: 403 });

    try {
        const { fn, payload = {} } = await req.json();

        const token = Deno.env.get('GITHUB_TOKEN');
        const owner = Deno.env.get('GITHUB_OWNER');
        const repo  = Deno.env.get('GITHUB_REPO');
        if (!token || !owner || !repo) {
            return Response.json({ ok: false, error: 'GitHub secrets not configured' }, { status: 500 });
        }

        const ghHeaders = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'CAOS-RepoProxy/1.0'
        };

        // LIST
        if (fn === 'core/repoList') {
            const { path = '', ref = 'main' } = payload;
            const cleanPath = path.replace(/^\/+|\/+$/g, '');
            const url = cleanPath
                ? `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${ref}`
                : `https://api.github.com/repos/${owner}/${repo}/contents?ref=${ref}`;

            const ghRes = await fetch(url, { headers: ghHeaders });
            if (!ghRes.ok) {
                const err = await ghRes.text();
                return Response.json({ ok: false, error: `GitHub ${ghRes.status}: ${err}` }, { status: ghRes.status });
            }
            const data = await ghRes.json();
            const items = (Array.isArray(data) ? data : [data]).map(i => ({
                name: i.name, path: i.path, type: i.type, size: i.size || 0, sha: i.sha
            }));
            return Response.json({ ok: true, result: { items } });
        }

        // READ CHUNKED
        if (fn === 'core/repoReadChunked') {
            const { path, ref = 'main', offset = 0, max_bytes = 60000 } = payload;
            if (!path) return Response.json({ ok: false, error: 'path required' }, { status: 400 });

            const metaUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
            const metaRes = await fetch(metaUrl, { headers: ghHeaders });
            if (!metaRes.ok) return Response.json({ ok: false, error: `GitHub meta ${metaRes.status}` }, { status: metaRes.status });

            const meta = await metaRes.json();
            if (meta.type !== 'file') return Response.json({ ok: false, error: `Not a file: ${meta.type}` }, { status: 400 });

            const rawRes = await fetch(meta.download_url, { headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'CAOS-RepoProxy/1.0' } });
            if (!rawRes.ok) return Response.json({ ok: false, error: `Download failed ${rawRes.status}` }, { status: rawRes.status });

            const full = await rawRes.text();
            const chunk = full.slice(offset, offset + max_bytes);
            const next_offset = offset + chunk.length;
            const done = next_offset >= full.length;

            return Response.json({ ok: true, result: { content: chunk, done, total_bytes: meta.size, next_offset, sha: meta.sha } });
        }

        return Response.json({ ok: false, error: `fn '${fn}' not supported` }, { status: 400 });

    } catch (err) {
        console.error('🔥 [REPO_PROXY_ERROR]', err.message);
        return Response.json({ ok: false, error: err.message }, { status: 500 });
    }
});