/**
 * MODULE: context/threadHydrator
 * CTC Phase 2 — 2026-03-04
 *
 * RESPONSIBILITY:
 *   Given a list of thread_ids, load their ContextSeeds and return
 *   hydrated ARC packs ready for prompt injection.
 *   Updates last_hydrated_at on every seed it loads.
 *
 * THIS MODULE NEVER:
 *   - Loads raw message content
 *   - Makes OpenAI calls
 *   - Decides what to inject (that's arcAssembler — Phase 3)
 *
 * INPUT CONTRACT:
 *   POST body: {
 *     thread_ids: string[],
 *     user_email: string,
 *     max_seeds_per_thread?: number  // default 1 (most recent seed)
 *   }
 *
 * OUTPUT CONTRACT:
 *   {
 *     hydrated: HydratedThread[],
 *     hydrated_at: ISO string,
 *     total_seeds: number
 *   }
 *
 * HydratedThread shape:
 *   {
 *     thread_id: string,
 *     thread_title: string,
 *     seed_id: string,
 *     arc_pack: object,          // the compressed context payload
 *     seed_created_at: ISO,      // PATCH CSC-TIME: when seed was compressed
 *     source_span: {             // PATCH CSC-TIME: time range of source messages
 *       from_ts: ISO,
 *       to_ts: ISO
 *     },
 *     temperature: string,       // HOT/WARM/COLD
 *     last_active_at: ISO,       // from ThreadIndex
 *     importance_score: number
 *   }
 *
 * PATCH CTC-TIME-001:
 *   Every hydrated pack MUST include seed_created_at and source_span.
 *   These timestamps are required for injection block rendering in ChatBubble.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── TEMPERATURE RECALC (same rule as threadIndexLoader) ─────────────────────
function calculateTemperature(last_active_at) {
  if (!last_active_at) return 'COLD';
  const ageMs = Date.now() - new Date(last_active_at).getTime();
  const hours = ageMs / (1000 * 60 * 60);
  if (hours <= 24)       return 'HOT';
  if (hours <= 24 * 30)  return 'WARM';
  if (hours <= 24 * 90)  return 'COLD';
  return 'VANISH';
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { thread_ids, user_email, max_seeds_per_thread = 1 } = body;
    const hydrated_at = new Date().toISOString();

    if (!thread_ids || thread_ids.length === 0) {
      return Response.json({ hydrated: [], hydrated_at, total_seeds: 0 });
    }

    const target_email = user_email || user.email;

    // 1. Load ThreadIndex entries for requested threads
    const threadIndexEntries = await base44.entities.ThreadIndex.filter(
      { user_email: target_email },
      '-last_active_at',
      200
    );
    const threadMap = {};
    for (const t of threadIndexEntries) {
      threadMap[t.thread_id] = t;
    }

    // 2. For each thread_id — load seeds in parallel
    const hydratePromises = thread_ids.map(async (thread_id) => {
      const threadMeta = threadMap[thread_id];
      if (!threadMeta) return null;

      // Temperature check — never hydrate VANISH
      const temp = calculateTemperature(threadMeta.last_active_at);
      if (temp === 'VANISH') return null;

      // Load most recent seed(s) for this thread
      const seeds = await base44.entities.ContextSeed.filter(
        { thread_id, user_email: target_email },
        '-created_at',
        max_seeds_per_thread
      );

      if (!seeds || seeds.length === 0) return null;

      const seed = seeds[0]; // most recent

      // PATCH CSC-TIME-001: Update last_hydrated_at on load
      await base44.asServiceRole.entities.ContextSeed.update(seed.id, {
        last_hydrated_at: hydrated_at
      });

      return {
        thread_id,
        thread_title: threadMeta.title || thread_id,
        seed_id: seed.seed_id || seed.id,
        arc_pack: seed.arc_pack_json || {},
        seed_created_at: seed.created_at || null,        // PATCH CSC-TIME-001
        source_span: seed.source_span || null,            // PATCH CSC-TIME-001
        temperature: temp,
        last_active_at: threadMeta.last_active_at || null,
        importance_score: seed.importance_score || 0.5
      };
    });

    const results = await Promise.all(hydratePromises);
    const hydrated = results.filter(Boolean);

    console.log('💧 [THREAD_HYDRATED]', {
      requested: thread_ids.length,
      hydrated: hydrated.length,
      hydrated_at
    });

    return Response.json({
      hydrated,
      hydrated_at,
      total_seeds: hydrated.length
    });

  } catch (err) {
    console.error('🔥 [THREAD_HYDRATOR_FAILED]', err.message);
    // Non-fatal — return empty so pipeline continues without cross-thread context
    return Response.json({
      hydrated: [],
      hydrated_at: new Date().toISOString(),
      total_seeds: 0,
      error: err.message
    });
  }
});