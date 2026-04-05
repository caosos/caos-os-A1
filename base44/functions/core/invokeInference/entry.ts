// core/invokeInference — Extracted inference dispatch
// Extracted from functions/hybridMessage (SECTION 4 / handleInference inner closure)
// GOVERNANCE: behavior-identical extraction. No new logic. No env reads for keys.
// Contract:
//   input:  { model, messages, user_role, openai_key }
//   output: { ok: true, content, usage } | { ok: false, error }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { model, messages, user_role, openai_key } = body;

        if (!model || !messages || !openai_key) {
            return Response.json({ ok: false, error: 'Missing required fields: model, messages, openai_key' }, { status: 400 });
        }

        // ── Gemini path ───────────────────────────────────────────────────────
        if (model && (model.startsWith('gemini') || model.includes('gemini'))) {
            const giRes = await base44.functions.invoke('core/geminiInference', {
                messages,
                model,
                max_tokens: 2000,
                use_grounding: true,
            });
            const giData = giRes?.data || {};
            if (!giData.ok) return Response.json({ ok: false, error: giData.error || 'Gemini inference failed' });
            let content = giData.content || '';
            if (giData.sources?.length > 0) {
                const srcLines = giData.sources.map(s => `- [${s.title || s.url}](${s.url})`).join('\n');
                content += `\n\n**Sources:**\n${srcLines}`;
            }
            return Response.json({ ok: true, content, usage: giData.usage || null });
        }

        // ── Admin path: repoInference ─────────────────────────────────────────
        if (user_role === 'admin') {
            const riRes = await base44.functions.invoke('core/repoInference', {
                messages,
                model,
                max_tokens: 4000,
            });
            const content = riRes?.data?.content;
            const usage = riRes?.data?.usage || null;
            if (!content) return Response.json({ ok: false, error: 'repoInference returned no content' });
            return Response.json({ ok: true, content, usage });
        }

        // ── Non-admin: agentic loop with web_search ───────────────────────────
        const NON_ADMIN_TOOLS = [
            {
                type: 'function',
                function: {
                    name: 'web_search',
                    description: 'Search the web for current facts, news, documentation, or anything not in training data.',
                    parameters: {
                        type: 'object',
                        properties: { query: { type: 'string', description: 'The search query string.' } },
                        required: ['query']
                    }
                }
            }
        ];

        const msgs = [...messages];
        let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        for (let round = 0; round < 5; round++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 45000);
            let response;
            try {
                response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openai_key}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model,
                        messages: msgs,
                        temperature: 0.7,
                        max_completion_tokens: 4000,
                        tools: NON_ADMIN_TOOLS,
                        tool_choice: 'auto',
                    }),
                    signal: controller.signal,
                });
                clearTimeout(timer);
            } catch (err) {
                clearTimeout(timer);
                throw err;
            }

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(`OpenAI ${response.status}: ${err.error?.message || response.statusText}`);
            }

            const data = await response.json();
            if (data.usage) {
                totalUsage.prompt_tokens += data.usage.prompt_tokens || 0;
                totalUsage.completion_tokens += data.usage.completion_tokens || 0;
                totalUsage.total_tokens += data.usage.total_tokens || 0;
            }

            const choice = data.choices[0];
            if (choice.finish_reason === 'stop' || !choice.message.tool_calls) {
                return Response.json({ ok: true, content: choice.message.content, usage: totalUsage });
            }

            msgs.push(choice.message);
            for (const toolCall of choice.message.tool_calls) {
                let toolResult = {};
                if (toolCall.function.name === 'web_search') {
                    let args = {};
                    try { args = JSON.parse(toolCall.function.arguments); } catch {}
                    try {
                        toolResult = await base44.integrations.Core.InvokeLLM({
                            prompt: `Search the web for: "${args.query}". Return a factual, well-sourced summary with source URLs.`,
                            add_context_from_internet: true,
                            model: 'gemini_3_flash',
                        });
                    } catch (e) {
                        toolResult = { error: e.message };
                    }
                }
                msgs.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
            }
        }

        return Response.json({ ok: true, content: 'Tool loop exhausted.', usage: totalUsage });

    } catch (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});