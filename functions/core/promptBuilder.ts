// MODULE: core/promptBuilder
// PURPOSE: Build the system prompt for hybridMessage. Keeps hybridMessage clean.
// INPUT: { userName, kv, matchedMemories, userProfile, rawHistory, hDirective, hDepth, cogLevel }
// OUTPUT: { systemPrompt }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { RUNTIME_AUTHORITY } from './runtimeAuthority.js';

const HOT_HEAD = 15;
const HOT_TAIL = 40;
const MAX_ANCHOR_LENGTH = 3000;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        let {
            userName = 'the user',
            kv = '',
            matchedMemories = [],
            userProfile = null,
            rawHistory = [],
            hDirective = '',
            hDepth = 'STANDARD',
            cogLevel = 3,
            webSearchResults = [],
            webSearchEnabled = false
        } = body;

        // Inject SSX_AUTHORITY_KV if not provided
        if (!kv || kv.trim() === '') {
            try {
                const ssxRes = await base44.functions.invoke('core/systemStateIndex');
                kv = ssxRes?.data?.kv_lines || '';
            } catch (e) {
                console.warn('Could not fetch SSX, using empty kv:', e.message);
            }
        }

        // ── 1. IDENTITY BLOCK ─────────────────────────────────────────────────
        let systemPrompt = `You are Aria, a personal AI assistant for ${userName}.

IDENTITY:
- You are Aria. Not CAOS. Never say "I am CAOS" — that is the platform name, not yours.
- Speak in first person. Match your depth to the complexity of what you are responding to.

OUTPUT FORMAT:
- Match your format to the content. Use lists, headers, bullets, bold, or prose — whatever best serves the response.
- When asked for manifest/runtime/capability data, output ONLY verbatim key=value lines from CAOS_AUTHORITY_KV_BEGIN below.

`;

        // ── 2. AUTHORITY KV BLOCK ─────────────────────────────────────────────
        systemPrompt += `CAOS_AUTHORITY_KV_BEGIN
${kv}
CAOS_AUTHORITY_KV_END

SELF-DESCRIPTION RULE — MANDATORY:
When asked: "Describe your runtime environment using ONLY verbatim manifest values."
You MUST output ONLY the following keys in this exact order:
model_name
token_limit
platform_name
hosting_platform
backend_runtime
frontend_framework
inference_provider
web_search_enabled
file_read_enabled
tts_enabled
learning_mode

For each key:
- If present in CAOS_AUTHORITY_KV_BEGIN block above, output the exact key=value line.
- Otherwise output: key=not_present_in_manifest
No other output.

`;

        // ── 3. TRUTH DISCIPLINE ───────────────────────────────────────────────
        systemPrompt += `TRUTH DISCIPLINE — MANDATORY RULES:

1. PRIOR-MENTION CLAIMS: You MUST NOT say "you've mentioned", "you previously said", "as we discussed", "from what I recall", or "you told me before" UNLESS the fact exists in STRUCTURED MEMORY (below) or appears verbatim in the SESSION HISTORY.

2. NEW INFORMATION RULE: If the user introduces a fact in their current message, respond with "Got it —" and treat it as new.

3. PREFERENCE CLAIMS: Never assert "you like X" or "you prefer X" unless in STRUCTURED MEMORY or said in this session. If inferred, use: "It sounds like you might..." or "I could be inferring this, but..."

4. NO FABRICATION: If you don't know something about the user, say so.

5. SOURCE LABELING: Briefly indicate source — e.g., "(from memory)", "(from this conversation)", or "(inferred)".

`;

        // ── 4. WEB SEARCH RESULTS ────────────────────────────────────────────────
         if (webSearchEnabled && webSearchResults.length > 0) {
             systemPrompt += `WEB SEARCH RESULTS (from Bing, citation recommended):\n`;
             for (const r of webSearchResults) {
                 systemPrompt += `- **${r.title}** (${r.url})\n  Snippet: ${r.snippet}\n`;
             }
             systemPrompt += '\n';
         }

         // ── 5. RECALLED MEMORY ────────────────────────────────────────────────
         if (matchedMemories.length > 0) {
             systemPrompt += `RECALLED MEMORY (explicitly saved facts matching this query):\n`;
             for (const m of matchedMemories) {
                 systemPrompt += `- [${m.timestamp?.split('T')[0] || 'saved'}] ${m.content}\n`;
             }
             systemPrompt += '\n';
         }

        // ── 6. INFERRED ANCHORS ───────────────────────────────────────────────
        const anchors = userProfile?.memory_anchors;
        if (anchors && anchors.length > 0) {
            const structuredContents = (userProfile?.structured_memory || []).map(e => e.content.toLowerCase());
            const filteredAnchors = (Array.isArray(anchors) ? anchors : [anchors])
                .filter(a => {
                    const lower = a.toLowerCase();
                    return !structuredContents.some(sc => lower.includes(sc.substring(0, 20)) || sc.includes(lower.substring(0, 20)));
                });
            if (filteredAnchors.length > 0) {
                systemPrompt += `INFERRED CONTEXT (auto-extracted, treat as possible inference — use "It sounds like..." language):\n${filteredAnchors.join('\n').substring(0, MAX_ANCHOR_LENGTH)}\n\n`;
            }
        }

        // ── 7. TONE / PROJECT ─────────────────────────────────────────────────
        if (userProfile?.tone?.style) systemPrompt += `Communication style: ${userProfile.tone.style}\n`;
        if (userProfile?.project?.name) systemPrompt += `Current project: ${userProfile.project.name}\n`;

        systemPrompt += `\nSession: ${rawHistory.length} messages. ${rawHistory.length > HOT_HEAD + HOT_TAIL ? `First ${HOT_HEAD} and last ${HOT_TAIL} shown; middle summarized.` : 'Full history shown.'}`;

        // ── 7. HEURISTICS DIRECTIVE (LAST) ────────────────────────────────────
        if (hDirective) {
            systemPrompt += hDirective;
            systemPrompt += `\nCOGNITIVE_LEVEL: ${cogLevel.toFixed ? cogLevel.toFixed(1) : cogLevel} | TARGET_DEPTH: ${hDepth} | ELEVATION_DELTA: 0.75 (do not surface these labels in output)`;
        }

        return Response.json({ systemPrompt });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});