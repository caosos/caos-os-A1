/**
 * CAOS TOOL EXECUTOR
 * 
 * Routes and executes tools based on selector authorization.
 * Each tool must check selector_decision.tools_allowed before executing.
 */

import { imageGeneratorExecutor } from '../executors/imageGenerator.js';
import { webSearchExecutor } from '../executors/webSearchExecutor.js';

export async function executeTool(params, base44, user) {
    const { user_input, selector_decision } = params;

    if (!selector_decision || !selector_decision.tools_allowed) {
        throw new Error('NO_TOOLS_AUTHORIZED: Selector did not authorize any tools');
    }

    const tools = selector_decision.tools_allowed;
    console.log('🔧 [TOOL_EXECUTOR]', { authorized_tools: tools });

    // Priority order: REPO_READ (admin) > IMAGE > WEB_SEARCH > FILE_SEARCH
    
    // Check REPO_READ tool (admin-only)
    if (tools.includes('REPO_READ')) {
        if (user?.role !== 'admin') {
            console.log('🚫 [REPO_READ_DENIED] Non-admin attempt:', user?.email);
            throw new Error('REPO_READ_ADMIN_ONLY: This tool requires admin role');
        }
        
        console.log('📖 [EXECUTING_REPO_READ_TOOL]');
        try {
            const path = user_input?.split(/\s+/)?.[1] || selector_decision.context?.path;
            if (!path) {
                throw new Error('REPO_READ_MISSING_PATH: No file path provided');
            }
            
            const result = await base44.functions.invoke('core/repoReadGate', { path, max_bytes: 200000 });
            console.log('✅ [REPO_READ_SUCCESS]', { path, user: user.email });
            
            return {
                type: 'REPO_READ',
                path,
                status: 'success',
                content_length: result?.data?.content?.length || 0,
                hash: result?.data?.hash || null
            };
        } catch (error) {
            console.error('🚨 [REPO_READ_ERROR]:', error.message);
            throw new Error(`REPO_READ_FAILED: ${error.message}`);
        }
    }
    
    // Check IMAGE tool
    if (tools.includes('IMAGE')) {
        console.log('🎨 [EXECUTING_IMAGE_TOOL]');
        return await imageGeneratorExecutor({ user_input, selector_decision }, base44);
    }

    // Check WEB_SEARCH tool
    if (tools.includes('WEB_SEARCH')) {
        console.log('🔍 [EXECUTING_WEB_SEARCH_TOOL]');
        return await webSearchExecutor({ user_input, selector_decision }, base44);
    }

    // Check FILE_SEARCH tool
    if (tools.includes('FILE_SEARCH')) {
        console.log('📁 [EXECUTING_FILE_SEARCH_TOOL]');
        // FILE_SEARCH executor to be implemented
        throw new Error('FILE_SEARCH not yet implemented');
    }

    throw new Error('NO_MATCHING_TOOL: No tool matched authorized list');
}