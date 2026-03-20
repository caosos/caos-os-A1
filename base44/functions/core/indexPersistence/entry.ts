/**
 * CAOS:INDEX.PERSISTENCE/v1.0
 * 
 * Database-backed thread token index
 * Full rebuild + incremental updater
 * Deterministic only. No logic drift.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6'
import { normalizeText, extractTokens, hashTitle } from "./tokenizer.ts"

// ─────────────────────────────────────────────
// REBUILD: FULL INDEX (ADMIN ONLY)
// ─────────────────────────────────────────────

export async function rebuildThreadTokenIndex(base44: any): Promise<{
  success: boolean
  threadsProcessed: number
  tokensInserted: number
  duration_ms: number
  error?: string
}> {
  const startTime = Date.now()

  try {
    // 1. Fetch all threads
    const threads = await base44.asServiceRole.entities.Conversation.filter({}, '-updated_date', 1000)

    if (!threads || threads.length === 0) {
      return {
        success: true,
        threadsProcessed: 0,
        tokensInserted: 0,
        duration_ms: Date.now() - startTime
      }
    }

    // 2. Delete existing index (transaction prep)
    await base44.asServiceRole.entities.ThreadToken.filter({}, undefined, 1000000)
      .then(async (tokens: any) => {
        for (const token of tokens) {
          await base44.asServiceRole.entities.ThreadToken.delete(token.id)
        }
      })
      .catch(() => null) // Table might be empty

    // Delete existing metadata
    await base44.asServiceRole.entities.ThreadTokenMeta.filter({}, undefined, 1000000)
      .then(async (metas: any) => {
        for (const meta of metas) {
          await base44.asServiceRole.entities.ThreadTokenMeta.delete(meta.id)
        }
      })
      .catch(() => null) // Table might be empty

    // 3. Process each thread
    let totalTokensInserted = 0

    for (const thread of threads) {
      const normalized = normalizeText(thread.title || "")
      const titleHash = await hashTitle(normalized)
      const tokens = extractTokens(normalized)

      // Insert thread tokens
      for (const token of tokens) {
        await base44.asServiceRole.entities.ThreadToken.create({
          token,
          thread_id: thread.id,
          source: "title",
          token_version: 1,
          created_at: new Date().toISOString()
        })
        totalTokensInserted++
      }

      // Insert metadata
      await base44.asServiceRole.entities.ThreadTokenMeta.create({
        thread_id: thread.id,
        title_hash: titleHash,
        token_count: tokens.length,
        updated_at: new Date().toISOString()
      })
    }

    return {
      success: true,
      threadsProcessed: threads.length,
      tokensInserted: totalTokensInserted,
      duration_ms: Date.now() - startTime
    }
  } catch (error) {
    return {
      success: false,
      threadsProcessed: 0,
      tokensInserted: 0,
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// ─────────────────────────────────────────────
// INCREMENTAL: UPDATE SINGLE THREAD
// ─────────────────────────────────────────────

export async function incrementalUpsertThreadIndex(
  base44: any,
  thread_id: string,
  new_title: string
): Promise<{
  success: boolean
  changed: boolean
  old_token_count?: number
  new_token_count?: number
  duration_ms: number
  error?: string
}> {
  const startTime = Date.now()

  try {
    // 1. Normalize and hash
    const normalized = normalizeText(new_title)
    const newHash = await hashTitle(normalized)
    const newTokens = extractTokens(normalized)

    // 2. Check if already indexed with same hash
    const existingMeta = await base44.asServiceRole.entities.ThreadTokenMeta.filter(
      { thread_id },
      undefined,
      1
    )

    if (existingMeta.length > 0 && existingMeta[0].title_hash === newHash) {
      return {
        success: true,
        changed: false,
        duration_ms: Date.now() - startTime
      }
    }

    const oldTokenCount = existingMeta.length > 0 ? existingMeta[0].token_count : 0

    // 3. Delete old tokens
    const oldTokens = await base44.asServiceRole.entities.ThreadToken.filter(
      { thread_id, source: "title", token_version: 1 },
      undefined,
      1000
    )

    for (const token of oldTokens) {
      await base44.asServiceRole.entities.ThreadToken.delete(token.id)
    }

    // 4. Insert new tokens
    for (const token of newTokens) {
      await base44.asServiceRole.entities.ThreadToken.create({
        token,
        thread_id,
        source: "title",
        token_version: 1,
        created_at: new Date().toISOString()
      })
    }

    // 5. Upsert metadata
    if (existingMeta.length > 0) {
      await base44.asServiceRole.entities.ThreadTokenMeta.update(existingMeta[0].id, {
        title_hash: newHash,
        token_count: newTokens.length,
        updated_at: new Date().toISOString()
      })
    } else {
      await base44.asServiceRole.entities.ThreadTokenMeta.create({
        thread_id,
        title_hash: newHash,
        token_count: newTokens.length,
        updated_at: new Date().toISOString()
      })
    }

    return {
      success: true,
      changed: true,
      old_token_count: oldTokenCount,
      new_token_count: newTokens.length,
      duration_ms: Date.now() - startTime
    }
  } catch (error) {
    return {
      success: false,
      changed: false,
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}