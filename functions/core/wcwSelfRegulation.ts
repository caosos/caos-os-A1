/**
 * WCW SELF-REGULATION ENFORCER
 * 
 * Enforces token ceiling before pipeline proceeds.
 * Must prevent overflow, not just report it.
 * 
 * Contract: WCW BUDGET CHANGESET § 4 (Self-Regulation Enforcement)
 */

import { checkWCWSelfRegulation, recordWCWRegulation } from './wcwBudget.js';

/**
 * Enforce WCW ceiling before recall
 * 
 * If at/near ceiling, triggers compaction/rotation.
 * Pipeline MUST NOT proceed if ceiling reached.
 */
export async function enforceWCWCeiling(params, base44) {
    const { session_id, current_wcw, request_id } = params;

    console.log('🛡️ [WCW_CEILING_CHECK]', {
        request_id,
        session_id,
        current_wcw
    });

    // Check self-regulation status
    const regulation = checkWCWSelfRegulation(current_wcw);

    // If nominal, proceed
    if (regulation.status === 'NOMINAL') {
        console.log('✅ [WCW_NOMINAL]', { current_wcw });
        return { 
            proceed: true, 
            regulation_needed: false,
            current_wcw 
        };
    }

    // If warning, log but allow (with caution flag)
    if (regulation.status === 'WARNING') {
        console.warn('⚠️ [WCW_WARNING]', {
            current_wcw,
            remaining: regulation.remaining_tokens,
            suggested_actions: regulation.suggested_actions
        });
        
        return {
            proceed: true,
            regulation_needed: true,
            regulation,
            caution: true
        };
    }

    // If critical, MUST regulate before proceeding
    if (regulation.status === 'CRITICAL') {
        console.error('🚨 [WCW_CRITICAL]', {
            current_wcw,
            ceiling_reached: true,
            required_actions: regulation.suggested_actions
        });

        // Attempt regulation
        const regulated = await attemptWCWRegulation({
            session_id,
            current_wcw,
            regulation,
            request_id
        }, base44);

        if (!regulated.success) {
            throw new Error(
                `WCW_CEILING_REACHED: Cannot proceed. Current: ${current_wcw}, ` +
                `Ceiling: ${regulation.ceiling_tokens}. Regulation failed.`
            );
        }

        // Record regulation event
        await recordWCWRegulation({
            session_id,
            request_id,
            tokens_before: current_wcw,
            tokens_after: regulated.new_wcw,
            tokens_freed: current_wcw - regulated.new_wcw,
            actions_taken: regulated.actions_taken,
            timestamp_ms: Date.now()
        }, base44);

        console.log('✅ [WCW_REGULATED]', {
            freed: current_wcw - regulated.new_wcw,
            new_wcw: regulated.new_wcw
        });

        return {
            proceed: true,
            regulation_needed: true,
            regulation_applied: true,
            new_wcw: regulated.new_wcw,
            actions_taken: regulated.actions_taken
        };
    }

    // Unknown status - fail safe
    throw new Error(`WCW_UNKNOWN_STATUS: ${regulation.status}`);
}

/**
 * Attempt WCW regulation strategies
 */
async function attemptWCWRegulation(params, base44) {
    const { session_id, current_wcw, regulation, request_id } = params;

    const actions_taken = [];
    let new_wcw = current_wcw;

    // Strategy 1: Trim oldest session records
    if (regulation.suggested_actions.includes('COMPACT_SESSION_TAIL')) {
        try {
            const trimmed = await trimSessionTail({
                session_id,
                target_reduction: Math.ceil(current_wcw * 0.3)
            }, base44);

            if (trimmed.success) {
                new_wcw -= trimmed.tokens_freed;
                actions_taken.push({
                    action: 'COMPACT_SESSION_TAIL',
                    tokens_freed: trimmed.tokens_freed,
                    records_archived: trimmed.records_archived
                });
            }
        } catch (error) {
            console.error('⚠️ [TRIM_SESSION_FAILED]', error.message);
        }
    }

    // Strategy 2: Archive old anchors to summary
    if (regulation.suggested_actions.includes('PROMOTE_ANCHORS')) {
        try {
            const promoted = await promoteAnchorsToSummary({
                session_id,
                target_reduction: Math.ceil(current_wcw * 0.2)
            }, base44);

            if (promoted.success) {
                new_wcw -= promoted.tokens_freed;
                actions_taken.push({
                    action: 'PROMOTE_ANCHORS',
                    tokens_freed: promoted.tokens_freed,
                    anchors_promoted: promoted.anchors_promoted
                });
            }
        } catch (error) {
            console.error('⚠️ [PROMOTE_ANCHORS_FAILED]', error.message);
        }
    }

    // Strategy 3: Emergency rotation (last resort)
    if (new_wcw >= regulation.ceiling_tokens) {
        console.warn('🚨 [EMERGENCY_ROTATION_TRIGGERED]');
        
        try {
            const rotated = await emergencyRotation({
                session_id,
                request_id
            }, base44);

            if (rotated.success) {
                new_wcw = rotated.new_wcw;
                actions_taken.push({
                    action: 'EMERGENCY_ROTATION',
                    snapshot_id: rotated.snapshot_id,
                    new_wcw: rotated.new_wcw
                });
            }
        } catch (error) {
            console.error('🔥 [EMERGENCY_ROTATION_FAILED]', error.message);
            return { success: false, error: error.message };
        }
    }

    return {
        success: new_wcw < regulation.ceiling_tokens,
        new_wcw,
        actions_taken,
        tokens_freed: current_wcw - new_wcw
    };
}

/**
 * Trim oldest session records (archive but keep accessible)
 */
async function trimSessionTail(params, base44) {
    const { session_id, target_reduction } = params;

    // Get oldest records
    const oldRecords = await base44.asServiceRole.entities.Record.filter(
        { session_id, status: 'active' },
        'seq', // Oldest first
        50
    );

    if (!oldRecords || oldRecords.length === 0) {
        return { success: false, tokens_freed: 0 };
    }

    let tokens_freed = 0;
    let records_archived = 0;

    for (const record of oldRecords) {
        if (tokens_freed >= target_reduction) break;

        // Mark as archived (still retrievable if needed)
        await base44.asServiceRole.entities.Record.update(record.id, {
            status: 'archived'
        });

        tokens_freed += record.token_count || 0;
        records_archived++;
    }

    return { success: true, tokens_freed, records_archived };
}

/**
 * Promote anchors to compressed summary
 */
async function promoteAnchorsToSummary(params, base44) {
    // Placeholder for anchor promotion logic
    // In full implementation: extract anchors, create summary, archive originals
    return { success: true, tokens_freed: 0, anchors_promoted: 0 };
}

/**
 * Emergency thread rotation (create snapshot, start fresh)
 */
async function emergencyRotation(params, base44) {
    // Placeholder for rotation logic
    // In full implementation: create ThreadSnapshot, reset WCW
    return { success: false, error: 'Not implemented' };
}