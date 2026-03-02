import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALLOWLIST = [
    "docs/",
    "functions/core/",
    "src/pages.config.js",
    "src/registry"
];

function isAllowlisted(path) {
    return ALLOWLIST.some(prefix => path.startsWith(prefix)) && !path.includes(".env") && !path.includes("secret");
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { path, max_bytes = 200000 } = body;

        const ts_iso = new Date().toISOString();
        const request_id = crypto.randomUUID();
        const correlation_id = crypto.randomUUID();

        if (!path) {
            return Response.json({ error: "MISSING_PATH" }, { status: 400 });
        }

        if (!isAllowlisted(path)) {
            return Response.json({
                request_id,
                correlation_id,
                tool_name: "repo.read",
                tool_version: "REPOREAD_v1_2026-03-02",
                ts_iso,
                source: "repo_fs_allowlist",
                error: "DENIED_PATH",
                path
            }, { status: 403 });
        }

        // Try to read the file (in a real implementation, this would be filesystem or external service)
        // For now, return a placeholder
        const content = `[File content for ${path} - would be fetched from repo]`;

        const encoder = new TextEncoder();
        const contentData = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', contentData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return Response.json({
            request_id,
            correlation_id,
            tool_name: "repo.read",
            tool_version: "REPOREAD_v1_2026-03-02",
            ts_iso,
            source: "repo_fs_allowlist",
            hash: `sha256:${contentHash}`,
            path,
            content_type: path.endsWith('.json') ? 'application/json' : 'text/plain',
            content
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});