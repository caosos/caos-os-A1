/**
 * PIPELINE INSPECTION ENDPOINT
 * 
 * Admin-only endpoint for inspecting pipeline state.
 * Returns detailed information about execution flow.
 * 
 * Contract: DIAGNOSTIC ACCESS (Admin tooling)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateRouteInvocation, generateRouteReceipt, listRoutes } from './core/routeRegistry.js';

Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Validate admin access
        if (!user || user.role !== 'admin') {
            return Response.json({
                error: 'ADMIN_REQUIRED',
                request_id
            }, { status: 403 });
        }

        const url = new URL(req.url);
        const action = url.searchParams.get('action') || 'routes';

        // ACTION: List all routes
        if (action === 'routes') {
            const category = url.searchParams.get('category') || null;
            const routes = listRoutes(category);

            return Response.json({
                request_id,
                routes,
                count: routes.length,
                categories: [...new Set(routes.map(r => r.category))]
            });
        }

        // ACTION: Get pipeline stats
        if (action === 'stats') {
            const session_id = url.searchParams.get('session_id');

            if (!session_id) {
                return Response.json({
                    error: 'SESSION_ID_REQUIRED',
                    request_id
                }, { status: 400 });
            }

            // Get recent requests for this session
            const diagnosticReceipts = await base44.asServiceRole.entities.DiagnosticReceipt.filter(
                { session_id },
                '-created_at',
                10
            );

            // Get boot receipts
            const bootReceipts = await base44.asServiceRole.entities.BootReceipt.filter(
                { session_id },
                '-boot_timestamp_ms',
                5
            );

            // Calculate stats
            const stats = {
                session_id,
                total_requests: diagnosticReceipts?.length || 0,
                boot_valid: bootReceipts?.[0]?.valid || false,
                avg_latency_ms: diagnosticReceipts?.length > 0
                    ? Math.round(
                        diagnosticReceipts.reduce((sum, r) => sum + (r.latency_breakdown?.total_ms || 0), 0) /
                        diagnosticReceipts.length
                    )
                    : 0,
                recent_receipts: diagnosticReceipts?.slice(0, 5).map(r => ({
                    request_id: r.request_id,
                    total_ms: r.latency_breakdown?.total_ms,
                    selector_decision: r.selector_decision?.response_mode,
                    recall_tiers: r.recall_tier_counts
                }))
            };

            return Response.json({
                request_id,
                stats
            });
        }

        // ACTION: Get WCW status
        if (action === 'wcw') {
            const session_id = url.searchParams.get('session_id');

            if (!session_id) {
                return Response.json({
                    error: 'SESSION_ID_REQUIRED',
                    request_id
                }, { status: 400 });
            }

            // Get session context
            const sessionContext = await base44.asServiceRole.entities.SessionContext.filter(
                { session_id },
                '-last_activity_ts',
                1
            );

            if (!sessionContext || sessionContext.length === 0) {
                return Response.json({
                    error: 'SESSION_NOT_FOUND',
                    request_id
                }, { status: 404 });
            }

            const context = sessionContext[0];

            return Response.json({
                request_id,
                session_id,
                wcw_budget: context.wcw_budget || 8000,
                wcw_used: context.wcw_used || 0,
                wcw_remaining: (context.wcw_budget || 8000) - (context.wcw_used || 0),
                utilization_pct: Math.round(((context.wcw_used || 0) / (context.wcw_budget || 8000)) * 100),
                last_activity: context.last_activity_ts
            });
        }

        // Unknown action
        return Response.json({
            error: 'UNKNOWN_ACTION',
            valid_actions: ['routes', 'stats', 'wcw'],
            request_id
        }, { status: 400 });

    } catch (error) {
        console.error('🔥 [PIPELINE_INSPECTION_ERROR]', {
            request_id,
            error: error.message
        });

        return Response.json({
            error: 'INSPECTION_FAILURE',
            details: error.message,
            request_id
        }, { status: 500 });
    }
});