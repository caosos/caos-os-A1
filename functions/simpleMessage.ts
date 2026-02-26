import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.email) {
            return Response.json({
                reply: "Authentication required",
                error: 'UNAUTHORIZED'
            }, { status: 401 });
        }

        const body = await req.json();
        const { input } = body;

        // Simple direct OpenAI call
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are Aria, a helpful AI assistant.' },
                    { role: 'user', content: input }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content;

        return Response.json({ reply, mode: 'GEN' });

    } catch (error) {
        console.error('Error:', error.message);
        return Response.json({
            reply: "I encountered an error.",
            error: error.message
        }, { status: 500 });
    }
});