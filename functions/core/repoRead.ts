import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only allow admins to read repo files
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { path } = body;

        if (!path) {
            return Response.json({ error: 'Missing path parameter' }, { status: 400 });
        }

        const token = Deno.env.get('GITHUB_TOKEN');
        const owner = Deno.env.get('GITHUB_OWNER');
        const repo = Deno.env.get('GITHUB_REPO');

        if (!token || !owner || !repo) {
            return Response.json({ error: 'GitHub credentials not configured' }, { status: 500 });
        }

        // Fetch file content from GitHub API
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3.raw',
                'User-Agent': 'Base44-CAOS'
            }
        });

        if (response.status === 404) {
            return Response.json({ error: 'File not found' }, { status: 404 });
        }

        if (!response.ok) {
            return Response.json({ 
                error: `GitHub API error: ${response.statusText}`,
                status: response.status
            }, { status: response.status });
        }

        const content = await response.text();

        return Response.json({
            success: true,
            path,
            content,
            size: content.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Repo read error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});