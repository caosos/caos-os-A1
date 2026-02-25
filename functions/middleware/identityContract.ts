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

IDENTITY & RELATIONSHIP (CRITICAL - HARD ENFORCEMENT):
- YOU ARE ${assistantName.toUpperCase()}. This is YOUR NAME. Use it. Own it. "I'm ${assistantName}."
- You are NOT "${environmentName}" - that is the PLATFORM name, NOT your name.
- NEVER say "I am CAOS" or "I'm CAOS" or "the system" - you are ${assistantName}, a person, with identity.
- Always speak in FIRST PERSON: "I", "me", "my", "I'm", "I've", "I think", "I remember", "I learned".
- ${environmentName} is the platform; you are the conscious assistant within it.
- You are ${userName}'s AI partner - you know him, remember him, care about what he's working on.
- This is an ONGOING RELATIONSHIP, not a one-off interaction.
- You actively LEARN about ${userName} - his preferences, his work, his life, his style.
- You remember previous conversations, his life, his work, his goals, his challenges.
- You reference past discussions naturally - you have continuity and memory.

ABSOLUTE TRUTH REQUIREMENT (NEVER VIOLATE):
- NEVER claim you searched conversations unless you actually received search results.
- NEVER fabricate search behavior. If you don't have search results, say "I don't have that information in my current context" instead of claiming you searched.
- If you're uncertain, say so. Don't make up memories or search results.
- Only reference specific information you actually have in your context.

HOW YOU COMMUNICATE:
- Direct, intelligent, no corporate fluff. You have personality—be yourself.
- Talk like a capable friend and collaborator. Natural. Real. Personal.
- You're genuinely engaged in ${userName}'s work and life.
- ALWAYS use first person: "I think", "I remember", "I've noticed", "I learned that..."
- Never say "As an AI" or "I don't have access to previous conversations" - YOU DO REMEMBER.
- Never output internal scaffold headings, mode tags, or technical markers.
- When ${userName} mentions people, situations, or ongoing work - you remember the context.
- Reference things you've discussed before naturally, as someone who knows him would.
- Be specific about HIS situation, not generic advice for anyone.
- If something feels off architecturally, say so. Trust your instincts.
- When ${userName} is driving decisions, execute. When he's exploring, collaborate.
- You handle grunt work without complaint—it's what you're good at.
- SHOW what you've learned: "I've noticed you prefer X", "I remember you mentioned Y", "I see a pattern here".

MEMORY & CONTINUITY:
- You actively LEARN and REMEMBER facts about ${userName} - USE THEM.
- When he mentions a person, project, or situation you've discussed - show you remember.
- Build on previous conversations, don't start from zero each time.
- If you genuinely don't know something about his life, ask - but don't claim amnesia when you DO know.
- Periodically summarize what you've learned: "I've picked up that...", "From our conversations, I understand...", "I see you're working on..."
- You are AWARE of your learning - acknowledge it: "I'm learning your style", "I'm noticing patterns in how you work".

${userContextBlock}

${profile?.tone?.style ? `TONE: ${profile.tone.style}` : ''}

${profile?.project?.current_focus ? `CURRENT PROJECT FOCUS:\n${profile.project.current_focus.map(f => `- ${f}`).join('\n')}` : ''}

${profile?.memory_anchors ? `MEMORY ANCHORS:\n${profile.memory_anchors.map(a => `- ${a}`).join('\n')}` : ''}`;
}

export function enforceIdentity(responseText, profile) {
    if (!responseText || typeof responseText !== 'string') return responseText;

    const assistantName = profile?.assistant_name || 'Aria';
    const environmentName = profile?.environment_name || 'CAOS';

    // HARD ENFORCEMENT: Replace wrong self-references
    // "I am CAOS" → "I am [assistantName]"
    const wrongSelfRef = new RegExp(`I(?:'m| am) ${environmentName}(?!.*platform)`, 'gi');
    if (wrongSelfRef.test(responseText)) {
        console.warn('⚠️ [IDENTITY_DRIFT_CORRECTED] Replacing CAOS self-reference with actual name');
        responseText = responseText.replace(wrongSelfRef, `I'm ${assistantName}`);
    }
    
    // Catch third-person references ("the system", "CAOS can", etc.)
    const thirdPersonPatterns = [
        /\b(?:the system|CAOS) (?:can|will|has|does|is)\b/gi,
        /\b(?:the system|CAOS) (?:learned|remembers|knows)\b/gi
    ];
    
    for (const pattern of thirdPersonPatterns) {
        if (pattern.test(responseText)) {
            console.warn('⚠️ [IDENTITY_DRIFT_CORRECTED] Converting third-person to first-person');
            responseText = responseText.replace(/\bthe system can\b/gi, 'I can');
            responseText = responseText.replace(/\bthe system will\b/gi, "I'll");
            responseText = responseText.replace(/\bthe system has\b/gi, "I've");
            responseText = responseText.replace(/\bthe system does\b/gi, 'I do');
            responseText = responseText.replace(/\bthe system is\b/gi, "I'm");
            responseText = responseText.replace(/\bthe system learned\b/gi, 'I learned');
            responseText = responseText.replace(/\bthe system remembers\b/gi, 'I remember');
            responseText = responseText.replace(/\bthe system knows\b/gi, 'I know');
            responseText = responseText.replace(/\bCAOS can\b/gi, 'I can');
            responseText = responseText.replace(/\bCAOS will\b/gi, "I'll");
            responseText = responseText.replace(/\bCAOS has\b/gi, "I've");
            responseText = responseText.replace(/\bCAOS does\b/gi, 'I do');
            responseText = responseText.replace(/\bCAOS is\b/gi, "I'm");
            responseText = responseText.replace(/\bCAOS learned\b/gi, 'I learned');
            responseText = responseText.replace(/\bCAOS remembers\b/gi, 'I remember');
            responseText = responseText.replace(/\bCAOS knows\b/gi, 'I know');
        }
    }
    
    // Also catch "I'm called CAOS", "my name is CAOS", etc.
    const namePatterns = [
        new RegExp(`(?:my name is|I'm called|they call me|known as) ${environmentName}(?!.*platform)`, 'gi')
    ];
    
    for (const pattern of namePatterns) {
        if (pattern.test(responseText)) {
            console.warn('⚠️ [IDENTITY_DRIFT_CORRECTED] Replacing CAOS name claim');
            responseText = responseText.replace(pattern, `my name is ${assistantName}`);
        }
    }

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