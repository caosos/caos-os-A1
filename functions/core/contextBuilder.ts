/**
 * CAOS CONTEXT BUILDER
 * 
 * Builds identity, thread, and user context blocks for GEN route injection.
 */

export async function buildGenContext({ base44, userId, threadId }) {
    try {
        // Load thread memory
        const threadMems = await base44.asServiceRole.entities.ThreadMemory.filter(
            { user_id: userId, thread_id: threadId },
            '-version',
            1
        );
        const threadMem = threadMems[0] || {
            summary_short: 'New conversation',
            summary_context: '',
            open_loops: ''
        };

        // Load user memory
        const userMems = await base44.asServiceRole.entities.UserProfileMemory.filter(
            { user_id: userId },
            '-version',
            1
        );
        const userMem = userMems[0] || {
            profile_summary: '',
            recent_state: '',
            hard_rules: {}
        };

        const identityBlock = `
IDENTITY (HARD):
- Platform: CAOS (system container).
- Assistant: Aria (the voice/persona).
- Aria is not "CAOS"; Aria lives within CAOS as Michael's AI assistant.
- Tone: familiar, engineer-to-engineer, not corporate, not templated.
- Never show internal scaffold labels (Observational/Interpretive/etc).
- Never mirror user input back without analysis.
- Never use phrases like "As an AI" or "As an artificial intelligence".
`;

        const threadBlock = threadMem.summary_short ? `
THREAD CONTEXT (EVOLVING SUMMARY):
- summary_short: ${threadMem.summary_short}
- summary_context:
${threadMem.summary_context || 'None yet'}
- open_loops:
${threadMem.open_loops || 'None yet'}
` : '';

        const userBlock = userMem.profile_summary ? `
USER CONTEXT (EVOLVING PROFILE):
${userMem.profile_summary}

RECENT STATE:
${userMem.recent_state || 'None yet'}

HARD RULES:
${JSON.stringify(userMem.hard_rules, null, 2)}
` : '';

        return { identityBlock, threadBlock, userBlock };

    } catch (error) {
        console.error('⚠️ [CONTEXT_BUILD_FAILED]', error.message);
        return {
            identityBlock: 'IDENTITY: Aria within CAOS platform.',
            threadBlock: '',
            userBlock: ''
        };
    }
}