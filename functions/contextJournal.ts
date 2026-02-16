import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CAOS-A1 CONTEXT JOURNAL
 * 
 * Tracks context loading, boot sequence, and path validation.
 * 
 * Boot Order (enforced):
 * 1. /kernel/ - Core system context
 * 2. /bootloader/ - Session initialization context
 * 3. /runtime/ - Active conversation context
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { session_id, action, path, scope } = body;

        // Get or create session context
        let sessionContexts = await base44.asServiceRole.entities.SessionContext.filter({ session_id });
        let sessionContext = sessionContexts[0];

        if (!sessionContext) {
            // Bootstrap new session with kernel and bootloader
            sessionContext = await base44.asServiceRole.entities.SessionContext.create({
                session_id,
                lane_id: user.email,
                wcw_budget: 8000,
                wcw_used: 0,
                last_seq: 0,
                context_paths: [
                    {
                        path: '/kernel/system',
                        scope: 'system',
                        loaded_at: new Date().toISOString(),
                        status: 'valid'
                    },
                    {
                        path: '/bootloader/session_init',
                        scope: 'session',
                        loaded_at: new Date().toISOString(),
                        status: 'valid'
                    }
                ],
                kernel_context_valid: true,
                bootloader_context_valid: true
            });

            return Response.json({
                session_id,
                action: 'bootstrap',
                context_paths: sessionContext.context_paths,
                status: 'initialized'
            });
        }

        // Handle different actions
        if (action === 'validate') {
            // Check boot sequence validity
            const paths = sessionContext.context_paths || [];
            const hasKernel = paths.some(p => p.path.startsWith('/kernel/') && p.status === 'valid');
            const hasBootloader = paths.some(p => p.path.startsWith('/bootloader/') && p.status === 'valid');

            const isValid = hasKernel && hasBootloader;

            return Response.json({
                session_id,
                valid: isValid,
                kernel_valid: hasKernel,
                bootloader_valid: hasBootloader,
                context_paths: paths,
                boot_sequence_order: ['kernel', 'bootloader', 'runtime']
            });
        }

        if (action === 'load') {
            // Add new context path
            const contextPaths = sessionContext.context_paths || [];
            
            // Enforce boot order
            const pathPrefix = path.split('/')[1]; // Extract kernel, bootloader, or runtime
            
            if (pathPrefix === 'bootloader') {
                const hasKernel = contextPaths.some(p => p.path.startsWith('/kernel/') && p.status === 'valid');
                if (!hasKernel) {
                    return Response.json({
                        error: 'Boot order violation: kernel must load before bootloader',
                        required_path: '/kernel/*',
                        attempted_path: path
                    }, { status: 400 });
                }
            }

            if (pathPrefix === 'runtime') {
                const hasBootloader = contextPaths.some(p => p.path.startsWith('/bootloader/') && p.status === 'valid');
                if (!hasBootloader) {
                    return Response.json({
                        error: 'Boot order violation: bootloader must load before runtime',
                        required_path: '/bootloader/*',
                        attempted_path: path
                    }, { status: 400 });
                }
            }

            // Check if path already exists
            const existingPathIndex = contextPaths.findIndex(p => p.path === path);
            
            if (existingPathIndex >= 0) {
                // Update existing path
                contextPaths[existingPathIndex] = {
                    ...contextPaths[existingPathIndex],
                    loaded_at: new Date().toISOString(),
                    status: 'valid'
                };
            } else {
                // Add new path
                contextPaths.push({
                    path,
                    scope: scope || 'session',
                    loaded_at: new Date().toISOString(),
                    status: 'valid'
                });
            }

            // Update session context
            await base44.asServiceRole.entities.SessionContext.update(sessionContext.id, {
                context_paths: contextPaths,
                kernel_context_valid: contextPaths.some(p => p.path.startsWith('/kernel/') && p.status === 'valid'),
                bootloader_context_valid: contextPaths.some(p => p.path.startsWith('/bootloader/') && p.status === 'valid')
            });

            return Response.json({
                session_id,
                action: 'loaded',
                path,
                context_paths: contextPaths
            });
        }

        if (action === 'invalidate') {
            // Invalidate a specific path or scope
            const contextPaths = sessionContext.context_paths || [];
            
            const updatedPaths = contextPaths.map(p => {
                if (path && p.path === path) {
                    return { ...p, status: 'invalidated' };
                }
                if (scope && p.scope === scope) {
                    return { ...p, status: 'invalidated' };
                }
                return p;
            });

            await base44.asServiceRole.entities.SessionContext.update(sessionContext.id, {
                context_paths: updatedPaths,
                kernel_context_valid: updatedPaths.some(p => p.path.startsWith('/kernel/') && p.status === 'valid'),
                bootloader_context_valid: updatedPaths.some(p => p.path.startsWith('/bootloader/') && p.status === 'valid')
            });

            return Response.json({
                session_id,
                action: 'invalidated',
                context_paths: updatedPaths
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Context journal error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});