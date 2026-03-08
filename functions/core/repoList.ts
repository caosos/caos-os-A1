import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Admin-only access
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { ref = 'main', prefix = null, max_entries = 10000 } = body;

        const token = Deno.env.get('GITHUB_TOKEN');
        const owner = Deno.env.get('GITHUB_OWNER');
        const repo = Deno.env.get('GITHUB_REPO');

        if (!token || !owner || !repo) {
            return Response.json({ error: 'GitHub credentials not configured' }, { status: 500 });
        }

        if (!ref) {
            return Response.json({ error: 'Missing ref parameter' }, { status: 400 });
        }

        // Fetch the repo tree recursively
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
        const response = await fetch(treeUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'Base44-CAOS'
            }
        });

        if (response.status === 404) {
            return Response.json({ error: 'Repository or ref not found' }, { status: 404 });
        }

        if (!response.ok) {
            return Response.json({ 
                error: `GitHub API error: ${response.statusText}`,
                status: response.status
            }, { status: response.status });
        }

        const data = await response.json();
        let tree = data.tree || [];

        // Filter by prefix if provided
        if (prefix) {
            tree = tree.filter(item => item.path.startsWith(prefix));
        }

        // Cap at max_entries limit to prevent massive payloads
        let truncated = false;
        if (tree.length > max_entries) {
            truncated = true;
            tree = tree.slice(0, max_entries);
        }

        // Transform to clean paths array
        const paths = tree.map(item => ({
            path: item.path,
            type: item.type, // 'blob' or 'tree'
            size: item.size || 0,
            sha: item.sha
        }));

        return Response.json({
            success: true,
            owner,
            repo,
            ref,
            prefix: prefix || null,
            count: paths.length,
            truncated,
            paths
        });

    } catch (error) {
        console.error('Repo list error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});