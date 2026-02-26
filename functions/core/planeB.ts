/**
 * PLANE B — SESSION TRANSCRIPT STORE (APPEND-ONLY)
 * 
 * Plane B is the authoritative session transcript store.
 * - Append-only (immutable once written)
 * - JSONL-style strict ordering by sequence number
 * - Provides "what did I say" + session-tail recall
 * - Zero hallucinated context
 * 
 * Contract: ANCHORS RECALL SYSTEM SCHEMATIC § 0.A
 */

/**
 * Write turn to Plane B (user + assistant messages)
 * 
 * @param {Object} params
 * @param {string} params.profile_id - Profile identifier
 * @param {string} params.session_id - Session identifier
 * @param {string} params.lane_id - Lane identifier
 * @param {string} params.correlator_id - Turn correlator
 * @param {string} params.user_message - User's message
 * @param {string} params.assistant_message - Assistant's reply
 * @param {number} params.timestamp_ms - Turn timestamp
 * @returns {Promise<{user_record, assistant_record}>}
 */
export async function writeTurnToPlaneB(params, base44) {
    const {
        profile_id,
        session_id,
        lane_id,
        correlator_id,
        user_message,
        assistant_message,
        timestamp_ms
    } = params;

    console.log('📝 [PLANE_B_WRITE]', { session_id, correlator_id });

    // Get current sequence number
    const existingRecords = await base44.asServiceRole.entities.Record.filter(
        { session_id, profile_id },
        '-seq',
        1
    );

    const nextSeq = existingRecords && existingRecords.length > 0 
        ? existingRecords[0].seq + 1 
        : 1;

    // Extract anchors from messages
    const user_anchors = extractAnchors(user_message, { session_id, lane_id });
    const assistant_anchors = extractAnchors(assistant_message, { session_id, lane_id });

    // Write user record
    // TEMPORARY: Disable anchors until Base44 fixes transformation bug
    const user_record = await base44.asServiceRole.entities.Record.create({
        record_id: `${correlator_id}_user`,
        profile_id,
        session_id,
        lane_id,
        tier: 'session',
        seq: nextSeq,
        ts_snapshot_iso: new Date(timestamp_ms).toISOString(),
        ts_snapshot_ms: timestamp_ms,
        role: 'user',
        message: user_message,
        // anchors: user_anchors,  // DISABLED - Base44 bug transforming string[] to object[]
        correlator_id,
        token_count: estimateTokens(user_message),
        status: 'active',
        hash: await hashContent(user_message)
    });

    // Write assistant record
    // TEMPORARY: Disable anchors until Base44 fixes transformation bug
    const assistant_record = await base44.asServiceRole.entities.Record.create({
        record_id: `${correlator_id}_assistant`,
        profile_id,
        session_id,
        lane_id,
        tier: 'session',
        seq: nextSeq + 1,
        ts_snapshot_iso: new Date(timestamp_ms + 1).toISOString(),
        ts_snapshot_ms: timestamp_ms + 1,
        role: 'assistant',
        message: assistant_message,
        // anchors: assistant_anchors,  // DISABLED - Base44 bug transforming string[] to object[]
        correlator_id,
        token_count: estimateTokens(assistant_message),
        status: 'active',
        hash: await hashContent(assistant_message)
    });

    console.log('✅ [PLANE_B_WRITTEN]', { 
        user_seq: nextSeq, 
        assistant_seq: nextSeq + 1,
        user_anchors: user_anchors.length,
        assistant_anchors: assistant_anchors.length
    });

    return { user_record, assistant_record };
}

/**
 * Recall from Plane B (session tail)
 * 
 * @param {Object} params
 * @param {string} params.session_id - Session to recall from
 * @param {string} params.lane_id - Lane filter (for isolation)
 * @param {number} params.limit - Max records to return
 * @returns {Promise<Array<Record>>}
 */
export async function recallFromPlaneB(params, base44) {
    const { session_id, lane_id, limit = 20 } = params;

    console.log('🔍 [PLANE_B_RECALL]', { session_id, lane_id, limit });

    // Recall session tail (most recent messages)
    const records = await base44.asServiceRole.entities.Record.filter(
        { 
            session_id, 
            lane_id,
            status: 'active'
        },
        '-seq',
        limit
    );

    console.log('✅ [PLANE_B_RECALL_COMPLETE]', { found: records.length });

    return records.reverse(); // Return in chronological order
}

/**
 * Extract deterministic anchors from message content
 */
function extractAnchors(message, context) {
    const anchors = [];
    const { session_id, lane_id } = context;

    // Always add session and lane anchors
    anchors.push(`session:${session_id}`);
    anchors.push(`lane:${lane_id}`);

    // Extract topic anchors (simple keyword extraction)
    const keywords = message.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4)
        .slice(0, 5); // Top 5 keywords

    keywords.forEach(kw => {
        anchors.push(`topic:${kw}`);
    });

    return [...new Set(anchors)]; // Deduplicate
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text) {
    if (!text) return 0;
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
}

/**
 * Hash content for integrity and deduplication
 */
async function hashContent(content) {
    if (!content) return null;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}