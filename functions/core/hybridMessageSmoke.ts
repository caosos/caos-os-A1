/**
 * core/hybridMessageSmoke
 * Self-verifying smoke test for the hybridMessage repo-command intercept path.
 * Exercises detectRepoCommand + core/repoTool directly (no OpenAI call, no user session).
 * Returns: { ok, input, mode, reply_prefix, repo_ok, op, path, errors[] }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Mirror of hybridMessage's detectRepoCommand (kept in sync manually — pure fn, no deps)
function detectRepoCommand(input) {
    const t = (input || '').trim();
    const listMatch = t.match(/^(?:list|ls)\s+(.+)$/i);
    if (listMatch) return { op: 'list', path: listMatch[1].trim().replace(/^['"]+|['"]+$/g, '') };
    const readMatch = t.match(/^(?:open|show|read|cat)\s+(.+)$/i);
    if (readMatch) return { op: 'read', path: readMatch[1].trim().replace(/^['"]+|['"]+$/g, ''), offset: 0 };
    return null;
}

Deno.serve(async (req) => {
    // Accept service key OR smoke header
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const input = body.input || 'list /';

    // No auth gate — read-only diagnostic endpoint, no mutations.

    const errors = [];
    const repoCmd = detectRepoCommand(input);

    if (!repoCmd) {
        return Response.json({ ok: false, input, mode: 'NO_MATCH', error: 'detectRepoCommand returned null — input not a repo command', errors: ['no match'] });
    }

    // Call repoTool directly — it has no auth gate (internal read-only fn).
    // We use the app ID from env to construct the internal function URL.
    const appId = Deno.env.get('BASE44_APP_ID');
    const repoToolUrl = `https://api.base44.com/api/apps/${appId}/functions/core%2FrepoTool`;

    let repoResult;
    try {
        const rtRes = await fetch(repoToolUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                op: repoCmd.op, path: repoCmd.path, ref: 'main',
                ...(repoCmd.op === 'read' ? { offset: 0, max_bytes: 60000 } : {})
            })
        });
        repoResult = await rtRes.json();
    } catch (e) {
        errors.push(`repoTool fetch exception: ${e.message}`);
        repoResult = { ok: false, error: e.message };
    }

    if (!repoResult?.ok) {
        errors.push(`repoTool returned ok=false: ${repoResult?.error}`);
    }

    let reply_prefix = null;
    if (repoResult?.ok) {
        if (repoCmd.op === 'list') {
            const items = repoResult.result || [];
            const lines = items.slice(0, 5).map(i => `${i.type === 'dir' ? '📁' : '📄'} ${i.path}`);
            reply_prefix = `Listing ${repoResult.path}: [${items.length} items] ${lines.join(', ')}`;
        } else {
            const content = repoResult.result || '';
            reply_prefix = content.slice(0, 120);
        }
    }

    const ok = errors.length === 0;
    console.log('[hybridMessageSmoke]', { ok, input, op: repoCmd.op, path: repoCmd.path, repo_ok: repoResult?.ok });

    return Response.json({
        ok,
        input,
        mode: 'REPO_TOOL',
        op: repoCmd.op,
        path: repoCmd.path,
        repo_ok: repoResult?.ok ?? false,
        reply_prefix,
        errors
    });
});