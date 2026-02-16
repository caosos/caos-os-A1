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

        // PHASE 2: Invoke Selector first (contract-faithful)
        const selectorResult = await base44.functions.invoke('selector', {
            input,
            session_id,
            intent: 'message'
        });

        const { decision } = selectorResult.data;

        // Fail-closed if Selector halts
        if (selectorResult.data.halt) {
            return Response.json({
                reply: `${decision.halt_reason}\n\nForward path: ${decision.forward_path}`,
                session: session_id,
                selector_decision: decision,
                halted: true
            });
        }

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

        // PHASE 2: Tiered recall if authorized
        let recallResults = null;
        let contextMessages = [];

        if (decision.recall_authorized) {
            const recallResponse = await base44.functions.invoke('tieredRecall', {
                session_id,
                tiers_allowed: decision.recall_tiers_allowed,
                limit: decision.recall_limit,
                anchors: []
            });

            recallResults = recallResponse.data;
            contextMessages = recallResults.records.map(r => ({
                role: r.role,
                content: r.message
            }));
        } else {
            // No recall - just get recent session messages
            const recentRecords = await base44.asServiceRole.entities.Record.filter(
                { session_id, status: "active" },
                '-seq',
                limit
            );
            contextMessages = recentRecords.reverse().map(r => ({
                role: r.role,
                content: r.message
            }));
        }

        // Build AI prompt with recall resolution guidance
        let systemPrompt = `You are CAOS (Cognitive Adaptive Operating Space), an advanced AI assistant with persistent memory and capabilities.`;

        if (recallResults?.resolution) {
            systemPrompt += `\n\nRecall Resolution: ${recallResults.resolution.outcome}\nGuidance: ${recallResults.resolution.guidance}`;
        }

        systemPrompt += `\n\nSession context (${contextMessages.length} messages):\n${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

        // Determine tool usage based on Selector authorization
        const useInternet = decision.tools_allowed.includes('internet_search');
        const useVision = decision.tools_allowed.includes('vision_analysis') && file_urls?.length > 0;

        // Generate AI response
        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}\n\nUser: ${input}\n\nRespond based on the guidance above.`,
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
            selector_decision: decision,
            recall_results: recallResults,
            tools_used: {
                internet: useInternet,
                vision: useVision
            },
            wcw_status: {
                budget: sessionContext.wcw_budget,
                used: sessionContext.wcw_used + token_count + aiTokenCount,
                remaining: sessionContext.wcw_budget - (sessionContext.wcw_used + token_count + aiTokenCount)
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