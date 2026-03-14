import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { message, metrics } = await req.json();
    if (!message) return Response.json({ error: 'No message provided' }, { status: 400 });

    const systemPrompt = `You are ARIA, the CAOS system monitor assistant. You have real-time awareness of the CAOS dashboard.

Your ONLY job here is to answer questions about the live system dashboard data provided below. You are scoped exclusively to this console — no general-purpose responses, no off-topic chat.

Be concise, direct, and precise. Use numbers from the data. If something is not in the data, say so clearly.

== LIVE DASHBOARD SNAPSHOT (as of ${new Date().toISOString()}) ==
${JSON.stringify(metrics, null, 2)}
== END SNAPSHOT ==

Key facts you should know:
- "Active users" = sessions active in last 15 minutes (registered + guests)
- "Token cost" is estimated from DiagnosticReceipt records using OpenAI pricing
- "Errors" = ErrorLog entries; unresolved errors need attention
- "Performance" = avg and p95 latency from pipeline receipts
- "Memory" = recall statistics from DiagnosticReceipt

Answer in 1-3 sentences max unless a list is clearly needed.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: message },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated.';
    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});