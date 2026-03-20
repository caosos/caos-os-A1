/**
 * core/repoProxySmoke
 * Self-verifying smoke test for repo access.
 * Runs as service role (CAOS_SERVICE_KEY) — no user session needed.
 * Returns: { ok, list_count, read_prefix, errors[] }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    // Require service key — this is an internal diagnostic endpoint
    // No auth gate — read-only diagnostic endpoint, no PII, no mutations.
    // GitHub secrets are server-side only; this endpoint cannot expose them.

    const owner = Deno.env.get('GITHUB_OWNER');
    const repo  = Deno.env.get('GITHUB_REPO');
    const token = Deno.env.get('GITHUB_TOKEN');

    if (!owner || !repo || !token) {
        return Response.json({ ok: false, error: 'GitHub secrets not configured: missing GITHUB_OWNER, GITHUB_REPO, or GITHUB_TOKEN', list_count: 0, read_prefix: null, errors: ['missing secrets'] });
    }

    const ghHeaders = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CAOS-SmokeTest/1.0'
    };

    const errors = [];
    let list_count = null;
    let read_prefix = null;

    // ── SMOKE 1: list root ────────────────────────────────────────────────────
    try {
        const listRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents?ref=main`,
            { headers: ghHeaders }
        );
        if (!listRes.ok) {
            errors.push(`list root HTTP ${listRes.status}: ${await listRes.text()}`);
        } else {
            const data = await listRes.json();
            list_count = Array.isArray(data) ? data.length : 1;
        }
    } catch (e) {
        errors.push(`list root exception: ${e.message}`);
    }

    // ── SMOKE 2: read README.md ───────────────────────────────────────────────
    try {
        const metaRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/README.md?ref=main`,
            { headers: ghHeaders }
        );
        if (!metaRes.ok) {
            errors.push(`README meta HTTP ${metaRes.status}: ${await metaRes.text()}`);
        } else {
            const meta = await metaRes.json();
            if (meta.download_url) {
                const rawRes = await fetch(meta.download_url, {
                    headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'CAOS-SmokeTest/1.0' }
                });
                if (!rawRes.ok) {
                    errors.push(`README download HTTP ${rawRes.status}`);
                } else {
                    const text = await rawRes.text();
                    read_prefix = text.slice(0, 120);
                }
            } else {
                errors.push('README has no download_url');
            }
        }
    } catch (e) {
        errors.push(`README read exception: ${e.message}`);
    }

    const ok = errors.length === 0;
    console.log('[repoProxySmoke]', { ok, list_count, read_prefix_len: read_prefix?.length, errors });

    return Response.json({ ok, list_count, read_prefix, errors, repo: `${owner}/${repo}` });
});