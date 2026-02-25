/**
 * DIAGNOSTIC RECALL ENDPOINT
 * 
 * CURL-callable recall with full diagnostic receipts.
 * Admin/dev only. No silent failures.
 * 
 * Contract: MEMORY/RECALL CHANGESET § 4 (Diagnostic Recall Access)
 * Contract: C-10.1-C RECALL DIAGNOSTICS CONTRACT (IMMEDIATE)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { executeTieredRecall, generateRecallReceipt } from './core/tieredRecall.js';
import { validateRouteInvocation, generateRouteReceipt } from './core/routeRegistry.js';

Deno.serve(async (req) => {
    const startTime = Date.now();
    const request_id = crypto.randomUUID();

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Validate route authorization
        const route_validation = validateRouteInvocation('diag.recall.tiered', {
            authenticated: !!user,
            user
        });

        if (!route_validation.allowed) {
            return Response.json({
                error: 'ROUTE_DENIED',
                deny_reason: route_validation.deny_reason,
                details: route_validation.details,
                request_id,
                route_receipt: generateRouteReceipt({
                    route_id: 'diag.recall.tiered',
                    request_id,
                    allowed: false,
                    deny_reason: route_validation.deny_reason,
                    details: route_validation.details,
                    elapsed_ms: Date.now() - startTime
                })
            }, { status: 403 });
        }

        // Parse request body
        const body = await req.json();
        const {
            profile_id,
            session_id,
            lane_id = 'default',
            tiers_allowed = ['session'],
            limit = 25
        } = body;

        if (!session_id) {
            return Response.json({
                error: 'MISSING_SESSION_ID',
                request_id
            }, { status: 400 });
        }

        console.log('🔬 [DIAGNOSTIC_RECALL_START]', {
            request_id,
            session_id,
            lane_id,
            tiers_allowed
        });

        // Execute tiered recall
        const result = await executeTieredRecall({
            profile_id: profile_id || user.email,
            session_id,
            lane_id,
            tiers_allowed,
            limit,
            request_id
        }, base44);

        // Generate detailed receipt
        const receipt = generateRecallReceipt({
            request_id,
            result,
            authorized: true
        });

        // Generate route receipt
        const route_receipt = generateRouteReceipt({
            route_id: 'diag.recall.tiered',
            request_id,
            allowed: true,
            elapsed_ms: Date.now() - startTime
        });

        console.log('✅ [DIAGNOSTIC_RECALL_COMPLETE]', {
            request_id,
            total_items: result.total_items,
            wcw_tokens: result.wcw_tokens
        });

        return Response.json({
            request_id,
            result,
            receipt,
            route_receipt,
            diagnostic_mode: true,
            elapsed_ms: Date.now() - startTime
        });

    } catch (error) {
        console.error('🔥 [DIAGNOSTIC_RECALL_ERROR]', {
            request_id,
            error: error.message,
            stack: error.stack
        });

        return Response.json({
            error: 'DIAGNOSTIC_RECALL_FAILURE',
            details: error.message,
            request_id,
            elapsed_ms: Date.now() - startTime
        }, { status: 500 });
    }
});