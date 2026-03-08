import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALLOWLIST = [
    "docs/",
    "functions/core/",
    "src/registry"
];

const DENYLIST_PATTERNS = [
    ".env",
    "app-params",
    "package-lock",
    "pnpm-lock",
    "yarn.lock",
    "node_modules/"
];

function isDenied(path) {
    const lowerPath = path.toLowerCase();
    return DENYLIST_PATTERNS.some(pattern => lowerPath.includes(pattern.toLowerCase()));
}

function isAllowlisted(path) {
    if (isDenied(path)) return false;
    return ALLOWLIST.some(prefix => path.startsWith(prefix));
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        // ADMIN-ONLY CHECK
        if (user.role !== 'admin') {
            return Response.json({
                error: 'ADMIN_ONLY_TOOL',
                details: 'Repository read access requires admin role'
            }, { status: 403 });
        }

        const body = await req.json();
        const { path, max_bytes = 200000 } = body;

        if (!path || typeof path !== 'string') {
            return Response.json({ error: "MISSING_PATH" }, { status: 400 });
        }

        // SIZE CAP CHECK
        if (max_bytes > 200000) {
            return Response.json({ 
                error: "CONTENT_TOO_LARGE",
                max_bytes,
                max_allowed: 200000,
                actual_bytes: null
            }, { status: 413 });
        }

        // ALLOWLIST ENFORCEMENT
        const allowed = isAllowlisted(path);
        const denied_reason = isDenied(path) ? "DENYLIST_MATCH" : "NOT_ALLOWLISTED";

        if (!allowed) {
            return Response.json({
                error: "DENIED_PATH",
                path,
                denied_reason
            }, { status: 403 });
        }

        // READ FILE FROM REPO
        let fileContent;
        try {
            // Use Deno.readTextFile for filesystem reads
            fileContent = await Deno.readTextFile(`./${path}`);
        } catch (readError) {
            return Response.json({
                error: "FILE_NOT_FOUND",
                path,
                details: readError.message
            }, { status: 404 });
        }

        // CONTENT SIZE VALIDATION
        if (fileContent.length > max_bytes) {
            return Response.json({
                error: "CONTENT_TOO_LARGE",
                path,
                max_bytes,
                actual_bytes: fileContent.length
            }, { status: 413 });
        }

        // COMPUTE HASH
        const encoder = new TextEncoder();
        const contentData = encoder.encode(fileContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', contentData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // RETURN SUCCESS
        return Response.json({
            ok: true,
            path,
            content: fileContent,
            content_length: fileContent.length,
            content_type: path.endsWith('.json') ? 'application/json' : 'text/plain',
            hash: `sha256:${contentHash}`
        }, { status: 200 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});