/**
 * core/openaiFetchWithTimeout
 * Wraps a single OpenAI /v1/chat/completions fetch with AbortController + hard deadline.
 * Pure helper — NOT a Deno.serve handler. Imported by repoInference and any future inference modules.
 *
 * Returns: { ok, timedOut, status, data?, errorMessage? }
 *
 * LOCK_SIGNATURE: CAOS_OPENAI_FETCH_TIMEOUT_v1_2026-03-12
 */

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

export async function openaiFetchWithTimeout(apiKey, body, timeoutMs = 38000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(OPENAI_API, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
            return {
                ok: false,
                timedOut: false,
                status: response.status,
                errorMessage: err.error?.message || response.statusText
            };
        }

        const data = await response.json();
        return { ok: true, timedOut: false, status: 200, data };

    } catch (err) {
        clearTimeout(timer);
        const timedOut = err.name === 'AbortError';
        return {
            ok: false,
            timedOut,
            status: timedOut ? 504 : 502,
            errorMessage: timedOut ? 'PROVIDER_TIMEOUT' : err.message
        };
    }
}