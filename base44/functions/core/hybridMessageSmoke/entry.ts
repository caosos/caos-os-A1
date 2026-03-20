/**
 * core/hybridMessageSmoke
 * Self-verifying smoke test for the hybridMessage repo-command intercept path.
 * Tests: detectRepoCommand parsing + direct GitHub API call (same logic as core/repoTool).
 * No user session, no OpenAI call, no UI required.
 * Returns: { ok, input, op, path, repo_ok, list_count|read_prefix, errors[] }
 */

// Mirror of hybridMessage's detectRepoCommand — kept in sync manually (pure fn, no deps)
function detectRepoCommand(input) {
    const t = (input || '').trim();
    const listMatch = t.match(/^(?:list|ls)\s+(.+)$/i);
    if (listMatch) return { op: 'list', path: listMatch[1].trim().replace(/^['"]+|['"]+$/g, '') };
    const readMatch = t.match(/^(?:open|show|read|cat)\s+(.+)$/i);
    if (readMatch) return { op: 'read', path: readMatch[1].trim().replace(/^['"]+|['"]+$/g, ''), offset: 0 };
    return null;
}

Deno.serve(async (req) => {
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const input = body.input || 'list /';

    const errors = [];

    // ── PHASE 1: parser ───────────────────────────────────────────────────────
    const repoCmd = detectRepoCommand(input);
    if (!repoCmd) {
        return Response.json({ ok: false, input, error: 'detectRepoCommand returned null', errors: ['no match'] });
    }

    // ── PHASE 2: GitHub call (mirrors core/repoTool internals) ───────────────
    const owner = Deno.env.get('GITHUB_OWNER');
    const repo  = Deno.env.get('GITHUB_REPO');
    const token = Deno.env.get('GITHUB_TOKEN');

    if (!owner || !repo || !token) {
        return Response.json({ ok: false, input, error: 'GitHub secrets not configured', errors: ['missing secrets'] });
    }

    const ghHeaders = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CAOS-HybridSmoke/1.0'
    };

    let repo_ok = false;
    let list_count = null;
    let read_prefix = null;

    if (repoCmd.op === 'list') {
        const cleanPath = repoCmd.path.replace(/^\/+|\/+$/g, '');
        const url = cleanPath
            ? `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=main`
            : `https://api.github.com/repos/${owner}/${repo}/contents?ref=main`;
        try {
            const ghRes = await fetch(url, { headers: ghHeaders });
            if (!ghRes.ok) {
                errors.push(`GitHub list HTTP ${ghRes.status}: ${await ghRes.text()}`);
            } else {
                const data = await ghRes.json();
                const items = Array.isArray(data) ? data : [data];
                list_count = items.length;
                repo_ok = true;
            }
        } catch (e) {
            errors.push(`GitHub list exception: ${e.message}`);
        }
    } else {
        // read
        const cleanPath = repoCmd.path.replace(/^\/+|\/+$/g, '');
        try {
            const metaRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=main`,
                { headers: ghHeaders }
            );
            if (!metaRes.ok) {
                errors.push(`GitHub meta HTTP ${metaRes.status}`);
            } else {
                const meta = await metaRes.json();
                const rawRes = await fetch(meta.download_url, {
                    headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'CAOS-HybridSmoke/1.0' }
                });
                if (!rawRes.ok) {
                    errors.push(`GitHub download HTTP ${rawRes.status}`);
                } else {
                    const text = await rawRes.text();
                    read_prefix = text.slice(0, 120);
                    repo_ok = true;
                }
            }
        } catch (e) {
            errors.push(`GitHub read exception: ${e.message}`);
        }
    }

    const ok = errors.length === 0 && repo_ok;
    console.log('[hybridMessageSmoke]', { ok, input, op: repoCmd.op, path: repoCmd.path, repo_ok, list_count, errors });

    return Response.json({
        ok,
        input,
        mode: 'REPO_TOOL_SIMULATED',
        op: repoCmd.op,
        path: repoCmd.path,
        repo_ok,
        list_count,
        read_prefix,
        errors
    });
});