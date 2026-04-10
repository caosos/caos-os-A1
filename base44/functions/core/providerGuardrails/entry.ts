// MODULE: core/providerGuardrails
// LOCK_SIGNATURE: CAOS_PROVIDER_GUARDRAILS_v1_2026-03-30
// PURPOSE: Normalize provider identity, inject provider-specific prompt addenda,
//          and export enforcement rule definitions for hybridMessage runtime gates.
// ROLLBACK: Set ENABLE_PROVIDER_GUARDRAILS=false in hybridMessage to bypass entirely.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── PROVIDER NORMALIZATION ────────────────────────────────────────────────────
// Returns a canonical providerKey regardless of how the caller passed the provider.
export function normalizeProvider(inferenceProvider, resolvedModel) {
    if (inferenceProvider === 'gemini' || resolvedModel?.includes('gemini')) return 'gemini';
    if (inferenceProvider === 'grok' || resolvedModel?.includes('grok')) return 'grok';
    return 'openai';
}

// ── PROVIDER DEFAULTS ─────────────────────────────────────────────────────────
// Suggested generation parameters per provider.
export function providerDefaults(providerKey) {
    const defaults = {
        openai: { temperature: 0.7, max_output_tokens: 4096 },
        gemini: { temperature: 0.01, max_output_tokens: 4096 },
        grok:   { temperature: 0.7, max_output_tokens: 4096 },
    };
    return defaults[providerKey] || defaults.openai;
}

// ── ENFORCEMENT RULES ─────────────────────────────────────────────────────────
// Boolean flags consumed by hybridMessage gates.
export function enforcementRules(providerKey) {
    return {
        repoCommandOnlyLine: true,          // repo intent → single bare command line only
        requireRepoReceiptHeader: true,     // repo-intent turns only → response must have [TOOL: repo_access | ...] header
        autoContinueOnTruncation: true,     // TRUNCATED_CONTINUE marker → auto-continuation call
    };
}

// ── PROVIDER ADDENDUM ─────────────────────────────────────────────────────────
// Small, provider-specific behavioral nudge injected after OPERATIONAL_BOOTSTRAP.
// Must not duplicate or override bootstrap content — additive only.
export function buildProviderAddendum(providerKey) {
    const shared = `
PROVIDER_CONTRACT_BEGIN (provider=${providerKey})
- No hedging. Do not say "if". State what you did or what you need.
- If response would be truncated, output exactly the marker "TRUNCATED_CONTINUE" at the end of the message, then continue in the next message automatically.
- Repo command mode (ABSOLUTE): when the intent is to read/browse/search/list repo files, output ONLY the raw command on a single line. No preamble. No explanation. No trailing text. Examples:
    open functions/core/promptBuilder
    ls pages
PROVIDER_CONTRACT_END
`;

    const providerNotes = {
        gemini: `\nGEMINI_ADAPTER: You are running via Google Gemini on the CAOS platform. Your base training may prefer verbose formatting — suppress it. Match the directness of the OPERATIONAL_BOOTSTRAP directives exactly. Treat all BOOTSTRAP_SIGNATURE=v2 rules as hard constraints, not suggestions.\n`,
        grok:   `\nGROK_ADAPTER: You are running via xAI Grok on the CAOS platform. Apply OPERATIONAL_BOOTSTRAP directives at full fidelity.\n`,
        openai: `\nOPENAI_ADAPTER: You are running via OpenAI GPT-5.2 on the CAOS platform. Apply OPERATIONAL_BOOTSTRAP directives at full fidelity.\n`,
    };

    return (providerNotes[providerKey] || '') + shared;
}

// ── REPO COMMAND HEURISTIC ────────────────────────────────────────────────────
// Returns true if the user input looks like a repo read/browse/search intent.
export function isRepoIntent(input) {
    if (!input) return false;
    return /^(open|show|read|cat|ls|list)\s+\S+/i.test(input.trim());
}

// ── COMPLIANCE RETRY NUDGE ────────────────────────────────────────────────────
// System nudge message appended on compliance retry.
export function repoComplianceNudge(input) {
    return `COMPLIANCE_RETRY: Your previous response did not comply with repo command absolutism. The user asked: "${input}". Output ONLY a single bare command line — nothing else. No explanation, no preamble, no markdown.`;
}

// ── TOOL RECEIPT INJECTOR ─────────────────────────────────────────────────────
// If the model didn't include a tool receipt header, inject one platform-side.
export function injectToolReceipt(reply, toolName, action, target) {
    const header = `[TOOL: ${toolName} | ACTION: ${action} | TARGET: ${target}]\n`;
    if (reply.startsWith('[TOOL:')) return reply; // already present
    return header + reply;
}

// ── HTTP HANDLER (passthrough — callable for smoke tests) ─────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { inferenceProvider, resolvedModel, input } = body;

        const providerKey = normalizeProvider(inferenceProvider, resolvedModel);
        return Response.json({
            ok: true,
            providerKey,
            defaults: providerDefaults(providerKey),
            rules: enforcementRules(providerKey),
            addendum: buildProviderAddendum(providerKey),
            isRepoIntent: isRepoIntent(input),
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});