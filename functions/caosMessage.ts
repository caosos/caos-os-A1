import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { input, session_id, anchors: clientAnchors, limit = 20 } = body;

        // Generate server-side timestamp
        const now = new Date();
        const ts_snapshot_iso = now.toISOString();
        const ts_snapshot_ms = now.getTime();

        // Get or create session state
        let sessionStates = await base44.asServiceRole.entities.SessionState.filter({ session_id });
        let sessionState = sessionStates[0];
        
        if (!sessionState) {
            sessionState = await base44.asServiceRole.entities.SessionState.create({
                session_id,
                last_seq: 0,
                context_anchors: []
            });
        }

        // Generate sequence
        const seq = sessionState.last_seq + 1;
        const record_id = `${session_id}_${seq}_${ts_snapshot_ms}`;
        const lineage_id = `lineage_${ts_snapshot_ms}`;

        // Extract anchors
        const anchors = [
            { class: "session", value: session_id },
            { class: "user", value: user.email },
            { class: "date", value: now.toISOString().split('T')[0] },
            { class: "time", value: now.toTimeString().split(' ')[0].substring(0, 5) },
            { class: "ts_iso", value: ts_snapshot_iso },
            { class: "ts_ms", value: ts_snapshot_ms.toString() },
            ...(clientAnchors || [])
        ];

        // Auto-extract intent anchors
        const messageLower = input.toLowerCase();
        if (messageLower.includes('remember') || messageLower.includes('recall') || messageLower.includes('earlier')) {
            anchors.push({ class: "intent", value: "recall" });
        }
        if (messageLower.includes('create') || messageLower.includes('make') || messageLower.includes('build')) {
            anchors.push({ class: "intent", value: "create" });
        }

        // Store user message
        await base44.asServiceRole.entities.Record.create({
            record_id,
            lineage_id,
            session_id,
            seq,
            ts_snapshot_iso,
            ts_snapshot_ms,
            role: "user",
            message: input,
            anchors,
            status: "active"
        });

        // Update session sequence
        await base44.asServiceRole.entities.SessionState.update(sessionState.id, {
            last_seq: seq
        });

        // Get recent context (last N messages)
        const recentRecords = await base44.asServiceRole.entities.Record.filter(
            { session_id, status: "active" },
            '-seq',
            limit
        );

        // Build context for AI
        const contextMessages = recentRecords.reverse().map(r => ({
            role: r.role,
            content: r.message
        }));

        // Generate AI response using InvokeLLM
        const aiPrompt = `You are CAOS (Cognitive Adaptive Operating Space), an advanced AI assistant with persistent memory.

Session context (last ${contextMessages.length} messages):
${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Current user message: ${input}

Respond naturally and helpfully. If the user asks you to recall something, reference the session context above.`;

        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: aiPrompt
        });

        const aiReply = llmResult || "I'm here to help!";

        // Store AI response
        const aiSeq = seq + 1;
        const aiRecordId = `${session_id}_${aiSeq}_${Date.now()}`;
        const aiLineageId = `lineage_${Date.now()}`;

        await base44.asServiceRole.entities.Record.create({
            record_id: aiRecordId,
            lineage_id: aiLineageId,
            session_id,
            seq: aiSeq,
            ts_snapshot_iso: new Date().toISOString(),
            ts_snapshot_ms: Date.now(),
            role: "assistant",
            message: aiReply,
            anchors: [
                { class: "session", value: session_id },
                { class: "role", value: "assistant" }
            ],
            status: "active"
        });

        // Update session sequence again
        await base44.asServiceRole.entities.SessionState.update(sessionState.id, {
            last_seq: aiSeq
        });

        return Response.json({
            reply: aiReply,
            session: session_id,
            record_id: aiRecordId,
            anchors
        });

    } catch (error) {
        console.error('CAOS error:', error);
        return Response.json({ 
            error: error.message,
            reply: "I encountered an error processing your message. Please try again."
        }, { status: 500 });
    }
});