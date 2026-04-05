// core/repoCommandHandler — Extracted from functions/hybridMessage
// Contains: mapChatPathToGitPath (local helper) + handleRepoCommand logic
// GOVERNANCE: behavior-identical extraction. No new logic. No timeout changes.
// EXTRACTION_RECEIPT: CAOS_REPO_COMMAND_HANDLER_v1_2026-04-05
// Allowed env re-reads: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO (infrastructure secrets only)
// Contract:
//   input:  { repoCmd, session_id, input, request_id, correlation_id, user_email, startTime }
//   output: { reply, mode, request_id, repo, repo_tool, response_time_ms, tool_calls }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ── GitHub path mapper (local helper) ────────────────────────────────────────
function mapChatPathToGitPath(cleanPath) {
    let gitPath = cleanPath;
    if (gitPath === 'functions' || gitPath.startsWith('functions/')) {
        gitPath = gitPath.replace(/^functions/, 'base44/functions');
    } else if (gitPath === 'agents' || gitPath.startsWith('agents/')) {
        gitPath = gitPath.replace(/^agents/, 'base44/agents');
    } else if (gitPath !== '' && !gitPath.startsWith('base44/') && !gitPath.startsWith('src/')) {
        gitPath = `src/${gitPath}`;
    }
    return gitPath;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        const { repoCmd, session_id, input, request_id, correlation_id, user_email, startTime } = await req.json();

        const ghToken = Deno.env.get('GITHUB_TOKEN');
        const ghOwner = Deno.env.get('GITHUB_OWNER');
        const ghRepo  = Deno.env.get('GITHUB_REPO');
        let repoResult = null;

        if (!ghToken || !ghOwner || !ghRepo) {
            repoResult = { ok: false, error: 'GitHub secrets not configured on server' };
        } else {
            const ghHeaders = {
                'Authorization': `Bearer ${ghToken}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'CAOS-Chat/1.0'
            };
            const cleanPath = repoCmd.path.replace(/^\/+|\/+$/g, '');

            if (repoCmd.op === 'list') {
                const gitPath = mapChatPathToGitPath(cleanPath);
                const url = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${gitPath}?ref=main`;
                const ghRes = await fetch(url, { headers: ghHeaders });
                if (!ghRes.ok) {
                    repoResult = { ok: false, error: `GitHub ${ghRes.status}: ${await ghRes.text()}` };
                } else {
                    const data = await ghRes.json();
                    const items = (Array.isArray(data) ? data : [data]).map(i => ({
                        name: i.name, path: i.path, type: i.type, size: i.size || 0
                    }));
                    repoResult = { ok: true, path: cleanPath || '/', items };
                }
            } else {
                const offset = repoCmd.offset || 0;
                const max_bytes = 60000;
                let gitPath = mapChatPathToGitPath(cleanPath);
                const pathsToTry = [gitPath, `${gitPath}.js`, `${gitPath}.ts`];
                let metaRes = null;
                let resolvedGitPath = gitPath;
                for (const tryPath of pathsToTry) {
                    metaRes = await fetch(
                        `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${tryPath}?ref=main`,
                        { headers: ghHeaders }
                    );
                    if (metaRes.ok) { resolvedGitPath = tryPath; break; }
                }
                if (!metaRes || !metaRes.ok) {
                    repoResult = { ok: false, error: `GitHub meta 404 — tried: ${pathsToTry.join(', ')}` };
                } else {
                    let meta = await metaRes.json();
                    // If path resolved to a directory, auto-descend into entry.ts (Base44 function convention)
                    if (Array.isArray(meta) || meta.type === 'dir') {
                        const entryRes = await fetch(
                            `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${resolvedGitPath}/entry.ts?ref=main`,
                            { headers: ghHeaders }
                        );
                        if (entryRes.ok) {
                            meta = await entryRes.json();
                            resolvedGitPath = `${resolvedGitPath}/entry.ts`;
                        }
                    }
                    if (meta.type !== 'file') {
                        repoResult = { ok: false, error: `Not a file (${meta.type}) — use \`list ${cleanPath}\` to browse` };
                    } else {
                        const rawRes = await fetch(meta.download_url, {
                            headers: { 'Authorization': `Bearer ${ghToken}`, 'User-Agent': 'CAOS-Chat/1.0' }
                        });
                        if (!rawRes.ok) {
                            repoResult = { ok: false, error: `Download failed: ${rawRes.status}` };
                        } else {
                            const full = await rawRes.text();
                            const chunk = full.slice(offset, offset + max_bytes);
                            const next_offset = offset + chunk.length;
                            const done = next_offset >= full.length;
                            repoResult = { ok: true, path: cleanPath, content: chunk, done, total_bytes: full.length, next_offset, sha: meta.sha };
                        }
                    }
                }
            }
        }

        const cleanPath = repoCmd.path.replace(/^\/+|\/+$/g, '');
        let reply;
        if (!repoResult?.ok) {
            reply = `⚠️ Repo error: ${repoResult?.error || 'unknown error'}`;
        } else if (repoCmd.op === 'list') {
            const { items, path } = repoResult;
            const dirs  = items.filter(i => i.type === 'dir').sort((a,b) => a.name.localeCompare(b.name)).map(i => `- 📁 \`${i.path}/\``);
            const files = items.filter(i => i.type === 'file').sort((a,b) => a.name.localeCompare(b.name)).map(i => `- 📄 \`${i.path}\` (${i.size.toLocaleString()} bytes)`);
            reply = `**Listing: \`${path}\`** (${items.length} items)\n\n` + [...dirs, ...files].join('\n');
        } else {
            const { content, done, total_bytes, next_offset, sha, path } = repoResult;
            const ext = path.split('.').pop() || '';
            const chunkInfo = done
                ? `\n\n_File complete (${total_bytes?.toLocaleString()} bytes, sha: \`${sha?.slice(0,8)}\`)_`
                : `\n\n_Chunk shown: bytes 0–${next_offset?.toLocaleString()} of ${total_bytes?.toLocaleString()} total. Type \`open ${path} --offset ${next_offset}\` for next chunk._`;
            reply = `**File: \`${path}\`**\n\n\`\`\`${ext}\n${content}\n\`\`\`` + chunkInfo;
        }

        if (session_id) {
            await Promise.all([
                base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, timestamp: new Date().toISOString() }),
                base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: reply, timestamp: new Date().toISOString() })
            ]);
        }

        const canonicalPath = cleanPath || '/';
        const repoToolMeta = repoResult?.ok
            ? (repoCmd.op === 'read'
                ? { op: 'read', path: canonicalPath, done: repoResult.done, next_offset: repoResult.next_offset, total_bytes: repoResult.total_bytes }
                : { op: 'list', path: canonicalPath, item_count: repoResult.items?.length || 0 })
            : null;

        const latency_ms = Date.now() - startTime;
        const repoAuditPayload = { request_id, correlation_id, user: user_email, op: repoCmd.op, path: canonicalPath, ok: repoResult?.ok, session_id: session_id || null, latency_ms };
        console.log('📂 [REPO_TOOL_AUDIT]', JSON.stringify(repoAuditPayload));

        base44.asServiceRole.entities.DiagnosticReceipt.create({
            request_id,
            session_id: session_id || null,
            model_used: null,
            selector_decision: { stage_last: 'REPO_TOOL', op: repoCmd.op, path: canonicalPath, ok: repoResult?.ok },
            latency_breakdown: { total_ms: latency_ms },
            created_at: new Date().toISOString()
        }).catch(() => {});

        return Response.json({
            reply, mode: 'REPO_TOOL', request_id,
            repo: { op: repoCmd.op, path: canonicalPath, ok: repoResult?.ok },
            repo_tool: repoToolMeta,
            response_time_ms: latency_ms, tool_calls: []
        });

    } catch (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});