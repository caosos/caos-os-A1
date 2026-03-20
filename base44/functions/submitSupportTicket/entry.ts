import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const { subject, description, error_log_id, conversation_id, auto_flagged, priority } = await req.json();

    if (!subject || !description) {
      return Response.json({ error: 'subject and description are required' }, { status: 400 });
    }

    const ticket = await base44.asServiceRole.entities.SupportTicket.create({
      user_email: user?.email || 'guest',
      subject,
      description,
      status: 'open',
      priority: priority || 'medium',
      error_log_id: error_log_id || null,
      conversation_id: conversation_id || null,
      auto_flagged: auto_flagged || false,
    });

    // Notify admin via email
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@caos.system',
        subject: `[Support Ticket] ${subject}`,
        body: `New support ticket submitted.\n\nFrom: ${user?.email || 'guest'}\nPriority: ${priority || 'medium'}\n\n${description}${error_log_id ? `\n\nLinked Error: ${error_log_id}` : ''}`,
      });
    } catch { /* email failure is non-fatal */ }

    return Response.json({ ok: true, ticket_id: ticket.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});