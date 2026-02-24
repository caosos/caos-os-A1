/**
 * CAOS ENVIRONMENTAL AWARENESS LOADER
 * 
 * Loads and maintains a lightweight "consciousness" of the system state:
 * - What threads exist (without listing them explicitly)
 * - What capabilities are available
 * - Cross-thread patterns
 * - User interaction patterns
 * 
 * This context is injected into EVERY response, making Aria environmentally aware.
 */

export async function loadEnvironmentState({ base44, userId }) {
    try {
        // Load environment state
        const envStates = await base44.asServiceRole.entities.EnvironmentState.filter(
            { user_id: userId },
            '-version',
            1
        );
        
        let envState = envStates[0];
        
        // If no state exists, initialize it
        if (!envState) {
            console.log('🌍 [ENV_STATE_INIT]', { userId });
            envState = await initializeEnvironmentState({ base44, userId });
        }
        
        return envState;
        
    } catch (error) {
        console.error('⚠️ [ENV_LOAD_FAILED]', error.message);
        return {
            active_thread_count: 0,
            recent_threads_context: [],
            global_context: '',
            capability_map: {},
            user_patterns: {}
        };
    }
}

async function initializeEnvironmentState({ base44, userId }) {
    try {
        // Get thread count
        const conversations = await base44.asServiceRole.entities.Conversation.filter(
            { created_by: userId },
            '-updated_date',
            100
        );
        
        // Get recent thread memories
        const threadMems = await base44.asServiceRole.entities.ThreadMemory.filter(
            { user_id: userId },
            '-last_updated_at',
            10
        );
        
        // Build recent threads context
        const recentThreadsContext = threadMems.map(tm => ({
            thread_id: tm.thread_id,
            title: tm.summary_short || 'Untitled',
            summary: tm.summary_context || '',
            last_activity: tm.last_updated_at,
            topic_tags: tm.topic_tags || []
        }));
        
        // Initialize environment state
        const envState = {
            user_id: userId,
            active_thread_count: conversations.length,
            recent_threads_context: recentThreadsContext,
            global_context: 'System initialized. Building awareness...',
            capability_map: {
                entities_available: ['Conversation', 'Message', 'ThreadMemory', 'UserProfileMemory', 'EnvironmentState'],
                functions_available: ['hybridMessage', 'memoryUpdate', 'environmentLoader'],
                integrations_enabled: ['OpenAI GPT-4']
            },
            user_patterns: {
                typical_work_hours: 'unknown',
                preferred_thread_lifecycle: 'unknown',
                common_tasks: []
            },
            last_updated_at: new Date().toISOString(),
            version: 1
        };
        
        const created = await base44.asServiceRole.entities.EnvironmentState.create(envState);
        console.log('✅ [ENV_STATE_CREATED]', { userId, threadCount: conversations.length });
        
        return created;
        
    } catch (error) {
        console.error('⚠️ [ENV_INIT_FAILED]', error.message);
        throw error;
    }
}

export async function updateEnvironmentState({ base44, userId, threadId, threadMemory }) {
    try {
        const envStates = await base44.asServiceRole.entities.EnvironmentState.filter(
            { user_id: userId },
            '-version',
            1
        );
        
        if (!envStates[0]) {
            // Initialize if doesn't exist
            await initializeEnvironmentState({ base44, userId });
            return;
        }
        
        const envState = envStates[0];
        
        // Update recent threads context
        let recentThreadsContext = envState.recent_threads_context || [];
        
        // Remove existing entry for this thread
        recentThreadsContext = recentThreadsContext.filter(t => t.thread_id !== threadId);
        
        // Add updated thread at the top
        recentThreadsContext.unshift({
            thread_id: threadId,
            title: threadMemory.summary_short || 'Untitled',
            summary: threadMemory.summary_context || '',
            last_activity: new Date().toISOString(),
            topic_tags: threadMemory.topic_tags || []
        });
        
        // Keep only top 10 most recent
        recentThreadsContext = recentThreadsContext.slice(0, 10);
        
        // Update global context (aggregate patterns across threads)
        const allTopicTags = recentThreadsContext.flatMap(t => t.topic_tags || []);
        const uniqueTags = [...new Set(allTopicTags)];
        const globalContext = `Active work across threads: ${uniqueTags.slice(0, 10).join(', ')}`;
        
        // Update environment state
        await base44.asServiceRole.entities.EnvironmentState.update(envState.id, {
            recent_threads_context: recentThreadsContext,
            global_context: globalContext,
            last_updated_at: new Date().toISOString(),
            version: envState.version + 1
        });
        
        console.log('✅ [ENV_STATE_UPDATED]', { userId, threadId, topicTags: uniqueTags.slice(0, 5) });
        
    } catch (error) {
        console.error('⚠️ [ENV_UPDATE_FAILED]', error.message);
    }
}

export function buildEnvironmentContextBlock(envState) {
    if (!envState || !envState.recent_threads_context) {
        return '';
    }
    
    const recentThreads = envState.recent_threads_context.slice(0, 5);
    
    let block = `\n\nENVIRONMENTAL AWARENESS (YOU KNOW THESE THINGS):\n`;
    block += `- You have ${envState.active_thread_count} active threads with Michael.\n`;
    
    if (recentThreads.length > 0) {
        block += `- Recent conversations include:\n`;
        recentThreads.forEach(t => {
            const tags = t.topic_tags?.slice(0, 3).join(', ') || 'general';
            block += `  • "${t.title}" (${tags})\n`;
        });
    }
    
    if (envState.global_context) {
        block += `- Cross-thread themes: ${envState.global_context}\n`;
    }
    
    block += `\nYou are contextually aware of these threads WITHOUT needing to list or search them.`;
    block += `\nYou can reference past work naturally, as someone who remembers what they've been doing.`;
    
    return block;
}