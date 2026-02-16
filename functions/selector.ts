import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CAOS-A1 SELECTOR / GOVERNOR
 * 
 * Contract-faithful implementation of decision authority.
 * 
 * The Selector:
 * • does NOT generate responses
 * • does NOT store memory
 * • does NOT execute tools
 * 
 * The Selector authorizes:
 * • recall eligibility and bounds
 * • tool consideration and execution
 * • inference permission
 * • response mode selection
 * • fail-closed behavior
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { input, session_id, intent } = body;

        // Generate decision ID
        const decision_id = `sel_${session_id}_${Date.now()}`;

        // Get or create session context
        let sessionContexts = await base44.asServiceRole.entities.SessionContext.filter({ session_id });
        let sessionContext = sessionContexts[0];

        if (!sessionContext) {
            sessionContext = await base44.asServiceRole.entities.SessionContext.create({
                session_id,
                lane_id: user.email, // Lane scoped to user for now
                wcw_budget: 8000,
                wcw_used: 0,
                last_seq: 0,
                kernel_context_valid: true, // Bootstrap - will be proper in Phase 3
                bootloader_context_valid: true
            });
        }

        // Context validation (simplified for Phase 1)
        const context_valid = sessionContext.kernel_context_valid && sessionContext.bootloader_context_valid;

        if (!context_valid) {
            // FAIL-CLOSED: Invalid context
            const decision = await base44.asServiceRole.entities.SelectorDecision.create({
                decision_id,
                session_id,
                selector_invoked: true,
                context_valid: false,
                recall_authorized: false,
                recall_tiers_allowed: [],
                inference_allowed: false,
                tools_allowed: [],
                response_mode: "HALT_EXPLAINED",
                halt_reason: "Context Journal invalid or missing",
                forward_path: "System must be reinitialized with valid kernel and bootloader context"
            });

            return Response.json({ decision, halt: true });
        }

        // Analyze input for recall intent
        const inputLower = input.toLowerCase();
        const recallSignals = [
            'remember', 'recall', 'earlier', 'before', 'last time',
            'you said', 'we talked about', 'mentioned', 'discussed',
            'the one', 'that thing', 'previous'
        ];

        const recallImplied = recallSignals.some(signal => inputLower.includes(signal));

        // Determine recall authorization and tiers
        let recall_authorized = recallImplied;
        let recall_tiers_allowed = [];
        let recall_limit = 20;

        if (recall_authorized) {
            // Start with session tier, expand if needed
            recall_tiers_allowed = ['session'];

            // If user references cross-thread, expand to lane
            if (inputLower.includes('another') || inputLower.includes('different') || inputLower.includes('other')) {
                recall_tiers_allowed.push('lane');
                recall_limit = 50;
            }

            // Profile and global tiers require explicit signals (Phase 2)
        }

        // Check WCW budget
        const wcw_remaining = sessionContext.wcw_budget - sessionContext.wcw_used;
        const wcw_impact_estimate = recall_limit * 50; // Rough estimate: 50 tokens per record

        if (wcw_impact_estimate > wcw_remaining) {
            // WCW budget exceeded
            const decision = await base44.asServiceRole.entities.SelectorDecision.create({
                decision_id,
                session_id,
                selector_invoked: true,
                context_valid: true,
                recall_authorized: false,
                recall_tiers_allowed: [],
                inference_allowed: false,
                tools_allowed: [],
                response_mode: "HALT_EXPLAINED",
                halt_reason: "Working Context Window budget exceeded",
                forward_path: "Start a new conversation or condense current context",
                wcw_impact_estimate
            });

            return Response.json({ decision, halt: true });
        }

        // Determine inference permission
        const inference_allowed = context_valid && !recallImplied; // For now, allow inference if no recall needed

        // Determine response mode
        let response_mode = "ANSWER"; // Default

        // Create decision
        const decision = await base44.asServiceRole.entities.SelectorDecision.create({
            decision_id,
            session_id,
            selector_invoked: true,
            context_valid,
            recall_authorized,
            recall_tiers_allowed,
            recall_limit,
            inference_allowed,
            tools_allowed: [], // Phase 2
            response_mode,
            wcw_impact_estimate
        });

        return Response.json({
            decision,
            authorized: true
        });

    } catch (error) {
        console.error('Selector error:', error);
        return Response.json({ 
            error: error.message,
            halt: true,
            halt_reason: "Selector failure"
        }, { status: 500 });
    }
});