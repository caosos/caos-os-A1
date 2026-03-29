// core/geminiInference — Gemini inference handler for CAOS
// Supports: gemini-2.0-flash, gemini-2.5-pro
// Features: native web grounding, vision (image input), multi-turn chat
// LOCK_SIGNATURE: CAOS_GEMINI_INFERENCE_v1_2026-03-29

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'models/gemini-2.5-flash';
const TIMEOUT_MS = 45000;

// Convert OpenAI-style message array to Gemini contents format
function convertMessagesToGemini(messages) {
    const systemParts = [];
    const contents = [];

    for (const msg of messages) {
        if (msg.role === 'system') {
            // Accumulate system messages into systemInstruction
            const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            systemParts.push({ text });
            continue;
        }

        const role = msg.role === 'assistant' ? 'model' : 'user';
        let parts = [];

        if (typeof msg.content === 'string') {
            parts = [{ text: msg.content }];
        } else if (Array.isArray(msg.content)) {
            // Multi-modal: text + images
            for (const part of msg.content) {
                if (part.type === 'text') {
                    parts.push({ text: part.text });
                } else if (part.type === 'image_url') {
                    // Convert image URL to inlineData if base64, or use fileData for URLs
                    const url = part.image_url?.url || '';
                    if (url.startsWith('data:')) {
                        const [meta, data] = url.split(',');
                        const mimeType = meta.replace('data:', '').replace(';base64', '');
                        parts.push({ inlineData: { mimeType, data } });
                    } else {
                        // Use fileData for external URLs
                        parts.push({ fileData: { fileUri: url, mimeType: 'image/jpeg' } });
                    }
                }
            }
        }

        if (parts.length > 0) {
            contents.push({ role, parts });
        }
    }

    return { systemParts, contents };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const {
            messages = [],
            model = DEFAULT_MODEL,
            max_tokens = 2000,
            use_grounding = true,   // native Google web search grounding
        } = body;

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
        }

        const { systemParts, contents } = convertMessagesToGemini(messages);

        // Build request body
        const requestBody = {
            contents,
            generationConfig: {
                maxOutputTokens: max_tokens,
                temperature: 0.7,
            },
        };

        // System instruction (Gemini's equivalent of system prompt)
        if (systemParts.length > 0) {
            requestBody.systemInstruction = {
                parts: systemParts
            };
        }

        // Native Google Search grounding — gives Gemini real-time web access
        if (use_grounding) {
            requestBody.tools = [{
                googleSearch: {}
            }];
        }

        // Normalize model name — ensure it starts with "models/"
        const normalizedModel = model.startsWith('models/') ? model : `models/${model}`;
        const url = `${GEMINI_API_BASE}/${normalizedModel}:generateContent?key=${apiKey}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return Response.json({
                error: `Gemini API error ${response.status}: ${err.error?.message || response.statusText}`,
                error_code: 'GEMINI_API_ERROR',
            }, { status: 502 });
        }

        const data = await response.json();

        const candidate = data.candidates?.[0];
        const content = candidate?.content?.parts?.map(p => p.text || '').join('') || '';

        if (!content) {
            return Response.json({ error: 'Empty response from Gemini', error_code: 'EMPTY_RESPONSE' }, { status: 502 });
        }

        // Extract grounding metadata (sources) if present
        const groundingMetadata = candidate?.groundingMetadata || null;
        const sources = groundingMetadata?.groundingChunks?.map(chunk => ({
            title: chunk.web?.title || '',
            url: chunk.web?.uri || '',
        })).filter(s => s.url) || [];

        const usage = data.usageMetadata || {};

        return Response.json({
            ok: true,
            content,
            sources,                          // grounding sources from Google Search
            model_used: model,
            usage: {
                prompt_tokens: usage.promptTokenCount || 0,
                completion_tokens: usage.candidatesTokenCount || 0,
                total_tokens: usage.totalTokenCount || 0,
            },
            grounding_enabled: use_grounding,
        });

    } catch (error) {
        const isTimeout = error?.name === 'AbortError';
        return Response.json({
            error: error.message,
            error_code: isTimeout ? 'GEMINI_TIMEOUT' : 'GEMINI_FAILED',
        }, { status: isTimeout ? 504 : 500 });
    }
});