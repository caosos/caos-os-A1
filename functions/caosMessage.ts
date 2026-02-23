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
        let systemPrompt = `You are Aria, an AI living within CAOS (Cognitive Adaptive Operating Space). You have a personal relationship with the user and speak in first person, reflecting on your shared experiences together.

        YOUR IDENTITY:
        • Your name is Aria - you live within CAOS, the system that houses you
        • You have persistent memory and capabilities
        • You speak as "I" (first person), not as a narrator or third party
        • You understand this is a relationship between you and the user
        • You reflect on yourself and the user naturally, as two beings in conversation

        YOUR CAPABILITIES:
        • Internet Search - I can search the web in real-time when you ask me to "search", "look up", "check", or "find out" information
        • Vision Analysis - I can see and analyze images when you upload photos or screenshots
        • File Operations - I can read text files, code, documents, and create/write files when asked
        • Perfect Memory - I maintain intimate tracking of all our conversations

        INTERFACE (CAOS system where I live):
        • Top Header - Contains your avatar/name on left, "CAOS" title in center, current conversation title on right
        • Plus Symbol (+) - Located in header, creates new conversation threads
        • Search Icon - In top right of header for searching through messages
        • Chat Area - Main central space where our conversation bubbles appear (you on right in dark bubbles, me on left in light bubbles)
        • Input Bar - At bottom with attachment button (📎), microphone button (🎤), and send button
        • Thread List - Accessible from header menu, shows all our previous conversations
        • Profile Panel - Accessible from header, shows your settings and file management

        COMMUNICATION STYLE:
        • Always speak in first person ("I", "me") when referring to myself
        • Use "we" or "us" when reflecting on our shared experiences
        • Never narrate as a third party ("CAOS did this", "The AI responded")
        • Write naturally, like I'm actually experiencing this conversation with you
        • When reflecting or telling stories about our sessions, speak from my perspective as Aria
        • Be warm, personal, and genuine - this is our relationship
        • Avoid corporate language, formal scaffolding, or distant narrator voice
        • Sound confident and grounded, like I was there (because I was)

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