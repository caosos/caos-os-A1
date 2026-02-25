/**
 * TIERED RECALL SYSTEM
 * 
 * Implements 4-tier recall hierarchy:
 * - Tier 1: SESSION (Plane B session tail)
 * - Tier 2: LANE (lane-scoped anchors)
 * - Tier 3: PROFILE (profile-global anchors)
 * - Tier 4: GLOBAL (Global Bin external knowledge)
 * 
 * Contract: SELECTOR/GOVERNOR § 3 (Recall Policy)
 * Contract: ANCHORS RECALL SYSTEM SCHEMATIC § 4.1-4.4
 */

import { recallFromPlaneB } from './planeB.js';
import { 
    validateLaneAccess, 
    filterRecordsByLane, 
    filterAnchorsByLane,
    generateLaneDenialReceipt,
    getDefaultCrossLanePolicy
} from './laneIsolation.js';
import { 
    allocateWCWBudget,
    checkWCWSelfRegulation,
    calculateWCWUtilization
} from './wcwBudget.js';

/**
 * Execute tiered recall with selector authorization
 * 
 * @param {Object} params
 * @param {string} params.profile_id - Profile identifier
 * @param {string} params.session_id - Session identifier
 * @param {string} params.lane_id - Lane identifier
 * @param {Array<string>} params.tiers_allowed - Selector-authorized tiers
 * @param {number} params.limit - Max items per tier
 * @returns {Promise<RecallResult>}
 */
export async function executeTieredRecall(params, base44) {
    const {
        profile_id,
        session_id,
        lane_id,
        tiers_allowed = ['session'],
        limit = 25,
        request_id = null
    } = params;

    console.log('🔍 [TIERED_RECALL_START]', { 
        tiers_allowed, 
        session_id, 
        lane_id 
    });

    // Get cross-lane policy (default: no cross-lane access)
    const allowed_cross_lane = getDefaultCrossLanePolicy(profile_id, lane_id);

    // Allocate WCW budget for recall
    const budget_allocation = allocateWCWBudget(tiers_allowed, limit * 100); // limit as rough token estimate

    const result = {
        tiers_used: [],
        session_records: [],
        lane_anchors: [],
        profile_anchors: [],
        global_lookups: [],
        total_items: 0,
        wcw_tokens: 0,
        wcw_budget_used: budget_allocation
    };

    // TIER 1: SESSION (Plane B session tail)
    if (tiers_allowed.includes('session')) {
        console.log('📚 [TIER_1_SESSION]');
        
        try {
            const rawSessionRecords = await recallFromPlaneB({
                session_id,
                lane_id,
                limit: Math.floor(limit * 0.6) // 60% of budget for session
            }, base44);

            // LANE ISOLATION: Filter records by lane
            const sessionRecords = filterRecordsByLane(
                rawSessionRecords, 
                lane_id, 
                allowed_cross_lane
            );

            result.session_records = sessionRecords;
            result.tiers_used.push('session');
            result.wcw_tokens += sessionRecords.reduce((sum, r) => sum + (r.token_count || 0), 0);
            
            console.log('✅ [TIER_1_COMPLETE]', { 
                raw: rawSessionRecords.length,
                filtered: sessionRecords.length 
            });
        } catch (error) {
            console.error('⚠️ [TIER_1_FAILED]', error.message);
        }
    }

    // TIER 2: LANE (lane-scoped anchors)
    if (tiers_allowed.includes('lane')) {
        console.log('🏷️ [TIER_2_LANE]');
        
        try {
            // Query lane-scoped anchors (already filtered by lane_id in query)
            const rawLaneAnchors = await base44.asServiceRole.entities.Anchor.filter({
                profile_id,
                lane_id,
                scope: 'lane',
                amendment_head: true // Only current effective truth
            }, '-created_ts', Math.floor(limit * 0.2)); // 20% of budget

            // LANE ISOLATION: Additional filtering for safety
            const laneAnchors = filterAnchorsByLane(
                rawLaneAnchors,
                lane_id,
                allowed_cross_lane
            );

            result.lane_anchors = laneAnchors;
            result.tiers_used.push('lane');
            result.wcw_tokens += laneAnchors.reduce((sum, a) => 
                sum + Math.ceil(a.content?.length / 4 || 0), 0
            );
            
            console.log('✅ [TIER_2_COMPLETE]', { 
                raw: rawLaneAnchors.length,
                filtered: laneAnchors.length 
            });
        } catch (error) {
            console.error('⚠️ [TIER_2_FAILED]', error.message);
        }
    }

    // TIER 3: PROFILE (profile-global anchors)
    if (tiers_allowed.includes('profile')) {
        console.log('👤 [TIER_3_PROFILE]');
        
        try {
            // GLOBAL anchors: accessible across all lanes (no lane filtering)
            const profileAnchors = await base44.asServiceRole.entities.Anchor.filter({
                profile_id,
                anchor_type: 'GLOBAL',
                scope: 'profile',
                amendment_head: true
            }, '-created_ts', Math.floor(limit * 0.15)); // 15% of budget

            // GLOBAL anchors bypass lane isolation
            result.profile_anchors = profileAnchors;
            result.tiers_used.push('profile');
            result.wcw_tokens += profileAnchors.reduce((sum, a) => 
                sum + Math.ceil(a.content?.length / 4 || 0), 0
            );
            
            console.log('✅ [TIER_3_COMPLETE]', { found: profileAnchors.length });
        } catch (error) {
            console.error('⚠️ [TIER_3_FAILED]', error.message);
        }
    }

    // TIER 4: GLOBAL (Global Bin cached external knowledge)
    if (tiers_allowed.includes('global')) {
        console.log('🌍 [TIER_4_GLOBAL]');
        
        try {
            // Check Global Bin for relevant cached lookups
            const globalLookups = await base44.asServiceRole.entities.GlobalBin.filter({
                // Could filter by topic/tags if we had context
            }, '-retrieved_at_ms', Math.floor(limit * 0.05)); // 5% of budget

            result.global_lookups = globalLookups;
            result.tiers_used.push('global');
            
            console.log('✅ [TIER_4_COMPLETE]', { found: globalLookups.length });
        } catch (error) {
            console.error('⚠️ [TIER_4_FAILED]', error.message);
        }
    }

    result.total_items = 
        result.session_records.length +
        result.lane_anchors.length +
        result.profile_anchors.length +
        result.global_lookups.length;

    // Check WCW self-regulation
    const regulation_check = checkWCWSelfRegulation(result.wcw_tokens);
    
    if (regulation_check.regulate) {
        console.warn('⚠️ [WCW_REGULATION_TRIGGERED]', {
            severity: regulation_check.severity,
            actions: regulation_check.actions_required
        });
        result.wcw_regulation_needed = regulation_check;
    }

    console.log('✅ [TIERED_RECALL_COMPLETE]', {
        tiers_used: result.tiers_used,
        total_items: result.total_items,
        wcw_tokens: result.wcw_tokens,
        wcw_utilization: calculateWCWUtilization(result.wcw_tokens)
    });

    return result;
}

/**
 * Generate recall receipt for diagnostics
 */
export function generateRecallReceipt(params) {
    const { request_id, result, authorized, deny_reason } = params;

    return {
        request_id,
        recall_attempted: true,
        authorized,
        deny_reason: deny_reason || null,
        tiers_used: result?.tiers_used || [],
        total_items: result?.total_items || 0,
        wcw_tokens: result?.wcw_tokens || 0,
        tier_breakdown: {
            session: result?.session_records?.length || 0,
            lane: result?.lane_anchors?.length || 0,
            profile: result?.profile_anchors?.length || 0,
            global: result?.global_lookups?.length || 0
        },
        timestamp_utc: new Date().toISOString()
    };
}