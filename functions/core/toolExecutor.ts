/**
 * CAOS TOOL EXECUTOR
 * 
 * Routes and executes tools based on selector authorization.
 * Each tool must check selector_decision.tools_allowed before executing.
 */

import { imageGeneratorExecutor } from '../executors/imageGenerator.js';
import { webSearchExecutor } from '../executors/webSearchExecutor.js';

export async function executeTool(params, base44) {
    const { user_input, selector_decision } = params;

    if (!selector_decision || !selector_decision.tools_allowed) {
        throw new Error('NO_TOOLS_AUTHORIZED: Selector did not authorize any tools');
    }

    const tools = selector_decision.tools_allowed;
    console.log('🔧 [TOOL_EXECUTOR]', { authorized_tools: tools });

    // Priority order: IMAGE > WEB_SEARCH > FILE_SEARCH
    
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