// streamProbe — pure SSE gateway validation (no auth, no SDK)
Deno.serve((req) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event, data) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("meta", { ok: true, t: Date.now(), message: "streamProbe started" });

      let i = 0;
      const interval = setInterval(() => {
        i++;
        send("delta", { text: `chunk-${i} `, t: Date.now() });
        if (i >= 20) {
          clearInterval(interval);
          send("done", { chunks: i, t: Date.now() });
          controller.close();
        }
      }, 250);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch (_) {}
      });
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
});