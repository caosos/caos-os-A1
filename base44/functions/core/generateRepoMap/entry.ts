import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ghOwner = Deno.env.get('GITHUB_OWNER');
const ghRepo = Deno.env.get('GITHUB_REPO');
const ghToken = Deno.env.get('GITHUB_TOKEN');

const ghHeaders = {
    'Authorization': `Bearer ${ghToken}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'CAOS-RepoMap/1.0'
};

async function fetchTree(path = 'src', depth = 0, maxDepth = 4) {
    if (depth > maxDepth) return [];
    
    const url = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${path}?ref=main`;
    const res = await fetch(url, { headers: ghHeaders });
    
    if (!res.ok) return [];
    
    const items = await res.json();
    if (!Array.isArray(items)) return [];
    
    const sorted = items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    
    const lines = [];
    for (const item of sorted) {
        const indent = '  '.repeat(depth);
        const icon = item.type === 'dir' ? '📁' : '📄';
        const name = item.type === 'dir' ? `${item.name}/` : item.name;
        
        lines.push(`${indent}${icon} ${name}`);
        
        if (item.type === 'dir' && depth < maxDepth) {
            const subItems = await fetchTree(item.path, depth + 1, maxDepth);
            lines.push(...subItems);
        }
    }
    
    return lines;
}

function buildRepoMapInstructions(tree) {
    return `REPO STRUCTURE MAP
═════════════════════════════════════════════════════════════

Use this map to navigate and locate files. Files are organized by type (folders first).

${tree.join('\n')}

KEY LOCATIONS:
• pages/          - Main app pages (Chat, Admin, Welcome, etc.)
• components/     - Reusable UI components
• functions/      - Backend serverless functions
• entities/       - Data entity schemas
• lib/            - Utility functions and hooks
• assets/         - Images, icons, media
• utils/          - Helper utilities

NAVIGATION RULES:
1. Use \`ls <path>\` to list directory contents
2. Use \`open <path>\` to read file contents (chunks automatically if large)
3. Paths are relative to repo root, automatically prepended with src/
4. Example: \`open pages/Chat.jsx\` or \`ls components/chat\`

TO FIND SOMETHING:
- Visual scan the tree structure above
- Use file extensions to identify type (.jsx=component, .js=function, .json=config)
- Check the KEY LOCATIONS section for category hints
═════════════════════════════════════════════════════════════`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        if (!ghOwner || !ghRepo || !ghToken) {
            return Response.json({ error: 'GitHub secrets not configured' }, { status: 500 });
        }
        
        const tree = await fetchTree('src', 0, 3);
        const mapInstructions = buildRepoMapInstructions(tree);
        
        return Response.json({
            ok: true,
            map: mapInstructions,
            tree_lines: tree.length,
            user: user.email
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});