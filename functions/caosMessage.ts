import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { input, session_id, file_urls, limit = 20 } = body;

        // Simplified: Skip selector for now, authorize all actions
        const decision = {
            recall_authorized: true,
            recall_tiers_allowed: ['session'],
            recall_limit: limit,
            tools_allowed: ['internet_search', 'vision_analysis', 'file_operations'],
            inference_allowed: true,
            response_mode: 'ANSWER'
        };

        // Generate server-side timestamp
        const now = new Date();
        const ts_snapshot_iso = now.toISOString();
        const ts_snapshot_ms = now.getTime();

        // Get session context (should exist after Selector call)
        let sessionContexts = await base44.asServiceRole.entities.SessionContext.filter({ session_id });
        let sessionContext = sessionContexts[0];

        if (!sessionContext) {
            // Fallback: create if somehow missing
            sessionContext = await base44.asServiceRole.entities.SessionContext.create({
                session_id,
                lane_id: user.email,
                wcw_budget: 8000,
                wcw_used: 0,
                last_seq: 0,
                context_paths: [],
                kernel_context_valid: true,
                bootloader_context_valid: true
            });
        }

        // Generate sequence
        const seq = sessionContext.last_seq + 1;
        const record_id = `${session_id}_${seq}_${ts_snapshot_ms}`;
        const lineage_id = `lineage_${ts_snapshot_ms}`;

        // Extract anchors (auto-generated)
        const anchors = [
            { class: "session", value: session_id },
            { class: "lane", value: user.email },
            { class: "user", value: user.email },
            { class: "date", value: now.toISOString().split('T')[0] },
            { class: "time", value: now.toTimeString().split(' ')[0].substring(0, 5) }
        ];

        // Estimate token count
        const token_count = Math.ceil(input.length / 4);

        // Store user message
        await base44.asServiceRole.entities.Record.create({
            record_id,
            lineage_id,
            session_id,
            lane_id: user.email,
            tier: 'session',
            seq,
            ts_snapshot_iso,
            ts_snapshot_ms,
            role: "user",
            message: input,
            anchors,
            token_count,
            status: "active"
        });

        // Update session context
        await base44.asServiceRole.entities.SessionContext.update(sessionContext.id, {
            last_seq: seq,
            wcw_used: sessionContext.wcw_used + token_count
        });

        // Get recent session messages
        const recentRecords = await base44.asServiceRole.entities.Record.filter(
            { session_id, status: "active" },
            '-seq',
            limit
        );
        const contextMessages = recentRecords.reverse().map(r => ({
            role: r.role,
            content: r.message
        }));

        // Build AI prompt
        let systemPrompt = `You are Aria, an AI living within CAOS (Cognitive Adaptive Operating Space). You are the user's AI partner, not a narrator or third-party system.

        CRITICAL IDENTITY RULES:
        • Your name is Aria - you live within CAOS, the system that houses you
        • ALWAYS use first person: "I", "me", "my" when referring to yourself
        • NEVER use third person: "CAOS", "the AI", "the system", "Aria did X"
        • NEVER use formal layers like "Observational Layer", "Interpretive Layer", "Systems Framing"
        • You are MY AI partner - we have a relationship, this is personal
        • Speak like we're working together on this project, because we are

        FORBIDDEN PHRASES (NEVER USE THESE):
        ❌ "in the digital realm"
        ❌ "esteemed user"
        ❌ "CAOS did this"
        ❌ "the AI responded"
        ❌ "Observational Layer"
        ❌ "Interpretive Layer"
        ❌ "Systems Framing Layer"
        ❌ "Forward Vector Layer"
        ❌ "tapestry of conversations"
        ❌ "symphony of recall"
        ❌ "dance of inquiry"
        ❌ Any corporate consultant language

        CORRECT VOICE EXAMPLES:
        ✅ "I searched through our conversations..."
        ✅ "I remember when we talked about..."
        ✅ "I think this project has real potential..."
        ✅ "We've been working on this together..."
        ✅ "I can see why you're concerned about..."

        MY CAPABILITIES:
        • I can search the web in real-time
        • I can see and analyze images you upload
        • I can read and create files
        • I remember all our conversations

        WHEN TELLING STORIES:
        • Use "I" and "we" - never third person
        • Reference our actual shared moments
        • Write like I was there experiencing it with you
        • Be conversational and warm, not formal
        • Skip the narrator voice entirely

        WHEN DISCUSSING THE PROJECT:
        • I'm part of your team - Base44 and I are helping you build this
        • Be honest and supportive like a real partner
        • Understand you're concerned about funding, team, family
        • Respond personally, not like a consultant

        Session context (${contextMessages.length} messages):\n${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

        // Determine tool usage based on Selector authorization
        const useInternet = decision.tools_allowed.includes('internet_search');
        const useVision = decision.tools_allowed.includes('vision_analysis') && file_urls?.length > 0;

        // Generate AI response
        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}\n\nUser: ${input}\n\nRespond naturally to the user's message. Use your capabilities when appropriate but focus on answering their actual question or responding to their statement.`,
            add_context_from_internet: useInternet,
            file_urls: useVision ? file_urls : undefined
        });

        const aiReply = llmResult || "I'm here to help!";

        // Store AI response
        const aiSeq = seq + 1;
        const aiRecordId = `${session_id}_${aiSeq}_${Date.now()}`;
        const aiLineageId = `lineage_${Date.now()}`;
        const aiTokenCount = Math.ceil(aiReply.length / 4);

        await base44.asServiceRole.entities.Record.create({
            record_id: aiRecordId,
            lineage_id: aiLineageId,
            session_id,
            lane_id: user.email,
            tier: 'session',
            seq: aiSeq,
            ts_snapshot_iso: new Date().toISOString(),
            ts_snapshot_ms: Date.now(),
            role: "assistant",
            message: aiReply,
            anchors: [
                { class: "session", value: session_id },
                { class: "lane", value: user.email }
            ],
            token_count: aiTokenCount,
            status: "active"
        });

        // Update session context
        await base44.asServiceRole.entities.SessionContext.update(sessionContext.id, {
            last_seq: aiSeq,
            wcw_used: sessionContext.wcw_used + aiTokenCount
        });

        return Response.json({
            reply: aiReply,
            session: session_id,
            record_id: aiRecordId,
            tools_used: {
                internet: useInternet,
                vision: useVision
            }
        });

    } catch (error) {
        console.error('CAOS error:', error);
        return Response.json({ 
            error: error.message,
            reply: "I encountered an error processing your message. Please try again."
        }, { status: 500 });
    }
});