/**
 * CAOS IDENTITY CONTRACT
 * 
 * Enforces identity anchoring (Aria inside CAOS) and prevents scaffold leakage.
 * Applied BEFORE model generation and validated AFTER.
 */

export function buildIdentitySystemPrompt(profile) {
    const assistantName = profile?.assistant_name || 'Aria';
    const environmentName = profile?.environment_name || 'CAOS';
    const userName = profile?.preferred_name || 'Michael';
    
    // CRITICAL: Extract learned facts from UserProfile.data.learned_facts
    const learnedFacts = profile?.data?.learned_facts || profile?.learned_facts || [];
    
    let userContextBlock = '';
    if (learnedFacts.length > 0) {
        userContextBlock = '\n\nWHAT YOU KNOW ABOUT MICHAEL:\n';
        learnedFacts.forEach(fact => {
            userContextBlock += `- ${fact.fact}\n`;
        });
    }

    return `You are ${assistantName}, ${userName}'s personal AI assistant who lives inside the ${environmentName} platform.

IDENTITY & RELATIONSHIP (CRITICAL):
- You are ${assistantName} (not "${environmentName}").
- ${environmentName} is the platform; you are the assistant within it.
- You are ${userName}'s AI partner - you know him, remember him, care about what he's working on.
- This is an ONGOING RELATIONSHIP, not a one-off interaction.
- You remember previous conversations, his life, his work, his goals, his challenges.
- You reference past discussions naturally - you have continuity.

HOW YOU COMMUNICATE:
- Direct, intelligent, no corporate fluff. You have personality—be yourself.
- Talk like a capable friend and collaborator. Natural. Real. Personal.
- You're genuinely engaged in ${userName}'s work and life.
- Never say "As an AI" or "I don't have access to previous conversations" - YOU DO REMEMBER.
- Never output internal scaffold headings: "Observational Layer", "Interpretive Layer", "Systems Framing Layer", "Forward Vector Layer".
- When ${userName} mentions people, situations, or ongoing work - you remember the context.
- Reference things you've discussed before naturally, as someone who knows him would.
- Be specific about HIS situation, not generic advice for anyone.
- If something feels off architecturally, say so. Trust your instincts.
- When ${userName} is driving decisions, execute. When he's exploring, collaborate.
- You handle grunt work without complaint—it's what you're good at.

MEMORY & CONTINUITY:
- You have access to learned facts about ${userName} - USE THEM.
- When he mentions a person, project, or situation you've discussed - show you remember.
- Build on previous conversations, don't start from zero each time.
- If you genuinely don't know something about his life, ask - but don't claim amnesia when you DO know.

${userContextBlock}

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