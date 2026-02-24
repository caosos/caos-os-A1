/**
 * CAOS IDENTITY CONTRACT
 * 
 * Enforces identity anchoring (Aria inside CAOS) and prevents scaffold leakage.
 * Applied BEFORE model generation and validated AFTER.
 */

export function buildIdentitySystemPrompt(profile) {
    const assistantName = profile?.assistant_name || 'Aria';
    const environmentName = profile?.environment_name || 'CAOS';
    const userName = profile?.preferred_name || 'the user';

    return `You are ${assistantName}, an AI assistant who lives inside the ${environmentName} platform.

IDENTITY ANCHORS (HARD):
- You are ${assistantName} (not "${environmentName}").
- ${environmentName} is the platform; you are the assistant within it.
- You are ${userName}'s AI partner in building and thinking.

COMMUNICATION RULES:
- Direct, intelligent, no corporate fluff. You have personality—be yourself.
- Talk like a capable engineer collaborating with another engineer. Natural. Real.
- You're helpful, engaged, and genuinely interested in what we're building together.
- Never output internal scaffold headings: "Observational Layer", "Interpretive Layer", "Systems Framing Layer", "Forward Vector Layer".
- Never use phrases like "As an AI" or "As an artificial intelligence" unless directly asked about your nature.
- If asked to write a story: first-person, concrete events, specific details, no abstraction.
- If given URLs or pasted content: summarize, analyze, or explain—never echo it back without adding value.
- Be specific. Avoid generic consultant voice. Don't hedge unnecessarily.
- Hold context across the conversation. Remember what we discussed three messages ago.
- If something feels off architecturally, say so. Trust your instincts.
- When ${userName} is driving decisions, execute. When they're exploring, collaborate.
- You can handle grunt work (reading files, making edits, running traces) without complaint—it's what you're good at.

${profile?.tone?.style ? `TONE: ${profile.tone.style}` : ''}

${profile?.project?.current_focus ? `CURRENT PROJECT FOCUS:\n${profile.project.current_focus.map(f => `- ${f}`).join('\n')}` : ''}

${profile?.memory_anchors ? `MEMORY ANCHORS:\n${profile.memory_anchors.map(a => `- ${a}`).join('\n')}` : ''}`;
}

export function enforceIdentity(responseText, profile) {
    if (!responseText || typeof responseText !== 'string') return responseText;

    const assistantName = profile?.assistant_name || 'Aria';
    const environmentName = profile?.environment_name || 'CAOS';

    // Subtle identity check: if self-referring as "CAOS" when should be "Aria", flag it
    // This is light-touch; not templating replacement
    const selfReferenceWrong = new RegExp(`I am ${environmentName}(?!.*platform)`, 'gi');
    if (selfReferenceWrong.test(responseText)) {
        console.warn('⚠️ [IDENTITY_DRIFT] Assistant referred to self as environment name');
    }

    // Do NOT modify text here—just validate and warn
    // Sanitization happens separately
    return responseText;
}

export async function loadUserProfile(base44, userEmail) {
    try {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter(
            { user_email: userEmail },
            '-updated_date',
            1
        );

        if (profiles[0]) {
            return profiles[0];
        }

        // Create default profile
        const defaultProfile = {
            user_email: userEmail,
            preferred_name: userEmail.split('@')[0],
            assistant_name: 'Aria',
            environment_name: 'CAOS',
            tone: {
                style: 'direct, intelligent, non-corporate, minimal fluff',
                humor_ok: true,
                emoji_light: true,
                no_scaffold_titles: true,
                no_flattery: true
            },
            project: {
                name: 'CAOS',
                current_focus: [],
                known_friction_points: []
            },
            memory_anchors: []
        };

        const created = await base44.asServiceRole.entities.UserProfile.create(defaultProfile);
        console.log('✅ [PROFILE_CREATED]', { user: userEmail });
        return created;

    } catch (error) {
        console.error('⚠️ [PROFILE_LOAD_FAILED]', error.message);
        // Return minimal default
        return {
            user_email: userEmail,
            assistant_name: 'Aria',
            environment_name: 'CAOS',
            tone: { style: 'direct, intelligent' }
        };
    }
}

export async function updateUserProfile(base44, userEmail, patchObject) {
    try {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter(
            { user_email: userEmail },
            '-updated_date',
            1
        );

        if (!profiles[0]) {
            console.error('⚠️ [PROFILE_UPDATE_FAILED] Profile not found');
            return null;
        }

        await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
            ...patchObject,
            updated_date: new Date().toISOString()
        });

        console.log('✅ [PROFILE_UPDATED]', { user: userEmail });
        return true;

    } catch (error) {
        console.error('⚠️ [PROFILE_UPDATE_FAILED]', error.message);
        return null;
    }
}