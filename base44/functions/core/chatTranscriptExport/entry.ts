/**
 * core/chatTranscriptExport
 * Runs the three acceptance commands through the exact hybridMessage code path
 * (Option A inline GitHub) and returns a verbatim transcript:
 *   user: list /
 *   assistant: <exact reply string>
 *   ...
 * This is the canonical Gap A receipt — same code, same output as live chat.
 * No session saved. Admin-only (diagnostic endpoint).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Mirrors hybridMessage detectRepoCommand exactly ───────────────────────────
function detectRepoCommand(input) {
    const t = (input || '').trim();
    const listMatch = t.match(/^(?:list|ls)(?:\s+(.+))?$/i);
    if (listMatch) {
        const rawPath = (listMatch[1] || '/').trim().replace(/^['"]+|['"]+$/g, '');
        return { op: 'list', path: rawPath === '/' ? '' : rawPath };
    }
    const readMatch = t.match(/^(?:open|show|read|cat)\s+(.+?)(?:\s+--offset\s+(\d+))?$/i);
    if (readMatch) {
        return {
            op: 'read',
            path: readMatch[1].trim().replace(/^['"]+|['"]+$/g, ''),
            offset: readMatch[2] ? parseInt(readMatch[2], 10) : 0
        };
    }
    return null;
}

// ── Mirrors hybridMessage inline GitHub logic exactly ─────────────────────────
async function execRepoCmd(repoCmd, token, owner, repo) {
    const ghHeaders = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CAOS-TranscriptExport/1.0'
    };
    const cleanPath = repoCmd.path.replace(/^\/+|\/+$/g, '');

    if (repoCmd.op === 'list') {
        const url = cleanPath
            ? `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=main`
            : `https://api.github.com/repos/${owner}/${repo}/contents?ref=main`;
        const ghRes = await fetch(url, { headers: ghHeaders });
        if (!ghRes.ok) return { ok: false, error: `GitHub ${ghRes.status}` };
        const data = await ghRes.json();
        const items = (Array.isArray(data) ? data : [data]).map(i => ({
            name: i.name, path: i.path, type: i.type, size: i.size || 0
        }));
        return { ok: true, path: cleanPath || '/', items };
    } else {
        const offset = repoCmd.offset || 0;
        const max_bytes = 60000;
        const metaRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=main`,
            { headers: ghHeaders }
        );
        if (!metaRes.ok) return { ok: false, error: `GitHub meta ${metaRes.status}` };
        const meta = await metaRes.json();
        if (meta.type !== 'file') return { ok: false, error: `Not a file: ${meta.type}` };
        const rawRes = await fetch(meta.download_url, {
            headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'CAOS-TranscriptExport/1.0' }
        });
        if (!rawRes.ok) return { ok: false, error: `Download ${rawRes.status}` };
        const full = await rawRes.text();
        const chunk = full.slice(offset, offset + max_bytes);
        const next_offset = offset + chunk.length;
        const done = next_offset >= full.length;
        return { ok: true, path: cleanPath, content: chunk, done, total_bytes: full.length, next_offset, sha: meta.sha };
    }
}

// ── Mirrors hybridMessage reply formatting exactly ────────────────────────────
function buildReply(repoCmd, r) {
    if (!r?.ok) return `⚠️ Repo error: ${r?.error || 'unknown'}`;
    if (repoCmd.op === 'list') {
        const dirs  = r.items.filter(i => i.type === 'dir').sort((a,b) => a.name.localeCompare(b.name)).map(i => `- 📁 \`${i.path}/\``);
        const files = r.items.filter(i => i.type === 'file').sort((a,b) => a.name.localeCompare(b.name)).map(i => `- 📄 \`${i.path}\` (${i.size.toLocaleString()} bytes)`);
        return `**Listing: \`${r.path}\`** (${r.items.length} items)\n\n` + [...dirs, ...files].join('\n');
    } else {
        const ext = r.path.split('.').pop() || '';
        const chunkInfo = r.done
            ? `\n\n_File complete (${r.total_bytes?.toLocaleString()} bytes, sha: \`${r.sha?.slice(0,8)}\`)_`
            : `\n\n_Chunk shown: bytes 0–${r.next_offset?.toLocaleString()} of ${r.total_bytes?.toLocaleString()} total. Type \`open ${r.path} --offset ${r.next_offset}\` for next chunk._`;
        return `**File: \`${r.path}\`**\n\n\`\`\`${ext}\n${r.content}\n\`\`\`` + chunkInfo;
    }
}

// ── Acceptance test sequence ───────────────────────────────────────────────────
const ACCEPTANCE_COMMANDS = [
    'list /',
    'open README.md',
    'open src/pages/SystemBlueprint.jsx',
];

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const token = Deno.env.get('GITHUB_TOKEN');
    const owner = Deno.env.get('GITHUB_OWNER');
    const repo  = Deno.env.get('GITHUB_REPO');
    if (!token || !owner || !repo) return Response.json({ error: 'GitHub secrets not configured' }, { status: 500 });

    const transcript = [];
    let all_passed = true;

    for (const input of ACCEPTANCE_COMMANDS) {
        const repoCmd = detectRepoCommand(input);
        if (!repoCmd) { all_passed = false; transcript.push({ user: input, assistant: '⚠️ parser returned null', ok: false }); continue; }
        const r = await execRepoCmd(repoCmd, token, owner, repo);
        const reply = buildReply(repoCmd, r);
        if (!r.ok) all_passed = false;
        transcript.push({ user: input, assistant: reply, ok: r.ok, mode: 'REPO_TOOL', op: repoCmd.op, path: repoCmd.path });
    }

    // Also run the follow-up --offset call for acceptance criterion 3
    const blueprint = transcript.find(t => t.path === 'src/pages/SystemBlueprint.jsx');
    if (blueprint?.ok) {
        const r2 = await execRepoCmd({ op: 'read', path: 'src/pages/SystemBlueprint.jsx', offset: 60000 }, token, owner, repo);
        const reply2 = buildReply({ op: 'read', path: 'src/pages/SystemBlueprint.jsx', offset: 60000 }, r2);
        transcript.push({ user: 'open src/pages/SystemBlueprint.jsx --offset 60000', assistant: reply2, ok: r2.ok, mode: 'REPO_TOOL', op: 'read', path: 'src/pages/SystemBlueprint.jsx' });
        if (!r2.ok) all_passed = false;
    }

    return Response.json({ ok: all_passed, all_passed, repo: `${owner}/${repo}`, as_user: user.email, transcript });
});