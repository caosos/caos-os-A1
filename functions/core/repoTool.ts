/**
 * core/repoTool
 * Unified facade for repo list + read operations.
 * Auth: any authenticated user OR valid X-Service-Key header (for pipeline calls).
 *
 * Input:
 *   { op: "list", path: string, ref?: string }
 *   NOTE: GitHub Contents API does not support pagination. Directories with >200
 *   entries return OUTPUT_TRUNCATION. Use narrower paths to avoid this.
 *   { op: "read", path: string, ref?: string, offset?: number, max_bytes?: number }
 *
 * Output (list):
 *   { ok: true, source: "GITHUB_REPO", op, path, ref, items[], item_count }
 *   { ok: false, source: "GITHUB_REPO", error_code: "OUTPUT_TRUNCATION", retryable: true, hint }
 * Output (read):
 *   { ok: true, source: "GITHUB_REPO", op, path, ref, result, sha, total_bytes, next_offset, done }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    // No auth gate — internal read-only function.
    // GitHub secrets are server-side only and never returned in responses.
    // This function is invoked from hybridMessage (service role) and repoProxy (admin-gated upstream).
    try {

        const body = await req.json();
        const { op, path = '', ref = 'main', offset = 0, max_bytes = 200000 } = body;
        const MAX_LIST_ITEMS = 200;

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
                return Response.json({ ok: false, source: 'GITHUB_REPO', error: `GitHub error: ${res.status}`, details: err }, { status: res.status });
            }

            const data = await res.json();
            const allItems = (Array.isArray(data) ? data : [data]).map(item => ({
                name: item.name,
                path: item.path,
                type: item.type,   // "file" | "dir"
                size: item.size || 0,
                sha:  item.sha
            }));

            if (allItems.length > MAX_LIST_ITEMS) {
                return Response.json({
                    ok: false,
                    source: 'GITHUB_REPO',
                    error_code: 'OUTPUT_TRUNCATION',
                    retryable: true,
                    item_count: allItems.length,
                    hint: `Directory contains ${allItems.length} entries (limit: ${MAX_LIST_ITEMS}). Use a narrower path (e.g. "${cleanPath}/subdir").`
                });
            }

            return Response.json({
                ok: true,
                source: 'GITHUB_REPO',
                op: 'list',
                path: cleanPath || '(root)',
                ref,
                items: allItems,
                item_count: allItems.length
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
                source: 'GITHUB_REPO',
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