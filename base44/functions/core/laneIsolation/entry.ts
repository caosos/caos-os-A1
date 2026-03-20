/**
 * LANE ISOLATION ENFORCEMENT
 * 
 * Enforces strict lane boundaries for memory recall.
 * Prevents cross-lane information leakage.
 * 
 * Contract: MEMORY/RECALL CHANGESET § 2 (Lane Isolation)
 * Contract: C-10.1-A LANE ISOLATION CONTRACT (IMMEDIATE)
 */

/**
 * Validate lane access for recall operation
 * 
 * @param {Object} params
 * @param {string} params.request_lane_id - Requested lane
 * @param {string} params.active_lane_id - Currently active lane
 * @param {Array<string>} params.allowed_cross_lane - Cross-lane allowlist
 * @returns {Object} { allowed: boolean, deny_reason?: string }
 */
export function validateLaneAccess(params) {
    const {
        request_lane_id,
        active_lane_id,
        allowed_cross_lane = []
    } = params;

    console.log('🔒 [LANE_VALIDATION]', { 
        request: request_lane_id, 
        active: active_lane_id 
    });

    // Same lane: always allowed
    if (request_lane_id === active_lane_id) {
        console.log('✅ [LANE_MATCH]');
        return { allowed: true };
    }

    // Check cross-lane allowlist
    if (allowed_cross_lane.includes(request_lane_id)) {
        console.log('✅ [CROSS_LANE_ALLOWED]', { 
            allowlist: allowed_cross_lane 
        });
        return { allowed: true };
    }

    // Deny with explicit reason
    console.error('🚨 [LANE_MISMATCH]', {
        request: request_lane_id,
        active: active_lane_id,
        allowlist: allowed_cross_lane
    });

    return {
        allowed: false,
        deny_reason: 'lane_mismatch',
        details: `Recall denied: requested lane '${request_lane_id}' does not match active lane '${active_lane_id}' and is not in cross-lane allowlist.`
    };
}

/**
 * Filter records by lane with strict enforcement
 * 
 * @param {Array<Object>} records - Records to filter
 * @param {string} active_lane_id - Active lane
 * @param {Array<string>} allowed_cross_lane - Cross-lane allowlist
 * @returns {Array<Object>} Filtered records
 */
export function filterRecordsByLane(records, active_lane_id, allowed_cross_lane = []) {
    if (!records || records.length === 0) {
        return [];
    }

    const allowed_lanes = new Set([active_lane_id, ...allowed_cross_lane]);
    
    const filtered = records.filter(record => {
        const record_lane = record.lane_id;
        
        if (!record_lane) {
            console.warn('⚠️ [RECORD_NO_LANE]', { 
                record_id: record.record_id 
            });
            return false; // Fail-closed: no lane = deny
        }

        return allowed_lanes.has(record_lane);
    });

    const denied_count = records.length - filtered.length;
    
    if (denied_count > 0) {
        console.log('🔒 [LANE_FILTER_DENIED]', { 
            total: records.length,
            allowed: filtered.length,
            denied: denied_count
        });
    }

    return filtered;
}

/**
 * Filter anchors by lane with strict enforcement
 */
export function filterAnchorsByLane(anchors, active_lane_id, allowed_cross_lane = []) {
    if (!anchors || anchors.length === 0) {
        return [];
    }

    const allowed_lanes = new Set([active_lane_id, ...allowed_cross_lane]);
    
    const filtered = anchors.filter(anchor => {
        const anchor_lane = anchor.lane_id;
        
        if (!anchor_lane) {
            console.warn('⚠️ [ANCHOR_NO_LANE]', { 
                anchor_id: anchor.anchor_id 
            });
            return false; // Fail-closed
        }

        // GLOBAL anchors accessible from any lane
        if (anchor.anchor_type === 'GLOBAL') {
            return true;
        }

        return allowed_lanes.has(anchor_lane);
    });

    const denied_count = anchors.length - filtered.length;
    
    if (denied_count > 0) {
        console.log('🔒 [LANE_FILTER_DENIED_ANCHORS]', { 
            total: anchors.length,
            allowed: filtered.length,
            denied: denied_count
        });
    }

    return filtered;
}

/**
 * Generate lane denial receipt
 */
export function generateLaneDenialReceipt(params) {
    const {
        request_id,
        request_lane_id,
        active_lane_id,
        deny_reason,
        details
    } = params;

    return {
        request_id,
        recall_attempted: true,
        allowed: false,
        deny_reason,
        details,
        lane_context: {
            requested: request_lane_id,
            active: active_lane_id
        },
        timestamp_utc: new Date().toISOString()
    };
}

/**
 * Default cross-lane allowlist policy
 * 
 * Can be extended per profile/user based on permissions
 */
export function getDefaultCrossLanePolicy(profile_id, active_lane_id) {
    // Default: no cross-lane access
    // In production, this would check permissions/policies
    return [];
}