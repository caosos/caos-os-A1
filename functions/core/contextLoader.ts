/**
 * CAOS CONTEXT LOADER
 * 
 * Loads and validates context journal entries in strict order:
 * 1. Kernel context (system identity)
 * 2. Bootloader context (startup config)
 * 3. Profile context (user data)
 * 4. Project context (if applicable)
 * 5. Runtime context (session state)
 */

/**
 * Load context journal for session
 * Returns loaded contexts or throws if required contexts missing
 */
export async function loadContextJournal(session_id, user_email, base44) {
    console.log('📚 [CONTEXT_JOURNAL_LOAD]', { session_id, user_email });

    const loaded_contexts = {};
    const load_errors = [];

    // STEP 1: Kernel context (REQUIRED)
    try {
        const kernel = await loadKernelContext(base44);
        loaded_contexts['/context/kernel/identity'] = {
            scope: 'kernel',
            path: '/context/kernel/identity',
            content: kernel,
            source: 'system',
            loaded_at: new Date().toISOString()
        };
    } catch (error) {
        load_errors.push({ scope: 'kernel', error: error.message });
    }

    // STEP 2: Bootloader context (REQUIRED)
    try {
        const bootloader = await loadBootloaderContext(base44);
        loaded_contexts['/context/bootloader/config'] = {
            scope: 'bootloader',
            path: '/context/bootloader/config',
            content: bootloader,
            source: 'system',
            loaded_at: new Date().toISOString()
        };
    } catch (error) {
        load_errors.push({ scope: 'bootloader', error: error.message });
    }

    // STEP 3: Profile context (REQUIRED)
    try {
        const profile = await loadProfileContext(user_email, base44);
        loaded_contexts[`/context/profiles/${user_email}`] = {
            scope: 'profile',
            path: `/context/profiles/${user_email}`,
            content: profile,
            source: 'user_profile',
            loaded_at: new Date().toISOString()
        };
    } catch (error) {
        load_errors.push({ scope: 'profile', error: error.message });
    }

    // STEP 4: Project context (OPTIONAL)
    try {
        const project = await loadProjectContext(user_email, base44);
        if (project) {
            loaded_contexts['/context/projects/caos'] = {
                scope: 'project',
                path: '/context/projects/caos',
                content: project,
                source: 'user_profile',
                loaded_at: new Date().toISOString()
            };
        }
    } catch (error) {
        console.warn('⚠️ [CONTEXT_PROJECT_OPTIONAL]', error.message);
    }

    // STEP 5: Runtime context (session state)
    try {
        const runtime = await loadRuntimeContext(session_id, base44);
        loaded_contexts[`/context/runtime/${session_id}`] = {
            scope: 'runtime',
            path: `/context/runtime/${session_id}`,
            content: runtime,
            source: 'session',
            loaded_at: new Date().toISOString()
        };
    } catch (error) {
        console.warn('⚠️ [CONTEXT_RUNTIME_OPTIONAL]', error.message);
    }

    // FAIL-CLOSED if required contexts missing
    const required_scopes = ['kernel', 'bootloader', 'profile'];
    const missing = load_errors.filter(e => required_scopes.includes(e.scope));

    if (missing.length > 0) {
        throw new Error(`CONTEXT_LOAD_FAILED: Required contexts missing - ${missing.map(m => m.scope).join(', ')}`);
    }

    console.log('✅ [CONTEXT_JOURNAL_LOADED]', {
        paths: Object.keys(loaded_contexts),
        scopes: Object.values(loaded_contexts).map(c => c.scope)
    });

    return loaded_contexts;
}

/**
 * Load kernel context (system identity)
 */
async function loadKernelContext(base44) {
    return {
        system_name: 'CAOS',
        system_version: '3.0',
        identity: 'You are Aria, an AI assistant within CAOS',
        core_directive: 'Context governs. Selector authorizes. Inference is privilege.',
        capabilities: {
            recall: true,
            web_search: true,
            file_search: true,
            image_generation: true
        }
    };
}

/**
 * Load bootloader context (startup config)
 */
async function loadBootloaderContext(base44) {
    return {
        mode: 'OPERATE',
        policy_gating: 'ACTIVE',
        memory_enabled: true,
        tools_enabled: true,
        inference_enabled: true
    };
}

/**
 * Load profile context (user data)
 */
async function loadProfileContext(user_email, base44) {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter(
        { user_email },
        '-updated_date',
        1
    );

    if (!profiles || profiles.length === 0) {
        throw new Error('USER_PROFILE_NOT_FOUND');
    }

    return profiles[0];
}

/**
 * Load project context (if user has active projects)
 */
async function loadProjectContext(user_email, base44) {
    const profile = await loadProfileContext(user_email, base44);
    return profile?.project || null;
}

/**
 * Load runtime context (session state)
 */
async function loadRuntimeContext(session_id, base44) {
    // Load recent conversation state
    const conversations = await base44.asServiceRole.entities.Conversation.filter(
        { id: session_id },
        '-created_date',
        1
    );

    return {
        session_id,
        active: true,
        message_count: conversations[0]?.message_count || 0,
        last_activity: conversations[0]?.last_message_time || new Date().toISOString()
    };
}

/**
 * Validate context journal completeness
 */
export function validateContextJournal(context_journal) {
    const required_scopes = ['kernel', 'bootloader', 'profile'];
    const loaded_scopes = new Set(
        Object.values(context_journal).map(c => c.scope)
    );

    const missing = required_scopes.filter(scope => !loaded_scopes.has(scope));

    if (missing.length > 0) {
        throw new Error(`CONTEXT_VALIDATION_FAILED: Missing ${missing.join(', ')}`);
    }

    return true;
}