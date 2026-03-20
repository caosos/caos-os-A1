import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { mode = 'contents', ref = 'main', path = '', max_depth = 4, max_entries = 2000 } = body;

        const token = Deno.env.get('GITHUB_TOKEN');
        const owner = Deno.env.get('GITHUB_OWNER');
        const repo = Deno.env.get('GITHUB_REPO');

        if (!token || !owner || !repo) {
            return Response.json({ error_code: 'REPO_NOT_CONFIGURED', error: 'GitHub credentials not configured', user_action: 'Admin must configure GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO in Base44 secrets.' }, { status: 500 });
        }

        // BFS MODE: Breadth-first Contents API traversal
        if (mode === 'contents_bfs') {
            const allEntries = [];
            const queue = [{ path: '', depth: 0 }];
            const visited = new Set();

            while (queue.length > 0 && allEntries.length < max_entries) {
                const { path: currentPath, depth } = queue.shift();

                if (visited.has(currentPath)) continue;
                visited.add(currentPath);

                const cleanPath = currentPath.replace(/^\/+|\/+$/g, '');
                const contentsUrl = cleanPath
                    ? `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${ref}`
                    : `https://api.github.com/repos/${owner}/${repo}/contents?ref=${ref}`;

                try {
                    const response = await fetch(contentsUrl, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/vnd.github+json',
                            'X-GitHub-Api-Version': '2022-11-28',
                            'User-Agent': 'Base44-CAOS'
                        }
                    });

                    if (!response.ok) {
                        if (response.status === 404) continue;
                        throw new Error(`GitHub API error: ${response.statusText}`);
                    }

                    const data = await response.json();
                    const items = Array.isArray(data) ? data : [data];

                    for (const item of items) {
                        if (allEntries.length >= max_entries) break;

                        allEntries.push({
                            name: item.name,
                            path: item.path,
                            type: item.type,
                            size: item.size || 0,
                            sha: item.sha,
                            depth
                        });

                        if (item.type === 'dir' && depth < max_depth) {
                            queue.push({ path: item.path, depth: depth + 1 });
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching ${cleanPath}:`, error.message);
                }
            }

            const truncated = allEntries.length >= max_entries;

            return Response.json({
                success: true,
                owner,
                repo,
                ref,
                mode: 'contents_bfs',
                total_count: allEntries.length,
                truncated,
                max_depth,
                max_entries,
                entries: allEntries
            });
        }

        // SINGLE PATH MODE: Contents API for single directory
        const cleanPath = path.replace(/^\/+|\/+$/g, '');
        const contentsUrl = cleanPath
            ? `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${ref}`
            : `https://api.github.com/repos/${owner}/${repo}/contents?ref=${ref}`;

        const response = await fetch(contentsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'Base44-CAOS'
            }
        });

        if (response.status === 404) {
            return Response.json({
                error: 'Path not found',
                path: cleanPath || '(root)',
                mode: 'contents'
            }, { status: 404 });
        }

        if (!response.ok) {
            return Response.json({
                error: `GitHub API error: ${response.statusText}`,
                status: response.status
            }, { status: response.status });
        }

        const data = await response.json();
        const items = Array.isArray(data) ? data : [data];

        const paths = items.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size || 0,
            sha: item.sha
        }));

        const truncated = paths.length > max_entries;

        return Response.json({
            success: true,
            owner,
            repo,
            ref,
            mode: 'contents',
            path: cleanPath || '(root)',
            count: paths.length,
            truncated,
            paths: truncated ? paths.slice(0, max_entries) : paths
        });

    } catch (error) {
        console.error('Repo list error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});