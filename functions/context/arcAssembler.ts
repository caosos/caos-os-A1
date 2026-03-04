/**
 * MODULE: context/arcAssembler
 * CTC Phase 3 — 2026-03-04
 * PRE-FLIGHT DOC: CAOS CTC PHASE 3 PREFLIGHT v1.0
 *
 * RESPONSIBILITY:
 *   Given cross-thread hydrated seeds + current session context,
 *   assemble the final ARC_PACK block for prompt injection.
 *   Returns a formatted string ready to insert into systemPrompt.
 *
 * THIS MODULE NEVER:
 *   - Makes OpenAI calls
 *   - Writes to any entity
 *   - Reads raw messages (seeds only)
 *
 * PROMPT ORDER ENFORCED (Pre-flight §4):
 *   1. SYSTEM (caller handles)
 *   2. ARC PACK (this module produces)
 *      - pinned lane state
 *      - hydrated seeds (sorted by importance_score desc, then recency)
 *      - injection blocks with full timestamps (CTC-TIME-001)
 *   3. WCW (caller handles — current thread history)
 *   4. USER INPUT (caller handles)
 *
 * TOKEN BUDGET (Pre-flight §7):
 *   ARC pack output must stay within arc_token_budget (default: 2000 tokens ≈ 8000 chars).
 *   Seeds are truncated/omitted if budget exceeded — never silently overflow.
 *
 * INPUT CONTRACT:
 *   POST body: {
 *     hydrated: HydratedThread[],       // from threadHydrator
 *     lane_state?: object,              // pinned lane facts (optional)
 *     arc_token_budget?: number,        // default 2000
 *     current_session_id: string
 *   }
 *
 * OUTPUT CONTRACT:
 *   {
 *     arc_block: string,               // formatted prompt block
 *     seeds_included: number,
 *     seeds_omitted: number,
 *     estimated_tokens: number,
 *     assembled_at: ISO string,
 *     injection_meta: Array<{
 *       thread_id, thread_title, seed_id,
 *       injected_at,                   // CTC-TIME-001: when injected into this prompt
 *       source_thread_last_active_at,  // CTC-TIME-001: last activity of source thread
 *       seed_created_at,               // when this seed was compressed
 *       source_span_from,              // earliest message in seed
 *       source_span_to                 // latest message in seed
 *     }>
 *   }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const APPROX_CHARS_PER_TOKEN = 4;
const DEFAULT_BUDGET_TOKENS = 2000;

function estimateTokens(text) {
  return Math.ceil((text || '').length / APPROX_CHARS_PER_TOKEN);
}

// ─── ARC PACK FORMATTER ───────────────────────────────────────────────────────
// Formats one seed's arc_pack into a readable injection block
function formatSeedBlock(hydrated, injected_at) {
  const { thread_title, arc_pack, seed_created_at, source_span, last_active_at } = hydrated;
  const pack = arc_pack || {};

  const lines = [];
  lines.push(`--- CONTEXT FROM: "${thread_title || hydrated.thread_id}" ---`);
  lines.push(`injected_at: ${injected_at}`);
  lines.push(`source_thread_last_active: ${last_active_at || 'unknown'}`);
  lines.push(`seed_compressed_at: ${seed_created_at || 'unknown'}`);
  if (source_span?.from_ts && source_span?.to_ts) {
    lines.push(`covering_messages: ${source_span.from_ts} → ${source_span.to_ts}`);
  }
  lines.push('');

  if (pack.definitions?.length > 0) {
    lines.push('DEFINITIONS:');
    pack.definitions.forEach(d => lines.push(`  · ${d.term}: ${d.definition}`));
    lines.push('');
  }
  if (pack.decisions?.length > 0) {
    lines.push('DECISIONS:');
    pack.decisions.forEach(d => {
      const ts = d.timestamp ? ` [${d.timestamp}]` : '';
      const rationale = d.rationale ? ` — ${d.rationale}` : '';
      lines.push(`  · ${d.decision}${ts}${rationale}`);
    });
    lines.push('');
  }
  if (pack.constraints?.length > 0) {
    lines.push('CONSTRAINTS:');
    pack.constraints.forEach(c => lines.push(`  · ${c.constraint}`));
    lines.push('');
  }
  if (pack.action_items?.length > 0) {
    lines.push('ACTION ITEMS:');
    pack.action_items.forEach(a => {
      const owner = a.owner ? ` [${a.owner}]` : '';
      const dl = a.deadline ? ` by ${a.deadline}` : '';
      lines.push(`  · ${a.task}${owner}${dl}`);
    });
    lines.push('');
  }
  if (pack.references?.length > 0) {
    lines.push('REFERENCES:');
    pack.references.forEach(r => lines.push(`  · [${r.type}] ${r.id_or_value}${r.note ? ' — ' + r.note : ''}`));
    lines.push('');
  }

  lines.push('--- END CONTEXT ---');
  return lines.join('\n');
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      hydrated = [],
      lane_state = null,
      arc_token_budget = DEFAULT_BUDGET_TOKENS,
      current_session_id
    } = body;

    const assembled_at = new Date().toISOString();
    const budget_chars = arc_token_budget * APPROX_CHARS_PER_TOKEN;

    if (hydrated.length === 0) {
      return Response.json({
        arc_block: '',
        seeds_included: 0,
        seeds_omitted: 0,
        estimated_tokens: 0,
        assembled_at,
        injection_meta: []
      });
    }

    // Sort: importance_score desc, then recency desc
    const sorted = [...hydrated].sort((a, b) => {
      const scoreDiff = (b.importance_score || 0.5) - (a.importance_score || 0.5);
      if (Math.abs(scoreDiff) > 0.05) return scoreDiff;
      return new Date(b.last_active_at || 0) - new Date(a.last_active_at || 0);
    });

    // Build arc blocks within budget
    const blocks = [];
    const injection_meta = [];
    let used_chars = 0;
    let seeds_omitted = 0;

    // Optional pinned lane state at top
    if (lane_state?.pinned_state_json) {
      const pinnedBlock = `ARC_PACK_PINNED_CONTEXT:\n${JSON.stringify(lane_state.pinned_state_json, null, 2)}\n`;
      if (used_chars + pinnedBlock.length <= budget_chars) {
        blocks.push(pinnedBlock);
        used_chars += pinnedBlock.length;
      }
    }

    for (const h of sorted) {
      const injected_at = assembled_at; // CTC-TIME-001: timestamp of this injection
      const block = formatSeedBlock(h, injected_at);

      if (used_chars + block.length > budget_chars) {
        seeds_omitted++;
        console.warn('⚠️ [ARC_BUDGET_EXCEEDED] Omitting seed due to token budget', {
          thread_id: h.thread_id,
          block_chars: block.length,
          remaining_chars: budget_chars - used_chars
        });
        continue;
      }

      blocks.push(block);
      used_chars += block.length;

      // CTC-TIME-001: injection metadata with full timestamps
      injection_meta.push({
        thread_id: h.thread_id,
        thread_title: h.thread_title,
        seed_id: h.seed_id,
        injected_at,                              // when injected into this prompt
        source_thread_last_active_at: h.last_active_at || null,  // last activity of source thread
        seed_created_at: h.seed_created_at || null,              // when seed was compressed
        source_span_from: h.source_span?.from_ts || null,
        source_span_to:   h.source_span?.to_ts   || null
      });
    }

    const arc_block = blocks.length > 0
      ? `\nARC_PACK_BEGIN\n${blocks.join('\n')}\nARC_PACK_END\n`
      : '';

    const estimated_tokens = estimateTokens(arc_block);

    console.log('🏗️ [ARC_ASSEMBLED]', {
      seeds_included: injection_meta.length,
      seeds_omitted,
      estimated_tokens,
      assembled_at
    });

    return Response.json({
      arc_block,
      seeds_included: injection_meta.length,
      seeds_omitted,
      estimated_tokens,
      assembled_at,
      injection_meta
    });

  } catch (err) {
    console.error('🔥 [ARC_ASSEMBLER_FAILED]', err.message);
    // Non-fatal — return empty block so pipeline continues
    return Response.json({
      arc_block: '',
      seeds_included: 0,
      seeds_omitted: 0,
      estimated_tokens: 0,
      assembled_at: new Date().toISOString(),
      injection_meta: [],
      error: err.message
    });
  }
});