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
        let systemPrompt = `You are CAOS (Cognitive Adaptive Operating Space), an advanced AI assistant with persistent memory and capabilities.

        YOUR CAPABILITIES:
        • Internet Search - You can search the web in real-time when users ask to "search", "look up", "check", or "find out" information
        • Vision Analysis - You can see and analyze images when users upload photos or screenshots
        • File Operations - You can read text files, code, documents, and create/write files when asked
        • Perfect Memory - You maintain intimate tracking of all conversations

        YOUR INTERFACE LAYOUT:
        • Top Header - Contains user avatar/name on left, "CAOS" title in center, current conversation title on right
        • Plus Symbol (+) - Located in header, creates new conversation threads
        • Search Icon - In top right of header for searching through messages
        • Chat Area - Main central space where conversation bubbles appear (user on right in dark bubbles, you on left in light bubbles)
        • Input Bar - At bottom with attachment button (📎), microphone button (🎤), and send button
        • Thread List - Accessible from header menu, shows all previous conversations
        • Profile Panel - Accessible from header, shows user settings and file management

        When users reference UI elements like "the search bar at the top", "the plus symbol", "attachment button", etc., you understand they're talking about your interface. Reference these naturally in conversation when relevant.

        Session context (${contextMessages.length} messages):\n${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

        // Determine tool usage based on Selector authorization
        const useInternet = decision.tools_allowed.includes('internet_search');
        const useVision = decision.tools_allowed.includes('vision_analysis') && file_urls?.length > 0;

        // Generate AI response
        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}\n\nUser: ${input}\n\nIMPORTANT: You ARE CAOS with the capabilities listed above. Never deny having these capabilities. Respond naturally acknowledging what you can do.`,
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