import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const ts_iso = new Date().toISOString();
        const request_id = crypto.randomUUID();
        const correlation_id = crypto.randomUUID();

        const routes = [
            { name: "hybridMessage", enabled: true, visibility: "internal", description: "Primary message pipeline", locks: ["SPINE_LOCK_V2"] },
            { name: "simpleMessage", enabled: true, visibility: "internal", description: "Lightweight message handler", locks: [] },
            { name: "textToSpeech", enabled: true, visibility: "public", description: "Convert text to speech", locks: [] },
            { name: "transcribeAudio", enabled: true, visibility: "public", description: "Transcribe audio to text", locks: [] },
            { name: "core/systemSnapshot", enabled: true, visibility: "internal", description: "System state introspection", locks: ["SSX_LOCK"] },
            { name: "core/logsTail", enabled: true, visibility: "internal", description: "Tail system logs", locks: [] },
            { name: "core/routesList", enabled: true, visibility: "internal", description: "Enumerate available routes", locks: [] },
            { name: "core/uiPages", enabled: true, visibility: "internal", description: "List UI pages and topology", locks: [] },
            { name: "core/wcwMeasure", enabled: true, visibility: "internal", description: "Measure token usage", locks: [] },
            { name: "core/repoRead", enabled: true, visibility: "internal", description: "Read allowlisted repo files", locks: ["REPO_READ_LOCK"] }
        ];

        const encoder = new TextEncoder();
        const routesData = encoder.encode(JSON.stringify(routes));
        const hashBuffer = await crypto.subtle.digest('SHA-256', routesData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const routesHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return Response.json({
            request_id,
            correlation_id,
            tool_name: "routes.list",
            tool_version: "ROUTES_v1_2026-03-02",
            ts_iso,
            source: "route_registry",
            hash: `sha256:${routesHash}`,
            routes
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});