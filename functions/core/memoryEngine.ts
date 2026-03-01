/**
 * MODULE: memoryEngine
 * CONTRACT v1 — 2026-03-01
 * LOCK_SIGNATURE: CAOS_MEMORY_ENGINE_MODULE_v1_2026-03-01
 *
 * RESPONSIBILITIES:
 *   - detectMemorySave(input) → content | '__VAGUE__' | '__PRONOUN__' | null
 *   - saveAtomicMemory(base44, userProfile, content, userEmail) → { saved, deduped, rejected }
 *   - detectMemoryRecall(input) → boolean
 *   - recallStructuredMemory(structuredMemory, query) → matched entries[]
 *
 * INPUT CONTRACT:
 *   POST body: { action: 'detect_save' | 'save' | 'detect_recall' | 'recall', input, userProfile?, content?, userEmail?, structuredMemory?, query? }
 *
 * OUTPUT CONTRACT:
 *   detect_save → { result: string | null }
 *   save        → { saved: [], deduped: [], rejected: [] }
 *   detect_recall → { result: boolean }
 *   recall      → { matches: [] }
 *
 * INVARIANTS (do not change without new lock + TSB):
 *   - MEMORY_SAVE_TRIGGERS list is the sole authority for save detection
 *   - splitAtomicFacts() is conservative — only splits on " and " with predicate check
 *   - extractTags() stopword list is fixed
 *   - No DB writes in detect_save or detect_recall or recall (pure functions)
 *   - DB writes ONLY in 'save' action
 *   - Phase B (normalized_fields) and Phase C (entity_refs) fields exist but are null
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── MEMORY SAVE TRIGGERS ────────────────────────────────────────────────────
const MEMORY_SAVE_TRIGGERS = [
    /^i want you to remember\b(.*)/i,
    /^please remember\b(.*)/i,
    /^remember\s+(?:this|these|that)\b[:\s]*(.*)/i,
    /^remember\s+that\b(.*)/i,
    /^remember\b[:\s]+(.*)/i,
    /^can you remember\b(.*)/i,
    /^save(?:\s+this)?\s+to\s+memory[:\s]*(.*)/i,
    /^add(?:\s+this)?\s+to\s+memory[:\s]*(.*)/i,
    /^note\s+(?:this|that)[:\s]*(.*)/i,
    /^store\s+(?:this|that)[:\s]*(.*)/i,
];

const MEMORY_RECALL_TRIGGERS = [
    /\b(?:what do you remember about|do you remember|recall|you told me|you mentioned|what did I tell you about)\b/i,
    /\b(?:what do you know about me|what have I told you)\b/i,
];

const PRONOUN_PATTERN = /\b(she|he|they|her|him|them|it)\b/i;
const VAGUE_WORDS = new Set(['this','these','that','them','it','things','thing','too','also','as','well','please','ok','okay','all','of','right','yes','yep','yeah']);

// ─── PURE FUNCTIONS ──────────────────────────────────────────────────────────

function detectMemorySave(input) {
    const trimmed = input.trim();
    for (const pattern of MEMORY_SAVE_TRIGGERS) {
        const match = trimmed.match(pattern);
        if (match) {
            const captured = (match[1] || '').trim();
            const cleaned = captured
                .replace(/[,.]?\s*(okay|ok|alright|right|too|as well|please)[?.]?\s*$/i, '')
                .replace(/[?.]$/, '')
                .replace(/^[\s,?:.]+/, '')
                .trim();
            if (!cleaned || cleaned.length < 3) return '__VAGUE__';
            const meaningfulWords = cleaned.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 1 && !VAGUE_WORDS.has(w));
            if (meaningfulWords.length === 0) return '__VAGUE__';
            if (PRONOUN_PATTERN.test(cleaned)) return '__PRONOUN__';
            return cleaned;
        }
    }
    return null;
}

function detectMemoryRecall(input) {
    return MEMORY_RECALL_TRIGGERS.some(p => p.test(input));
}

function extractTags(content) {
    const stopwords = new Set(['a','an','the','is','it','to','of','and','or','in','on','at','for','with','that','this','was','are','do','you','what','how','why','when','who','did','have','has','had','my','me','i','we','he','she','they','be','been','am','not','no','if','so']);
    return content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopwords.has(w))
        .map(w => w.endsWith('s') && w.length >= 6 ? w.slice(0, -1) : w)
        .slice(0, 8);
}

function splitAtomicFacts(content) {
    const parts = content.split(/\s+and\s+/i).map(p => p.trim()).filter(p => p.length >= 4);
    if (parts.length <= 1) return [content];
    const facts = [];
    let buffer = '';
    for (const part of parts) {
        const candidate = buffer ? `${buffer} and ${part}` : part;
        const looksLikeFact = /\b(is|was|are|were|have|has|prefer|like|own|named|called|born|died|work|live|drive|use|my|the)\b/i.test(part);
        if (looksLikeFact || facts.length === 0) {
            if (buffer) facts.push(buffer);
            buffer = part;
        } else {
            buffer = candidate;
        }
    }
    if (buffer) facts.push(buffer);
    return facts.length > 1 ? facts : [content];
}

function isValidMemoryContent(content) {
    if (!content || content.trim().length < 3) return false;
    const stripped = content.replace(/[^a-z0-9\s]/gi, '').trim();
    return stripped.length >= 2;
}

function recallStructuredMemory(structuredMemory, query) {
    if (!structuredMemory || structuredMemory.length === 0) return [];
    const queryTokens = extractTags(query);
    if (queryTokens.length === 0) return structuredMemory.slice(-5);
    const scored = structuredMemory.map(entry => {
        const entryTokens = new Set([...(entry.tags || []), ...extractTags(entry.content)]);
        const hits = queryTokens.filter(t => entryTokens.has(t)).length;
        return { entry, hits };
    });
    const matched = scored.filter(s => s.hits > 0);
    if (matched.length === 0) return structuredMemory.slice(-5);
    return matched.sort((a, b) => b.hits - a.hits).slice(0, 10).map(s => s.entry);
}

async function saveAtomicMemory(base44, userProfile, content, userEmail) {
    const clauses = splitAtomicFacts(content);
    const existing = userProfile?.structured_memory || [];
    const newEntries = [], deduped = [], rejected = [];

    for (const clause of clauses) {
        const trimmed = clause.trim();
        if (!isValidMemoryContent(trimmed)) { rejected.push(trimmed); continue; }
        const duplicate = existing.find(e => e.content.toLowerCase() === trimmed.toLowerCase());
        if (duplicate) { deduped.push(duplicate); continue; }
        const entry = {
            id: crypto.randomUUID(),
            content: trimmed,
            created_at: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            scope: 'profile',
            tags: extractTags(trimmed),
            source: 'user_trigger',
            normalized_fields: null, // Phase B reserved
            entity_refs: null        // Phase C reserved
        };
        newEntries.push(entry);
        existing.push(entry);
    }

    if (newEntries.length > 0) {
        if (userProfile) {
            await base44.entities.UserProfile.update(userProfile.id, { structured_memory: existing });
        } else {
            await base44.entities.UserProfile.create({ user_email: userEmail, structured_memory: newEntries });
        }
        console.log('🧠 [ATOMIC_MEMORY_SAVED]', { count: newEntries.length });
    }

    return { saved: newEntries, deduped, rejected };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { action } = body;

        if (action === 'detect_save') {
            return Response.json({ result: detectMemorySave(body.input) });
        }

        if (action === 'detect_recall') {
            return Response.json({ result: detectMemoryRecall(body.input) });
        }

        if (action === 'recall') {
            return Response.json({ matches: recallStructuredMemory(body.structuredMemory, body.query) });
        }

        if (action === 'save') {
            const profiles = await base44.entities.UserProfile.filter({ user_email: user.email }, '-created_date', 1);
            const userProfile = profiles?.[0] || null;
            const result = await saveAtomicMemory(base44, userProfile, body.content, user.email);
            return Response.json(result);
        }

        return Response.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});