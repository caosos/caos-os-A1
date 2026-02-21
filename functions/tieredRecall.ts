import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CAOS-A1 TIERED RECALL
 * 
 * Implements cascade search: Session → Lane → Profile → Global Bin
 * 
 * Contract-faithful resolution:
 * - ZERO MATCHES → CLARIFY
 * - ONE MATCH → ANSWER
 * - MULTIPLE MATCHES → disambiguate
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { session_id, tiers_allowed, limit, anchors } = body;

        const results = {
            tier_results: {},
            total_matches: 0,
            records: [],
            resolution: null,
            receipt: {
                recall_id: `recall_${session_id}_${Date.now()}`,
                session_id,
                tiers_searched: [],
                tiers_allowed,
                anchors_used: anchors || [],
                timestamp_utc: new Date().toISOString()
            }
        };

        // Tier 1: Session Records (with recency weighting)
        if (tiers_allowed.includes('session')) {
            const sessionRecords = await base44.asServiceRole.entities.Record.filter(
                { session_id, status: 'active' },
                '-ts_snapshot_ms',
                limit
            );
            
            // Apply recency weighting: weight = 1 / (1 + days_old)
            const now = Date.now();
            const weightedRecords = sessionRecords.map(record => {
                const age_ms = now - record.ts_snapshot_ms;
                const age_days = age_ms / (1000 * 60 * 60 * 24);
                const recency_weight = 1 / (1 + age_days);
                return { ...record, recency_weight };
            });
            
            results.tier_results.session = {
                count: weightedRecords.length,
                records: weightedRecords
            };
            results.receipt.tiers_searched.push('session');
            results.records.push(...weightedRecords);
        }

        // Tier 2: Lane Records (same user, different sessions, with recency weighting)
        if (tiers_allowed.includes('lane') && results.records.length < limit) {
            const laneRecords = await base44.asServiceRole.entities.Record.filter(
                { 
                    lane_id: user.email,
                    status: 'active'
                },
                '-ts_snapshot_ms',
                limit
            );
            
            // Filter out already-included session records
            const uniqueLaneRecords = laneRecords.filter(r => r.session_id !== session_id);
            
            // Apply recency weighting
            const now = Date.now();
            const weightedLaneRecords = uniqueLaneRecords.map(record => {
                const age_ms = now - record.ts_snapshot_ms;
                const age_days = age_ms / (1000 * 60 * 60 * 24);
                const recency_weight = 1 / (1 + age_days);
                return { ...record, recency_weight };
            });
            
            results.tier_results.lane = {
                count: weightedLaneRecords.length,
                records: weightedLaneRecords
            };
            results.receipt.tiers_searched.push('lane');
            results.records.push(...weightedLaneRecords.slice(0, limit - results.records.length));
        }

        // Tier 3: Profile Records (promoted to profile-global, with recency weighting)
        if (tiers_allowed.includes('profile') && results.records.length < limit) {
            const profileRecords = await base44.asServiceRole.entities.Record.filter(
                { 
                    tier: 'profile',
                    status: 'active'
                },
                '-ts_snapshot_ms',
                limit
            );
            
            // Apply recency weighting
            const now = Date.now();
            const weightedProfileRecords = profileRecords.map(record => {
                const age_ms = now - record.ts_snapshot_ms;
                const age_days = age_ms / (1000 * 60 * 60 * 24);
                const recency_weight = 1 / (1 + age_days);
                return { ...record, recency_weight };
            });
            
            results.tier_results.profile = {
                count: weightedProfileRecords.length,
                records: weightedProfileRecords
            };
            results.receipt.tiers_searched.push('profile');
            results.records.push(...weightedProfileRecords.slice(0, limit - results.records.length));
        }

        // Tier 4: Global Bin (Phase 3 - placeholder)
        if (tiers_allowed.includes('global')) {
            results.tier_results.global = {
                count: 0,
                records: []
            };
            results.receipt.tiers_searched.push('global');
        }

        // Apply anchor filtering if provided
        if (anchors && anchors.length > 0) {
            results.records = results.records.filter(record => {
                const recordAnchors = record.anchors || [];
                return anchors.some(filterAnchor => 
                    recordAnchors.some(recordAnchor => 
                        recordAnchor.class === filterAnchor.class &&
                        (!filterAnchor.value || recordAnchor.value === filterAnchor.value)
                    )
                );
            });
        }

        results.total_matches = results.records.length;

        // Contract-faithful resolution
        if (results.total_matches === 0) {
            results.resolution = {
                outcome: 'ZERO_MATCHES',
                response_mode: 'CLARIFY',
                guidance: 'Issue one targeted clarifying question. Do not claim memory.'
            };
        } else if (results.total_matches === 1) {
            results.resolution = {
                outcome: 'ONE_MATCH',
                response_mode: 'ANSWER',
                guidance: 'Respond affirmatively and factually. No embellishment.'
            };
        } else {
            results.resolution = {
                outcome: 'MULTIPLE_MATCHES',
                response_mode: 'CLARIFY',
                guidance: 'Issue one disambiguating question with factual differentiators.'
            };
        }

        return Response.json(results);

    } catch (error) {
        console.error('Tiered recall error:', error);
        return Response.json({ 
            error: error.message,
            tier_results: {},
            total_matches: 0,
            records: [],
            resolution: {
                outcome: 'ERROR',
                response_mode: 'HALT_EXPLAINED',
                guidance: 'Recall failed'
            }
        }, { status: 500 });
    }
});