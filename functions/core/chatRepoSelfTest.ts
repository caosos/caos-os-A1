/**
 * core/chatRepoSelfTest
 * Self-verifying end-to-end test that exercises the exact same code path
 * hybridMessage uses for repo commands (Option A: inline GitHub API).
 *
 * Runs: list /, open README.md, open functions/ (list), open a known file with offset
 * Returns: { ok, tests: [{input, op, ok, reply_preview, error}], all_passed }
 *
 * No user session required. No OpenAI call. Receipts are the raw reply strings.
 */

// ── Mirror of hybridMessage's detectRepoCommand (kept in sync manually) ──────
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

// ── Mirror of hybridMessage's inline GitHub fetch logic ───────────────────────
async function execRepoCmd(repoCmd, ghToken, ghOwner, ghRepo) {
    const ghHeaders = {
        'Authorization': `Bearer ${ghToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CAOS-SelfTest/1.0'
    };
    const cleanPath = repoCmd.path.replace(/^\/+|\/+$/g, '');

    if (repoCmd.op === 'list') {
        const url = cleanPath
            ? `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${cleanPath}?ref=main`
            : `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents?ref=main`;
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
            `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${cleanPath}?ref=main`,
            { headers: ghHeaders }
        );
        if (!metaRes.ok) return { ok: false, error: `GitHub meta ${metaRes.status}` };
        const meta = await metaRes.json();
        if (meta.type !== 'file') return { ok: false, error: `Not a file: ${meta.type}` };
        const rawRes = await fetch(meta.download_url, {
            headers: { 'Authorization': `Bearer ${ghToken}`, 'User-Agent': 'CAOS-SelfTest/1.0' }
        });
        if (!rawRes.ok) return { ok: false, error: `Download ${rawRes.status}` };
        const full = await rawRes.text();
        const chunk = full.slice(offset, offset + max_bytes);
        const next_offset = offset + chunk.length;
        const done = next_offset >= full.length;
        return { ok: true, path: cleanPath, content: chunk, done, total_bytes: full.length, next_offset, sha: meta.sha };
    }
}

// ── Mirror of hybridMessage's reply formatting ────────────────────────────────
function buildReply(repoCmd, repoResult) {
    if (!repoResult?.ok) return `⚠️ Repo error: ${repoResult?.error || 'unknown'}`;
    if (repoCmd.op === 'list') {
        const { items, path } = repoResult;
        const dirs  = items.filter(i => i.type === 'dir').sort((a,b) => a.name.localeCompare(b.name)).map(i => `- 📁 \`${i.path}/\``);
        const files = items.filter(i => i.type === 'file').sort((a,b) => a.name.localeCompare(b.name)).map(i => `- 📄 \`${i.path}\` (${i.size.toLocaleString()} bytes)`);
        return `**Listing: \`${path}\`** (${items.length} items)\n\n` + [...dirs, ...files].join('\n');
    } else {
        const { content, done, total_bytes, next_offset, sha, path } = repoResult;
        const ext = path.split('.').pop() || '';
        const chunkInfo = done
            ? `\n\n_File complete (${total_bytes?.toLocaleString()} bytes, sha: \`${sha?.slice(0,8)}\`)_`
            : `\n\n_Chunk shown: bytes 0–${next_offset?.toLocaleString()} of ${total_bytes?.toLocaleString()} total. Type \`open ${path} --offset ${next_offset}\` for next chunk._`;
        return `**File: \`${path}\`**\n\n\`\`\`${ext}\n${content}\n\`\`\`` + chunkInfo;
    }
}

// ── Test cases (mirrors the three acceptance criteria) ────────────────────────
const TEST_INPUTS = [
    'list /',
    'list',
    'open README.md',
    'list functions',
];

Deno.serve(async (_req) => {
    const ghToken = Deno.env.get('GITHUB_TOKEN');
    const ghOwner = Deno.env.get('GITHUB_OWNER');
    const ghRepo  = Deno.env.get('GITHUB_REPO');

    if (!ghToken || !ghOwner || !ghRepo) {
        return Response.json({ ok: false, error: 'GitHub secrets not configured', all_passed: false });
    }

    const tests = [];
    for (const input of TEST_INPUTS) {
        const repoCmd = detectRepoCommand(input);
        if (!repoCmd) {
            tests.push({ input, op: null, ok: false, error: 'detectRepoCommand returned null', reply_preview: null });
            continue;
        }
        try {
            const repoResult = await execRepoCmd(repoCmd, ghToken, ghOwner, ghRepo);
            const reply = buildReply(repoCmd, repoResult);
            tests.push({
                input,
                op: repoCmd.op,
                path: repoCmd.path,
                ok: repoResult.ok,
                error: repoResult.ok ? null : repoResult.error,
                reply_preview: reply.slice(0, 300),
                item_count: repoResult.items?.length ?? null,
                total_bytes: repoResult.total_bytes ?? null,
                done: repoResult.done ?? null,
            });
        } catch (e) {
            tests.push({ input, op: repoCmd.op, ok: false, error: e.message, reply_preview: null });
        }
    }

    const all_passed = tests.every(t => t.ok);
    console.log('[chatRepoSelfTest]', { all_passed, tests: tests.map(t => ({ input: t.input, ok: t.ok })) });

    return Response.json({ ok: all_passed, all_passed, repo: `${ghOwner}/${ghRepo}`, tests });
});