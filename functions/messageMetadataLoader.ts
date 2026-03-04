import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const HARD_MAX_LIMIT = 80;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'JSON body required' }, { status: 400 });
    }

    const thread_id = body?.thread_id;
    const include_content = Boolean(body?.include_content);
    const requestedLimit = Number(body?.limit ?? 40);

    if (!thread_id) {
      return Response.json({ error: 'thread_id required' }, { status: 400 });
    }

    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(HARD_MAX_LIMIT, Math.floor(requestedLimit)))
      : 40;

    const messages = await base44.entities.Message.filter(
      { conversation_id: thread_id },
      '-created_date',
      limit
    );

    const mapped = (messages ?? []).map((msg) => {
      const content = msg.content ?? '';
      const created = msg.created_date ?? msg.timestamp ?? null;

      return {
        message_id: msg.id,
        created_at: created ? new Date(created).toISOString() : null,
        role: msg.role ?? null,
        thread_id: msg.conversation_id ?? thread_id,
        snippet: content ? content.slice(0, 100) : '[no content]',
        ...(include_content ? { content } : {})
      };
    });

    return Response.json({
      thread_id,
      conversation_id: thread_id,
      order: 'desc',
      limit,
      include_content,
      message_count: mapped.length,
      messages: mapped,
      loaded_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json(
      { error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
});