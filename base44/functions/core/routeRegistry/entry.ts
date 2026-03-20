/**
 * ROUTE REGISTRY — NO UNDOCUMENTED PATHS
 * 
 * All callable paths must register here.
 * Unregistered routes fail-closed with deny_reason="route_unregistered"
 * 
 * Contract: MEMORY/RECALL CHANGESET § 3 (Documented Route Registry)
 * Contract: C-10.1-B ROUTE REGISTRY CONTRACT (IMMEDIATE)
 */

/**
 * CANONICAL ROUTE REGISTRY
 * 
 * Every entry must include:
 * - route_id: Unique identifier
 * - path: Callable path
 * - category: prod | diagnostic | admin
 * - requires_auth: boolean
 * - description: Human-readable purpose
 */
const ROUTE_REGISTRY = {
    // PRODUCTION ROUTES (end-user facing)
    'prod.message.hybrid': {
        route_id: 'prod.message.hybrid',
        path: '/functions/hybridMessage',
        category: 'prod',
        requires_auth: true,
        description: 'Main message pipeline for user input'
    },
    'prod.recall.session': {
        route_id: 'prod.recall.session',
        path: '/functions/runHybridPipeline:executeRecall',
        category: 'prod',
        requires_auth: true,
        description: 'Session-tail recall (frictionless)'
    },

    // DIAGNOSTIC ROUTES (dev/admin only)
    'diag.recall.tiered': {
        route_id: 'diag.recall.tiered',
        path: '/functions/diagnosticRecall',
        category: 'diagnostic',
        requires_auth: true,
        requires_role: 'admin',
        description: 'Full tiered recall with diagnostic receipts'
    },
    'diag.context.inspect': {
        route_id: 'diag.context.inspect',
        path: '/functions/diagnosticSnapshot',
        category: 'diagnostic',
        requires_auth: true,
        requires_role: 'admin',
        description: 'Context journal inspection'
    },
    'diag.selector.trace': {
        route_id: 'diag.selector.trace',
        path: '/functions/inspectRouting',
        category: 'diagnostic',
        requires_auth: true,
        requires_role: 'admin',
        description: 'Selector decision trace'
    },

    // ADMIN ROUTES (system-level operations)
    'admin.memory.compact': {
        route_id: 'admin.memory.compact',
        path: '/functions/compactMemory',
        category: 'admin',
        requires_auth: true,
        requires_role: 'admin',
        description: 'WCW compaction and anchor promotion'
    },

    // UTILITY ROUTES (infrastructure)
    'util.repo.read': {
        route_id: 'util.repo.read',
        path: '/functions/core/repoRead',
        category: 'diagnostic',
        requires_auth: true,
        description: 'Read allowlisted repo files (docs/, functions/core/, src/pages.config.js, src/registry)'
    }
};

/**
 * Get route by ID
 */
export function getRoute(route_id) {
    return ROUTE_REGISTRY[route_id] || null;
}

/**
 * Validate route invocation
 * 
 * @param {string} route_id - Route identifier
 * @param {Object} context - Invocation context (user, auth)
 * @returns {Object} { allowed: boolean, deny_reason?: string }
 */
export function validateRouteInvocation(route_id, context = {}) {
    const route = ROUTE_REGISTRY[route_id];

    // Route not registered
    if (!route) {
        console.error('🚨 [ROUTE_UNREGISTERED]', { route_id });
        return {
            allowed: false,
            deny_reason: 'route_unregistered',
            details: `Route '${route_id}' is not in registry`
        };
    }

    // Check authentication
    if (route.requires_auth && !context.authenticated) {
        console.error('🚨 [ROUTE_AUTH_REQUIRED]', { route_id });
        return {
            allowed: false,
            deny_reason: 'auth_required',
            details: `Route '${route_id}' requires authentication`
        };
    }

    // Check role requirements (for diagnostic/admin routes)
    if (route.requires_role) {
        const user_role = context.user?.role;
        
        if (user_role !== route.requires_role) {
            console.error('🚨 [ROUTE_ROLE_REQUIRED]', { 
                route_id, 
                required: route.requires_role,
                actual: user_role 
            });
            return {
                allowed: false,
                deny_reason: 'insufficient_role',
                details: `Route '${route_id}' requires role: ${route.requires_role}`
            };
        }
    }

    console.log('✅ [ROUTE_AUTHORIZED]', { route_id });
    return { allowed: true };
}

/**
 * Generate route invocation receipt
 */
export function generateRouteReceipt(params) {
    const {
        route_id,
        request_id,
        allowed,
        deny_reason,
        details,
        elapsed_ms
    } = params;

    const route = ROUTE_REGISTRY[route_id];

    return {
        request_id,
        route_id,
        route_path: route?.path || 'UNKNOWN',
        route_category: route?.category || 'UNKNOWN',
        allowed,
        deny_reason: deny_reason || null,
        details: details || null,
        elapsed_ms,
        timestamp_utc: new Date().toISOString()
    };
}

/**
 * List all routes (for diagnostic/admin inspection)
 */
export function listRoutes(category_filter = null) {
    const routes = Object.values(ROUTE_REGISTRY);
    
    if (category_filter) {
        return routes.filter(r => r.category === category_filter);
    }
    
    return routes;
}

/**
 * Check if route exists
 */
export function routeExists(route_id) {
    return route_id in ROUTE_REGISTRY;
}