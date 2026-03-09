/**
 * core/repoTool
 * Unified facade for repo list + read operations.
 * Auth: any authenticated user OR valid X-Service-Key header (for pipeline calls).
 *
 * Input:
 *   { op: "list", path: string, ref?: string }
 *   { op: "read", path: string, ref?: string, offset?: number, max_bytes?: number }
 *
 * Output (normalized):
 *   { ok: true, op, path, ref, result, sha, total_bytes, next_offset, done }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        // Auth: service key OR authenticated user (any role)
        const serviceKey = req.headers.get('X-Service-Key') || req.headers.get('x-service-key');
        const validServiceKey = Deno.env.get('CAOS_SERVICE_KEY');

        let authorized = false;
        if (serviceKey && validServiceKey && serviceKey === validServiceKey) {
            authorized = true;
        } else {
            const base44 = createClientFromRequest(req);
            const user = await base44.auth.me();
            if (user && user.email) authorized = true;
        }

        if (!authorized) {
            return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { op, path = '', ref = 'main', offset = 0, max_bytes = 200000 } = body;

        const owner = Deno.env.get('GITHUB_OWNER');
        const repo  = Deno.env.get('GITHUB_REPO');
        const token = Deno.env.get('GITHUB_TOKEN');

        if (!owner || !repo || !token) {
            return Response.json({ ok: false, error: 'GitHub secrets not configured' }, { status: 500 });
        }

        const ghHeaders = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'CAOS-RepoTool/1.0'
        };

        // ── LIST ──────────────────────────────────────────────────────────────
        if (op === 'list') {
            const cleanPath = path.replace(/^\/+|\/+$/g, '');
            const url = cleanPath
                ? `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${ref}`
                : `https://api.github.com/repos/${owner}/${repo}/contents?ref=${ref}`;

            const res = await fetch(url, { headers: ghHeaders });
            if (!res.ok) {
                const err = await res.text();
                return Response.json({ ok: false, error: `GitHub error: ${res.status}`, details: err }, { status: res.status });
            }

            const data = await res.json();
            const items = (Array.isArray(data) ? data : [data]).map(item => ({
                name: item.name,
                path: item.path,
                type: item.type,   // "file" | "dir"
                size: item.size || 0,
                sha:  item.sha
            }));

            return Response.json({
                ok: true,
                op: 'list',
                path: cleanPath || '(root)',
                ref,
                result: items,
                sha: null,
                total_bytes: null,
                next_offset: null,
                done: true
            });
        }

        // ── READ ──────────────────────────────────────────────────────────────
        if (op === 'read') {
            if (!path) {
                return Response.json({ ok: false, error: 'path is required for op:read' }, { status: 400 });
            }

            const cleanPath = path.replace(/^\/+|\/+$/g, '');

            // Get metadata
            const metaUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${ref}`;
            const metaRes = await fetch(metaUrl, { headers: ghHeaders });
            if (!metaRes.ok) {
                const err = await metaRes.text();
                return Response.json({ ok: false, error: `GitHub metadata error: ${metaRes.status}`, details: err }, { status: metaRes.status });
            }

            const meta = await metaRes.json();
            if (meta.type !== 'file') {
                return Response.json({ ok: false, error: `Path is not a file (type: ${meta.type})` }, { status: 400 });
            }

            const sha = meta.sha;
            const total_bytes = meta.size;
            const download_url = meta.download_url;

            // Fetch raw content
            const rawRes = await fetch(download_url, {
                headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'CAOS-RepoTool/1.0' }
            });
            if (!rawRes.ok) {
                return Response.json({ ok: false, error: `GitHub download error: ${rawRes.status}` }, { status: rawRes.status });
            }

            const fullText = await rawRes.text();
            const chunk = fullText.slice(offset, offset + max_bytes);
            const next_offset = offset + chunk.length;
            const done = next_offset >= fullText.length;

            return Response.json({
                ok: true,
                op: 'read',
                path: cleanPath,
                ref,
                result: chunk,
                sha,
                total_bytes,
                next_offset,
                done
            });
        }

        return Response.json({ ok: false, error: 'op must be "list" or "read"' }, { status: 400 });

    } catch (err) {
        console.error('[repoTool error]', err.message);
        return Response.json({ ok: false, error: err.message }, { status: 500 });
    }
});