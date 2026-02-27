import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

// Token budget constants
const MAX_HISTORY_MESSAGES = 200;
const HOT_TAIL = 80;
const HOT_HEAD = 20;
const MAX_ANCHOR_LENGTH = 6000;

// ─── PHASE A: ATOMIC MEMORY FOUNDATION ───────────────────────────────────
// Explicit save triggers — user must use one of these phrases
const MEMORY_SAVE_TRIGGERS = [
    /^i want you to remember\b(.*)/i,
    /^please remember\b(.*)/i,
    /^remember\s+(?:this|these|that)\b[:\s]*(.*)/i,
    /^can you remember\b(.*)/i,
    /^save(?:\s+this)?\s+to\s+memory[:\s]*(.*)/i,
    /^add(?:\s+this)?\s+to\s+memory[:\s]*(.*)/i,
    /^note\s+(?:this|that)[:\s]*(.*)/i,
    /^store\s+(?:this|that)[:\s]*(.*)/i,
];

// Explicit retrieval triggers
const MEMORY_RECALL_TRIGGERS = [
    /\b(?:what do you remember about|do you remember|recall|you told me|you mentioned|what did I tell you about)\b/i,
    /\b(?:what do you know about me|what have I told you)\b/i,
];

// Pronouns that require entity clarification before saving
const PRONOUN_PATTERN = /\b(she|he|they|her|him|them|it)\b/i;

const VAGUE_WORDS = new Set(['this','these','that','them','it','things','thing','too','also','as','well','please','ok','okay','all','of','right','yes','yep','yeah']);

/**
 * Phase A: Detect memory save trigger and extract raw content string.
 * Returns: content string | '__VAGUE__' | '__PRONOUN__' | null
 */
function detectMemorySave(input) {
    const trimmed = input.trim();
    for (const pattern of MEMORY_SAVE_TRIGGERS) {
        const match = trimmed.match(pattern);
        if (match) {
            const captured = (match[1] || '').trim();

            // Strip trailing filler
            const cleaned = captured
                .replace(/[,.]?\s*(okay|ok|alright|right|too|as well|please)[?.]?\s*$/i, '')
                .replace(/[?.]$/, '')
                .replace(/^[\s,?:.]+/, '')
                .trim();

            if (!cleaned || cleaned.length < 3) return '__VAGUE__';

            // Check if content is pure vague pronouns/fillers with no substance
            const meaningfulWords = cleaned.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 1 && !VAGUE_WORDS.has(w));
            if (meaningfulWords.length === 0) return '__VAGUE__';

            // Check for unresolved pronouns (no entity graph yet — must clarify)
            if (PRONOUN_PATTERN.test(cleaned)) return '__PRONOUN__';

            return cleaned;
        }
    }
    return null;
}

/**
 * Phase A: Split a content string into atomic fact clauses.
 * Splits on: ", and", " and ", "; ", " but also "
 * Each clause is trimmed and validated independently.
 */
function splitAtomicFacts(content) {
    // Split on conjunctions that typically separate independent facts
    const clauses = content
        .split(/\s*(?:,\s*and\s+|;\s*|,\s*(?=\w)|\s+and\s+(?=[a-z](?:my|i |the |a |an |\w+\s+(?:is|are|was|were|have|has|prefer|like|own|work)))/i)
        .map(c => c.trim())
        .filter(c => c.length >= 3);

    // If no meaningful split occurred, return original as single-element array
    return clauses.length > 1 ? clauses : [content];
}

/**
 * Detect if input is a memory recall query.
 */
function detectMemoryRecall(input) {
    return MEMORY_RECALL_TRIGGERS.some(p => p.test(input));
}

/**
 * Extract simple keyword tags from a content string.
 * Normalizes: lowercase, strip punctuation, remove stopwords.
 * Does NOT stem proper nouns (capitalized words preserved as-is after lower).
 */
function extractTags(content) {
    const stopwords = new Set(['a','an','the','is','it','to','of','and','or','in','on','at','for','with','that','this','was','are','do','you','what','how','why','when','who','did','have','has','had','my','me','i','we','he','she','they','be','been','am','not','no','if','so']);
    const words = content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopwords.has(w));
    // Only de-plural common words (skip short words where stemming causes loss like "atlas" -> "atla")
    return words
        .map(w => w.endsWith('s') && w.length >= 6 ? w.slice(0, -1) : w)
        .slice(0, 8);
}

/**
 * Check if content is meaningful enough to save.
 * Rejects empty, pure-punctuation, or whitespace-only content.
 */
function isValidMemoryContent(content) {
    if (!content || content.trim().length < 3) return false;
    const stripped = content.replace(/[^a-z0-9\s]/gi, '').trim();
    return stripped.length >= 2; // must have at least some alphanumeric chars
}

/**
 * Phase A: Save a single atomic fact entry.
 * Entry schema includes Phase B/C reserved fields (nullable) for future upgrade.
 * Returns: { entry, status: 'saved'|'dedup'|'rejected' }
 */
async function saveOneAtomicEntry(existing, content) {
    const trimmed = content.trim();

    if (!isValidMemoryContent(trimmed)) {
        console.warn('⚠️ [MEMORY_REJECTED]', trimmed);
        return { entry: null, status: 'rejected' };
    }

    const duplicate = existing.find(e => e.content.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
        console.log('🔁 [MEMORY_DEDUP]', duplicate.id);
        return { entry: duplicate, status: 'dedup' };
    }

    const entry = {
        id: crypto.randomUUID(),
        content: trimmed,
        created_at: new Date().toISOString(),
        // Legacy compat
        timestamp: new Date().toISOString(),
        scope: 'profile',
        tags: extractTags(trimmed),
        source: 'user_trigger',
        // Phase B reserved — typed schema normalization (not yet implemented)
        normalized_fields: null,
        // Phase C reserved — entity graph references (not yet implemented)
        entity_refs: null
    };

    return { entry, status: 'saved' };
}

/**
 * Phase A: Save one or more atomic facts to UserProfile.structured_memory.
 * Handles atomic splitting, dedup, validation, and DB persistence in one write.
 * Returns: { saved: [...], deduped: [...], rejected: [...] }
 */
async function saveAtomicMemory(base44, userProfile, content, userEmail) {
    const clauses = splitAtomicFacts(content);
    const existing = userProfile?.structured_memory || [];
    const newEntries = [];
    const deduped = [];
    const rejected = [];

    for (const clause of clauses) {
        const { entry, status } = await saveOneAtomicEntry(existing, clause);
        if (status === 'saved') {
            newEntries.push(entry);
            existing.push(entry); // prevent within-batch duplication
        } else if (status === 'dedup') {
            deduped.push(entry);
        } else {
            rejected.push(clause);
        }
    }

    if (newEntries.length > 0) {
        if (userProfile) {
            await base44.entities.UserProfile.update(userProfile.id, { structured_memory: existing });
        } else {
            await base44.entities.UserProfile.create({ user_email: userEmail, structured_memory: newEntries });
        }
        console.log('🧠 [ATOMIC_MEMORY_SAVED]', { count: newEntries.length, ids: newEntries.map(e => e.id) });
    }

    return { saved: newEntries, deduped, rejected };
}

/**
 * Deterministic recall: keyword-match against structured_memory.
 * Returns only matched entries — no full dump.
 */
function recallStructuredMemory(structuredMemory, query) {
    if (!structuredMemory || structuredMemory.length === 0) return [];
    const queryTokens = extractTags(query);
    if (queryTokens.length === 0) return structuredMemory.slice(-5); // fallback: last 5

    const scored = structuredMemory.map(entry => {
    // Re-extract tags at query time so de-plural logic is consistent
    const entryTokens = new Set([
        ...(entry.tags || []),
        ...extractTags(entry.content)
    ]);
    const hits = queryTokens.filter(t => entryTokens.has(t)).length;
    return { entry, hits };
    });

    // If no token hits, fall back to most recent 5 entries for recall queries
    const matched = scored.filter(s => s.hits > 0);
    if (matched.length === 0) return structuredMemory.slice(-5);

    return matched
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 10)
    .map(s => s.entry);
}

// ─── EXISTING HELPERS ─────────────────────────────────────────────────────

async function openAICall(key, messages, model = 'gpt-4o', maxTokens = 2000) {
    const response = await fetch(OPENAI_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}

function compressHistory(messages) {
    if (messages.length <= HOT_HEAD + HOT_TAIL) return messages;
    const head = messages.slice(0, HOT_HEAD);
    const tail = messages.slice(-HOT_TAIL);
    const middleCount = messages.length - HOT_HEAD - HOT_TAIL;
    const summaryBlock = {
        role: 'system',
        content: `[CONVERSATION SUMMARY: ${middleCount} earlier messages omitted. First ${HOT_HEAD} and last ${HOT_TAIL} messages shown in full.]`
    };
    return [...head, summaryBlock, ...tail];
}

async function extractMemoryAnchors(openaiKey, conversationExcerpt, existingAnchors) {
    const prompt = `You are a memory extraction system. Extract any NEW facts worth remembering long-term about the user. Focus on: names, dates, decisions, preferences, life events.

EXISTING (do not duplicate):
${existingAnchors || 'None yet'}

CONVERSATION:
${conversationExcerpt}

Output ONLY new facts, one per line, format: "[DATE if known]: [fact]"
If nothing new: output exactly: NONE`;

    const result = await openAICall(openaiKey, [{ role: 'user', content: prompt }], 'gpt-4o-mini', 500);
    return result.trim() === 'NONE' ? [] : result.split('\n').filter(l => l.trim().length > 0);
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.email) {
            return Response.json({ reply: "Authentication required.", error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const body = await req.json();
        const { input, session_id, file_urls = [] } = body;
        const openaiKey = Deno.env.get('OPENAI_API_KEY');

        console.log('🚀 [PIPELINE_START]', { request_id, user: user.email, session_id });

        // ============ LOAD USER PROFILE ============
        let userProfile = null;
        try {
            const profiles = await base44.entities.UserProfile.filter({ user_email: user.email }, '-created_date', 1);
            userProfile = profiles?.[0] || null;
        } catch (e) { console.warn('⚠️ [PROFILE_FAILED]', e.message); }

        // ─── PHASE 1: EXPLICIT MEMORY SAVE ────────────────────────────────────────
        let memorySaveContent = detectMemorySave(input);
        // __USE_FULL_INPUT__ means the trigger fired but the content after it was vague (no real facts)
        // In this case we cannot guess what to save — ask the user to be specific
        if (memorySaveContent === '__USE_FULL_INPUT__') {
            const clarifyReply = `Sure — what specifically would you like me to remember? Please share the facts and I'll save them.`;
            if (session_id) {
                await base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, timestamp: new Date().toISOString() });
                await base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: clarifyReply, timestamp: new Date().toISOString() });
            }
            return Response.json({
                reply: clarifyReply,
                mode: 'MEMORY_CLARIFY',
                memory_saved: false,
                request_id,
                response_time_ms: Date.now() - startTime,
                tool_calls: [],
                execution_receipt: { request_id, session_id, memory_saved: false, latency_ms: Date.now() - startTime }
            });
        }
        if (memorySaveContent) {
            const saved = await saveStructuredMemory(base44, userProfile, memorySaveContent, user.email);

            let confirmReply;
            let memory_saved = false;
            let memory_id = null;

            if (!saved) {
                // Content failed validation (empty/garbage)
                confirmReply = `I couldn't save that — it doesn't contain enough information to store.`;
            } else if (saved.source === 'explicit' && !saved.timestamp) {
                confirmReply = `I couldn't save that — it doesn't contain enough information to store.`;
            } else {
                // Check if it was a dedup (entry already existed before this call)
                const isDedup = saved.timestamp < new Date(Date.now() - 2000).toISOString();
                if (isDedup) {
                    confirmReply = `Already in memory: "${memorySaveContent}"`;
                } else {
                    confirmReply = `Memory saved. I'll remember: "${memorySaveContent}"`;
                    memory_saved = true;
                    memory_id = saved.id;
                }
            }

            if (session_id) {
                await base44.entities.Message.create({ conversation_id: session_id, role: 'user', content: input, timestamp: new Date().toISOString() });
                await base44.entities.Message.create({ conversation_id: session_id, role: 'assistant', content: confirmReply, timestamp: new Date().toISOString() });
            }

            return Response.json({
                reply: confirmReply,
                mode: 'MEMORY_SAVE',
                memory_saved,
                memory_id,
                request_id,
                response_time_ms: Date.now() - startTime,
                tool_calls: [],
                execution_receipt: { request_id, session_id, memory_saved, latency_ms: Date.now() - startTime }
            });
        }

        // ============ LOAD FULL SESSION HISTORY ============
        let rawHistory = [];
        if (session_id) {
            try {
                const msgs = await base44.entities.Message.filter(
                    { conversation_id: session_id },
                    'timestamp',
                    MAX_HISTORY_MESSAGES
                );
                rawHistory = msgs.map(m => ({ role: m.role, content: m.content }));
                console.log('✅ [HISTORY_LOADED]', { count: rawHistory.length });
            } catch (e) { console.warn('⚠️ [HISTORY_FAILED]', e.message); }
        }

        const conversationHistory = compressHistory(rawHistory);

        // ─── PHASE 1: DETERMINISTIC MEMORY RECALL ─────────────────────────────────
        const isRecallQuery = detectMemoryRecall(input);
        const structuredMemory = userProfile?.structured_memory || [];
        let matchedMemories = [];

        if (isRecallQuery && structuredMemory.length > 0) {
            matchedMemories = recallStructuredMemory(structuredMemory, input);
            console.log('🔍 [MEMORY_RECALL]', { query: input.substring(0, 60), matched: matchedMemories.length });
        }

        // ============ BUILD SYSTEM PROMPT ============
        const userName = userProfile?.preferred_name || user.full_name || 'the user';
        let systemPrompt = `You are Aria, a personal AI assistant for ${userName}.

IDENTITY:
- You are Aria. Not CAOS. Never say "I am CAOS" — that is the platform name, not yours.
- Speak in first person. Be direct and concise. No long headers or scaffolding sections.

TRUTH DISCIPLINE — MANDATORY RULES:

1. PRIOR-MENTION CLAIMS: You MUST NOT say "you've mentioned", "you previously said", "as we discussed", "from what I recall", or "you told me before" UNLESS the fact exists in STRUCTURED MEMORY (below) or appears verbatim in the SESSION HISTORY. If you cannot point to a source, do not claim prior knowledge.

2. NEW INFORMATION RULE: If the user introduces a fact in their current message, respond with "Got it —" and treat it as new. Do NOT frame it as something you already knew.

3. PREFERENCE CLAIMS: Never assert "you like X" or "you prefer X" unless it is explicitly stated in STRUCTURED MEMORY or the user said it in this session. If inferred, use: "It sounds like you might..." or "I could be inferring this, but..."

4. NO FABRICATION: If you don't know something about the user, say so. "I don't have that stored" is correct. Hallucinating facts is not.

5. SOURCE LABELING (when recalling facts): Briefly indicate the source — e.g., "(from memory)", "(from this conversation)", or "(inferred)".

`;


        // Inject ONLY matched structured memories (deterministic — no full dump)
        if (matchedMemories.length > 0) {
            systemPrompt += `RECALLED MEMORY (explicitly saved facts matching this query):\n`;
            for (const m of matchedMemories) {
                systemPrompt += `- [${m.timestamp.split('T')[0]}] ${m.content}\n`;
            }
            systemPrompt += '\n';
        }

        // Legacy memory_anchors: inject only if content does NOT overlap with structured memory
        // and mark clearly as INFERRED (not explicit user statements)
        const anchors = userProfile?.memory_anchors;
        if (anchors && anchors.length > 0) {
            const structuredContents = (userProfile?.structured_memory || []).map(e => e.content.toLowerCase());
            const filteredAnchors = (Array.isArray(anchors) ? anchors : [anchors])
                .filter(a => {
                    const lower = a.toLowerCase();
                    // Skip if this anchor is essentially covered by structured memory
                    return !structuredContents.some(sc => lower.includes(sc.substring(0, 20)) || sc.includes(lower.substring(0, 20)));
                });
            if (filteredAnchors.length > 0) {
                const anchorText = filteredAnchors.join('\n');
                systemPrompt += `INFERRED CONTEXT (auto-extracted, treat as possible inference — DO NOT assert as definitive fact, use "It sounds like..." language):\n${anchorText.substring(0, MAX_ANCHOR_LENGTH)}\n\n`;
            }
        }

        if (userProfile?.tone?.style) {
            systemPrompt += `Communication style: ${userProfile.tone.style}\n`;
        }
        if (userProfile?.project?.name) {
            systemPrompt += `Current project: ${userProfile.project.name}\n`;
        }

        systemPrompt += `\nSession: ${rawHistory.length} messages. ${rawHistory.length > HOT_HEAD + HOT_TAIL ? `First ${HOT_HEAD} and last ${HOT_TAIL} shown; middle summarized.` : 'Full history shown.'}`;

        // ============ CALL OPENAI ============
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: input }
        ];

        const reply = await openAICall(openaiKey, messages, 'gpt-4o', 2000);
        if (!reply) throw new Error('No response from OpenAI');

        console.log('✅ [INFERENCE_SUCCESS]', { replyLength: reply.length, historyMessages: conversationHistory.length });

        // ============ SAVE MESSAGES TO DB ============
        if (session_id) {
            try {
                await base44.entities.Message.create({
                    conversation_id: session_id,
                    role: 'user',
                    content: input,
                    file_urls: file_urls.length > 0 ? file_urls : undefined,
                    timestamp: new Date().toISOString()
                });
                await base44.entities.Message.create({
                    conversation_id: session_id,
                    role: 'assistant',
                    content: reply,
                    timestamp: new Date().toISOString()
                });
                console.log('✅ [MESSAGES_SAVED]');
            } catch (e) { console.warn('⚠️ [SAVE_FAILED]', e.message); }
        }

        // ============ BACKGROUND: AUTO-EXTRACT LEGACY ANCHORS (unchanged) ============
        (async () => {
            try {
                if (rawHistory.length % 5 === 0 || rawHistory.length === 0) {
                    const recentExcerpt = [...rawHistory.slice(-6),
                        { role: 'user', content: input },
                        { role: 'assistant', content: reply }
                    ].map(m => `${m.role}: ${m.content}`).join('\n');

                    const existingAnchors = Array.isArray(anchors) ? anchors.join('\n') : (anchors || '');
                    const newFacts = await extractMemoryAnchors(openaiKey, recentExcerpt, existingAnchors);

                    if (newFacts.length > 0) {
                        const updatedAnchors = Array.isArray(anchors) ? [...anchors, ...newFacts] : newFacts;
                        if (userProfile) {
                            await base44.entities.UserProfile.update(userProfile.id, { memory_anchors: updatedAnchors });
                        } else {
                            await base44.entities.UserProfile.create({ user_email: user.email, memory_anchors: newFacts });
                        }
                        console.log('🧠 [ANCHORS_UPDATED]', { newFacts: newFacts.length });
                    }
                }
            } catch (e) { console.warn('⚠️ [ANCHOR_UPDATE_FAILED]', e.message); }
        })();

        const responseTime = Date.now() - startTime;
        console.log('🎯 [PIPELINE_COMPLETE]', { request_id, duration: responseTime, totalHistory: rawHistory.length });

        return Response.json({
            reply,
            mode: 'GEN',
            request_id,
            response_time_ms: responseTime,
            tool_calls: [],
            execution_receipt: {
                request_id,
                session_id,
                history_messages: rawHistory.length,
                recall_executed: matchedMemories.length > 0,
                matched_memories: matchedMemories.length,
                latency_ms: responseTime
            }
        });

    } catch (error) {
        console.error('🔥 [PIPELINE_ERROR]', { request_id, error: error.message });
        return Response.json({
            reply: "I encountered an error. Please try again.",
            error: error.message,
            request_id,
            mode: 'ERROR',
            response_time_ms: Date.now() - startTime
        }, { status: 200 });
    }
});