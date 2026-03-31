import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { input, conversation_id, session_id, file_urls = [], preferred_provider } = await req.json();

    if (!input || !conversation_id) {
      return new Response(JSON.stringify({ error: 'Missing input or conversation_id' }), { status: 400 });
    }

    // Invoke hybridMessage backend function
    const hybridRes = await base44.functions.invoke('hybridMessage', {
      input,
      conversation_id,
      session_id,
      file_urls,
      preferred_provider,
      stream: true,
    });

    if (!hybridRes.ok) {
      return new Response(JSON.stringify({ error: hybridRes.data?.error || 'Pipeline failed' }), { 
        status: hybridRes.data?.status || 500 
      });
    }

    const reply = hybridRes.data?.reply || '';
    const metadata = {
      request_id: hybridRes.data?.request_id,
      mode: hybridRes.data?.mode,
      inference_provider: hybridRes.data?.inference_provider,
      response_time_ms: hybridRes.data?.response_time_ms,
    };

    // Stream response as SSE (Server-Sent Events)
    const encoder = new TextEncoder();
    const chunks = reply.match(/\S+\s*/g) || []; // Split into word chunks (preserving spaces)

    let streamBuffer = '';
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', metadata })}\n\n`));

          // Stream each word with small delay for visual effect
          for (let i = 0; i < chunks.length; i++) {
            streamBuffer += chunks[i];
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: chunks[i], cumulative: streamBuffer })}\n\n`)
            );
            // 10ms delay between chunks for smooth visual effect
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Send completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'final', text: reply, metadata })}\n\n`)
          );
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[streamHybridMessageV2]', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});