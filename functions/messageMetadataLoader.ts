import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { thread_id, limit = 40, include_content = false } = await req.json();
    if (!thread_id) {
      return Response.json({ error: 'thread_id required' }, { status: 400 });
    }

    // Fetch messages for this thread
    const messages = await base44.entities.Message.filter(
      { conversation_id: thread_id },
      '-created_date',
      limit
    );

    if (!messages || messages.length === 0) {
      return Response.json({
        thread_id,
        message_count: 0,
        messages: [],
        loaded_at: new Date().toISOString()
      });
    }

    // Map to metadata + optional content
    const mapped = messages.map(msg => ({
      message_id: msg.id,
      created_at: msg.created_date || msg.timestamp,
      role: msg.role,
      thread_id: msg.conversation_id,
      snippet: msg.content ? msg.content.substring(0, 100) : '[no content]',
      ...(include_content && { content: msg.content })
    }));

    return Response.json({
      thread_id,
      message_count: mapped.length,
      messages: mapped,
      loaded_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});