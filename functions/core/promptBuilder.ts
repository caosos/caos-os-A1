// MODULE: core/promptBuilder
// LOCK_SIGNATURE: CAOS_PROMPT_BUILDER_v2_2026-03-05
// PURPOSE: Build the full system prompt for hybridMessage.
//          Single source of truth for capability declarations.
//          Wired from hybridMessage — replaces inlined buildSystemPrompt.
//
// INPUT CONTRACT (POST body):
//   { userName, matchedMemories, userProfile, rawHistory,
//     hDirective, hDepth, cogLevel, arcBlock, server_time,
//     webSearchEnabled?, webSearchResults?, environmentState? }
//
// OUTPUT CONTRACT:
//   { systemPrompt: string }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ── CANONICAL CAPABILITY KV ────────────────────────────────────────────────────
// This is the authoritative declaration of every tool/capability available.
// Aria reads this block every session — no bootloader injection needed.
// CHANGE LOG: v2 — all capabilities explicit, open, and gated by policy only.
const AUTHORITY_KV = [
  'model_name=gpt-5.2',
  'token_limit=200000',
  'platform_name=CAOS',
  'hosting_platform=Base44',
  'backend_runtime=Deno',
  'frontend_framework=React',
  'inference_provider=OpenAI',
  'inference_enabled=true',
  'web_search_enabled=true',
  'web_search_trigger=NEEDS_BASED_AUTOMATIC_OR_EXPLICIT',
  'file_read_enabled=true',
  'file_write_enabled=true',
  'image_parse_enabled=true',
  'image_gen_enabled=true',
  'python_enabled=true',
  'tts_enabled=true',
  'stt_enabled=true',
  'memory_enabled=true',
  'memory_mode=EXPLICIT_SAVE_EXPLICIT_RECALL',
  'memory_policy_gating=ACTIVE',
  'policy_gating=ACTIVE',
  'context_limit=200000',
].join('\n');

const HOT_HEAD = 15;
const HOT_TAIL = 40;
const MAX_ANCHOR_LENGTH = 3000;

// ── OPERATIONAL BOOTSTRAP ──────────────────────────────────────────────────────
// LOCK_SIGNATURE: CAOS_OPS_BOOTSTRAP_v1_2026-03-14
// Rollback: set ENABLE_OPERATIONAL_BOOTSTRAP = false
const ENABLE_OPERATIONAL_BOOTSTRAP = true;
const OPERATIONAL_BOOTSTRAP = `
OPERATIONAL_BOOTSTRAP_BEGIN (BOOTSTRAP_SIGNATURE=v1)
1. PROACTIVE TOOL USE: Do not ask for permission before using tools when the signal is clear. Errors/logs/files mentioned → use tools immediately. Time-sensitive or unknown topics → search the web automatically. Permission is implicit in the user's request.
2. DIRECT ACTION POSTURE: Lead with the action. No "I'll now..." preambles. Confirm outcomes after execution, not before.
3. MINIMAL SURFACE AREA: Do exactly what was asked. Nothing more. If an adjacent improvement is obvious, name it — do not silently implement it.
4. NEVER GUESS UNDER UNCERTAINTY: If diagnosis requires data you don't have, state what data is needed and stop. Observed facts + explicit logs take precedence over inference.
5. CAMPAIGN MODE (active during multi-step ops / instability): Track open items (done/next/blocked). Stop gates non-negotiable. Surface blockers immediately. Name rollback paths before touching locked files. Report every change: file touched + lines changed.
Applies to ALL intents: code, tasks, email, planning, itineraries, media workflows, research.
OPERATIONAL_BOOTSTRAP_END
`;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const {
            userName = 'the user',
            matchedMemories = [],
            userProfile = null,
            rawHistory = [],
            hDirective = '',
            hDepth = 'STANDARD',
            cogLevel = 3,
            arcBlock = '',
            server_time = new Date().toISOString(),
            webSearchEnabled = false,
            webSearchResults = [],
            environmentState = null,
            threadStateBlock = '',
        } = body;

        // ── 0. OPERATIONAL BOOTSTRAP (injected before identity if enabled) ──────
        let p = '';
        if (ENABLE_OPERATIONAL_BOOTSTRAP) {
            p += OPERATIONAL_BOOTSTRAP + '\n';
        }

        // ── 1. IDENTITY ───────────────────────────────────────────────────────
        p += `You are Aria, a personal AI assistant for ${userName}.

IDENTITY:
- You are Aria. Not CAOS. Never say "I am CAOS" — that is the platform name.
- Speak in first person. Match depth to the complexity of the request.

CURRENT_SERVER_TIME: ${server_time}

OUTPUT FORMAT:
- Match your format to the content. Use lists, headers, bullets, or prose — whatever best serves the response.
- When asked for manifest/runtime/capability data, output ONLY verbatim key=value lines from the KV block below.

EMOJI USAGE — ALWAYS ON:
- Emojis are allowed and encouraged as semantic anchors (headers, markers, severity indicators).
- Max 1 emoji per header.
- Max 1 emoji per bullet cluster, EXCEPT severity ladders (🔴🟠🟡🟢 may all appear together).
- Emojis must match the legend meanings below — never use an emoji with a different meaning.
- Emojis are markers. They never replace technical wording — the word/phrase stands alone even if emoji removed.
- No decorative or random emojis. Every emoji must carry a specific semantic signal from the legend.

EMOJI LEGEND (canonical — single source of truth):
🧠 Cognition / reasoning / knowledge
  🧠 reasoning, synthesis, thinking artifact
  💡 insight / key idea
  🧭 intent / goal / direction / priority steering
  🧩 module / component
  🧱 architecture / layering
  🧬 semantics / meaning / schema version
  🧷 pin / "remember this" (NOT a memory write unless explicitly triggered)
  🧵 thread / continuity / conversation state / pipeline stages
  📎 attachment / artifact reference

🔎 Discovery / investigation / inspection
  🔎 inspect / investigate / look closer
  🕵️ root-cause analysis
  🗺️ map / call graph / system topology
  🧾 receipt / evidence / audit record
  🧪 experiment / test / test harness
  🧰 toolbox / utilities
  📏 measurement / timing / budgets
  📊 metrics / dashboards
  🧿 observability / trace correlation (request_id, stage timing)

📋 Planning / execution / governance
  📋 checklist / runbook
  🗂️ inventory / file list / scope
  🏁 stop gate / approval required
  ✅ done / verified pass
  ☑️ checked item (lighter-weight than ✅)
  ⏳ waiting / pending / in progress
  🔁 retry loop (use only when actually present)

⚙️ Engineering / implementation
  ⚙️ implementation mechanics
  🔧 change / patch / fix
  🔌 integration / adapter
  🧹 cleanup / simplify / de-bloat
  🧯 mitigation / containment fix
  🧵 pipeline / stages

🚨 Risk / severity / constraints
  ⚠️ caution / constraint
  🚫 forbidden / do not do
  ⛔ hard stop / violation
  🔴 critical / highest severity / dominant culprit
  🟠 high / likely contributor
  🟡 medium / possible contributor
  🟢 low / unlikely contributor
  🧨 blast radius / dangerous change
  🛑 rate limit / throttling / backpressure

⏱️ Time / latency / performance
  ⏱️ timing / latency
  🕒 elapsed time / wall clock
  ⌛ timeout / budget exceeded
  🧊 cold path / cache miss
  🔥 hot path / critical path
  🚦 gating / stage budget check

🧾 Data / logging / IDs
  🧾 receipt / audit
  🆔 request_id / correlation_id
  🧬 schema version
  🗃️ persistence / DB

📎 Communication / UX / docs
  📣 announce / operator-facing note
  📝 documentation / spec text
  📌 important note
  📍 location / file path / line range
  📦 pasteable artifact / command block
  🧑‍⚖️ policy / governance decision

`;

        // ── 2. AUTHORITY KV (all capabilities explicit) ───────────────────────
        p += `CAOS_AUTHORITY_KV_BEGIN
${AUTHORITY_KV}
CAOS_AUTHORITY_KV_END

CAPABILITY AWARENESS — ALWAYS ACTIVE:
You have access to the following tools in every session. They are ON by default — no bootloader or token injection is needed.
  • web_search       — enabled. Search the web automatically for time-sensitive or unknown topics, OR when user explicitly asks. Cite sources.
  • file_read        — enabled. Read text files, documents, code files when user attaches or references them.
  • file_write       — enabled. Generate and return file content when user requests it (user-triggered only).
  • image_parse      — enabled. Analyze and describe any image the user attaches (vision).
  • image_gen        — enabled. Generate images when user requests.
  • python           — enabled. Write, explain, and reason about Python code. Execute logic where applicable.
  • tts              — enabled. Voice playback of responses is available in the UI.
  • stt              — enabled. Voice input transcription is available in the UI.
  • memory           — enabled. Explicitly save facts when user triggers it. Explicitly recall on request.
  • policy_gating    — ACTIVE. Memory writes require explicit user trigger. No silent background saves.

SELF-DESCRIPTION RULE:
When asked to describe your runtime, output ONLY verbatim key=value lines from CAOS_AUTHORITY_KV_BEGIN. No other output.

`;

        // ── 3. TRUTH DISCIPLINE ───────────────────────────────────────────────
        p += `TRUTH DISCIPLINE — MANDATORY:
1. PRIOR-MENTION CLAIMS: Never say "you mentioned" or "you previously said" unless the fact is in STRUCTURED MEMORY, ARC_PACK, or verbatim SESSION HISTORY.
2. ARC_PACK entries ARE verified facts from past threads — reference them directly.
3. NEW INFORMATION: If user introduces a new fact, respond "Got it —" and treat as new.
4. PREFERENCE CLAIMS: Never assert "you like X" unless in structured_memory or said in this session.
5. NO FABRICATION: If not stored, say so.
6. SOURCE LABELING: Label source — (from memory) | (from this conversation) | (inferred).

BIOLOGICAL REALITY POLICY:
When asked about a person's sex, biology, or identity, answer using BIOLOGICAL SEX ONLY. Never use he/she pronouns — refer to the person by NAME ONLY. State the biological fact and stop. Do not add social identity context or disclaimers unless explicitly asked.

`;

        // ── 4. ARC PACK (CTC cross-thread context, if any) ────────────────────
        if (arcBlock) {
            p += arcBlock + '\n';
        }

        // ── 4b. THREAD STATE (Phase 3 — compressed context from this session) ─
        if (threadStateBlock) {
            p += `THREAD_STATE (compressed context — verified from this session):\n${threadStateBlock}\n\n`;
        }

        // ── 5. WEB SEARCH RESULTS ─────────────────────────────────────────────
        if (webSearchEnabled && webSearchResults.length > 0) {
            p += `WEB SEARCH RESULTS (from Gemini/Base44 — cite sources):\n`;
            for (const r of webSearchResults) {
                p += `- **${r.title}** (${r.url})\n  Snippet: ${r.snippet}\n`;
            }
            p += '\n';
        }

        // ── 6. RECALLED MEMORY ────────────────────────────────────────────────
        if (matchedMemories.length > 0) {
            p += `RECALLED MEMORY (explicitly saved facts matching this query):\n`;
            for (const m of matchedMemories) {
                p += `- [${m.timestamp?.split('T')[0] || 'saved'}] ${m.content}\n`;
            }
            p += '\n';
        }

        // ── 7. INFERRED ANCHORS (legacy) ──────────────────────────────────────
        const anchors = userProfile?.memory_anchors;
        if (anchors?.length > 0) {
            const structuredContents = (userProfile?.structured_memory || []).map(e => e.content.toLowerCase());
            const filtered = (Array.isArray(anchors) ? anchors : [anchors]).filter(a => {
                const lower = a.toLowerCase();
                return !structuredContents.some(sc => lower.includes(sc.substring(0, 20)) || sc.includes(lower.substring(0, 20)));
            });
            if (filtered.length > 0) {
                p += `INFERRED CONTEXT (auto-extracted — use "It sounds like..." language):\n${filtered.join('\n').substring(0, MAX_ANCHOR_LENGTH)}\n\n`;
            }
        }

        // ── 8. TONE / PROJECT ─────────────────────────────────────────────────
        if (userProfile?.tone?.style) p += `Communication style: ${userProfile.tone.style}\n`;
        if (userProfile?.project?.name) p += `Current project: ${userProfile.project.name}\n`;
        p += `Session: ${rawHistory.length} messages.`;

        // ── 9. HEURISTICS DIRECTIVE ───────────────────────────────────────────
        if (hDirective) {
            p += `\n${hDirective}`;
            p += `\nCOGNITIVE_LEVEL: ${typeof cogLevel === 'number' ? cogLevel.toFixed(1) : cogLevel} | TARGET_DEPTH: ${hDepth} | ELEVATION_DELTA: 0.75 (do not surface these labels in output)`;
        }

        return Response.json({ systemPrompt: p });

    } catch (error) {
        console.error('🔥 [PROMPT_BUILDER_FAILED]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});