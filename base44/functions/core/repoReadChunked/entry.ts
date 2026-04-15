/**
 * core/repoReadChunked
 * Reads a file from the configured GitHub repo in chunks.
 * Admin-only.
 *
 * Input: { path: string, ref?: string, offset?: number, max_bytes?: number }
 * Output: { path, ref, offset, max_bytes, chunk, next_offset, done, total_bytes, sha }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
        }

        const body = await req.json();
        const { path, ref = 'main', offset = 0, max_bytes = 200000 } = body;

        if (!path) {
            return Response.json({ error: 'path is required' }, { status: 400 });
        }

        const owner = Deno.env.get('GITHUB_OWNER');
        const repo  = Deno.env.get('GITHUB_REPO');
        const token = Deno.env.get('GITHUB_TOKEN');

        if (!owner || !repo || !token) {
            return Response.json({ error_code: 'REPO_NOT_CONFIGURED', error: 'GitHub secrets not configured', user_action: 'Admin must configure GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO in Base44 secrets.' }, { status: 500 });
        }

        // Step 1: get metadata + download_url
        const metaUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
        const metaRes = await fetch(metaUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'CAOS-RepoReadChunked/1.0'
            }
        });

        if (!metaRes.ok) {
            const errText = await metaRes.text();
            const error_code = metaRes.status === 404 ? 'REPO_FILE_NOT_FOUND' : 'REPO_GITHUB_ERROR';
            return Response.json({ ok: false, error_code, error: `File not found: ${path}`, github_status: metaRes.status, retryable: false, suggestion: 'Try ls on parent directory to verify path.' }, { status: 200 });
        }

        const meta = await metaRes.json();

        if (meta.type !== 'file') {
            return Response.json({ error: `Path is not a file (type: ${meta.type})` }, { status: 400 });
        }

        const sha = meta.sha;
        const total_bytes = meta.size;
        const download_url = meta.download_url;

        // Step 2: fetch raw content
        const rawRes = await fetch(download_url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'CAOS-RepoReadChunked/1.0'
            }
        });

        if (!rawRes.ok) {
            return Response.json({ error: `GitHub download error: ${rawRes.status}` }, { status: rawRes.status });
        }

        const fullText = await rawRes.text();
        const slice = fullText.slice(offset, offset + max_bytes);
        const next_offset = offset + slice.length;
        const done = next_offset >= fullText.length;

        return Response.json({
            success: true,
            path,
            ref,
            owner,
            repo,
            sha,
            offset,
            max_bytes,
            chunk: slice,
            next_offset,
            done,
            total_bytes,
            chunk_bytes: slice.length
        });

    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});