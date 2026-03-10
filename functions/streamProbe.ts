// streamProbe — SSE streaming validation probe
// PURPOSE: Confirms Base44 gateway supports end-to-end chunked SSE.
// TEST: Send a POST, watch Network tab → Response for incremental updates.
// PASS: Chunks appear progressively. FAIL: All arrives at end (buffered).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const send = (event, data) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            send('meta', { ok: true, user: user.email, t: Date.now(), message: 'streamProbe started — watch for incremental chunks' });

            let i = 0;
            const interval = setInterval(() => {
                i += 1;
                send('delta', { text: `chunk-${i} `, t: Date.now() });

                if (i >= 20) {
                    clearInterval(interval);
                    send('done', { chunks: i, t: Date.now(), message: 'streamProbe complete — streaming is confirmed if you saw chunks arrive progressively' });
                    controller.close();
                }
            }, 250);

            req.signal.addEventListener('abort', () => {
                clearInterval(interval);
                try { controller.close(); } catch (_) {}
            });
        }
    });

    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
});