import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { messages = [], model_name = "gpt-4o", token_budget = 128000 } = body;

        const ts_iso = new Date().toISOString();
        const request_id = crypto.randomUUID();
        const correlation_id = crypto.randomUUID();

        let systemTokens = 0;
        let historyTokens = 0;
        let userTokens = 0;
        let toolTokens = 0;

        for (const msg of messages) {
            const contentLength = (msg.content || '').length;
            const estimatedTokens = Math.ceil(contentLength / 4);

            if (msg.role === 'system') {
                systemTokens += estimatedTokens;
            } else if (msg.role === 'assistant') {
                historyTokens += estimatedTokens;
            } else if (msg.role === 'user') {
                userTokens += estimatedTokens;
            } else if (msg.role === 'tool') {
                toolTokens += estimatedTokens;
            } else {
                historyTokens += estimatedTokens;
            }
        }

        const used = systemTokens + historyTokens + userTokens + toolTokens;
        const remaining = Math.max(0, token_budget - used);

        const wcw = {
            budget: token_budget,
            used,
            remaining,
            breakdown: {
                system: systemTokens,
                history: historyTokens,
                user: userTokens,
                tool: toolTokens
            }
        };

        const encoder = new TextEncoder();
        const wcwData = encoder.encode(JSON.stringify(wcw));
        const hashBuffer = await crypto.subtle.digest('SHA-256', wcwData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const wcwHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return Response.json({
            request_id,
            correlation_id,
            tool_name: "wcw.measure",
            tool_version: "WCW_v1_2026-03-02",
            ts_iso,
            source: "server_tokenizer_estimate",
            estimate: true,
            hash: `sha256:${wcwHash}`,
            wcw
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});