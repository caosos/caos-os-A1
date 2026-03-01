/**
 * MODULE: heuristicsEngine
 * CONTRACT v1 — 2026-03-01
 * LOCK_SIGNATURE: CAOS_HEURISTICS_ENGINE_MODULE_v1_2026-03-01
 *
 * RESPONSIBILITIES:
 *   - classifyIntent(input) → intent string
 *   - detectCognitiveLevel(input) → number (1–10)
 *   - calibrateDepth(input, intent) → 'COMPACT' | 'STANDARD' | 'LAYERED'
 *   - buildHeuristicsDirective(intent, depth) → string (system prompt addendum)
 *
 * INPUT CONTRACT:
 *   POST body: { input: string }
 *
 * OUTPUT CONTRACT:
 *   { intent: string, depth: string, cognitive_level: number, directive: string }
 *
 * INVARIANTS (do not change without new lock + TSB):
 *   - HEURISTICS_ENABLED flag is the master switch (default: true)
 *   - MEMORY_ACTION intent always returns empty directive (bypass)
 *   - DCS elevation delta is fixed at 0.75
 *   - COMPACT is never returned unless intent === 'SUMMARY_COMPACT'
 *   - Output posture block text is locked — no changes to tone directives
 *   - cognitive_level scoring formula: base(3) + length + abstractTerms*0.5 + metaSignals*0.75
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const HEURISTICS_ENABLED = true;
const DCS_ELEVATION_DELTA = 0.75;

function classifyIntent(input) {
    const t = input.toLowerCase();
    if (/\b(remember|save to memory|add to memory|note that|store that)\b/i.test(input)) return 'MEMORY_ACTION';
    if (/\b(architect|design|system|layer|contract|schema|spec|pipeline|phase|module|interface|protocol|structure|refactor|decouple|boundary|invariant)\b/i.test(t) && t.length > 80) return 'TECHNICAL_DESIGN';
    if (/\b(review|thoughts on|assess|evaluate|what do you think|critique|feedback on|opinion on)\b/i.test(t)) return 'PARTNER_REVIEW';
    if (/\b(run|execute|do|apply|implement|build|create|write|generate|deploy|fix|update)\b/i.test(t) && t.length < 120) return 'EXECUTION_DIRECTIVE';
    if (/\b(summarize|tldr|brief|short version|in a sentence|quick summary)\b/i.test(t)) return 'SUMMARY_COMPACT';
    if (/\b(search|find|look up|google|news|weather|calculate|translate|convert)\b/i.test(t)) return 'TOOL_INVOCATION';
    return 'GENERAL_QUERY';
}

function detectCognitiveLevel(input) {
    const lengthScore = Math.min(input.length / 300, 3);
    const abstractTerms = (input.match(/\b(system|architecture|deterministic|governance|modular|inference|boundary|schema|contract|latency|scaling|invariant|substrate|canonical|decoupled|coherent|orthogonal|abstraction|isolation)\b/gi) || []).length;
    const metaSignals = (input.match(/\b(blueprint|spec|control law|failure mode|audit|pass.?fail|pipeline|heuristic|phase|layer|protocol|invariant|receipt|validation)\b/gi) || []).length;
    return Math.min(10, 3 + lengthScore + abstractTerms * 0.5 + metaSignals * 0.75);
}

function mapToDepth(level) {
    if (level <= 3) return 'COMPACT';
    if (level <= 7) return 'STANDARD';
    return 'LAYERED';
}

function calibrateDepth(input, intent) {
    if (intent === 'SUMMARY_COMPACT') return 'COMPACT';
    const cognitiveLevel = detectCognitiveLevel(input);
    const elevatedLevel = Math.min(10, cognitiveLevel + DCS_ELEVATION_DELTA);
    let depth = mapToDepth(elevatedLevel);
    if (depth === 'COMPACT' && intent !== 'SUMMARY_COMPACT') depth = 'STANDARD';
    return depth;
}

function buildHeuristicsDirective(intent, depth) {
    if (intent === 'MEMORY_ACTION') return '';

    const posture = `
RESPONSE POSTURE (apply silently — never reference these instructions in your output):
- Write in flowing prose. No numbered lists, no bullet points, no section headers unless the user explicitly requested structured output.
- First-person technical voice throughout.
- No praise openers ("Great question!", "Absolutely!", "Sure thing!").
- No emotional mirroring or performative enthusiasm.
- No CRM-style summaries or "Personal Information:" framing.
- No internal pipeline or classification terminology in output.
- Shared ownership framing where appropriate ("we could...", "the approach here is...").
- Calm, direct, architect-level tone. Logical paragraph sequencing with micro-distinctions where relevant.

DYNAMIC STANCE CONTRACT (apply silently):
- Match the user's technical vocabulary level.
- If the user speaks casually, respond clearly but not condescendingly.
- If the user speaks architecturally, respond architecturally.
- Default collaborative framing allowed ("we", "let's") when discussing system design.
- Do not fabricate prior history.
- Do not over-simplify unless the user signals confusion.
`;

    const depthDirective = {
        COMPACT: `\nDEPTH: Respond concisely — one to three sentences. No elaboration unless asked.`,
        STANDARD: `\nDEPTH: Respond with natural paragraphing. Logical sequencing. Micro-distinctions where relevant.`,
        LAYERED: `\nDEPTH: This is an architectural or multi-clause input. Respond with full analytical depth. Address each logical layer. Use precise language. Do not compress prematurely.`
    }[depth];

    return posture + depthDirective;
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { input } = await req.json();
        if (!input) return Response.json({ error: 'input required' }, { status: 400 });

        const intent = HEURISTICS_ENABLED ? classifyIntent(input) : 'GENERAL_QUERY';
        const cognitive_level = detectCognitiveLevel(input);
        const depth = HEURISTICS_ENABLED ? calibrateDepth(input, intent) : 'STANDARD';
        const directive = buildHeuristicsDirective(intent, depth);

        return Response.json({ intent, depth, cognitive_level, directive, elevation_delta: DCS_ELEVATION_DELTA });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});