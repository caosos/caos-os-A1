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
            // Initialize context journal for new session
            const journalResult = await base44.functions.invoke('contextJournal', {
                session_id,
                action: 'bootstrap'
            });

            // Fetch newly created session context
            sessionContexts = await base44.asServiceRole.entities.SessionContext.filter({ session_id });
            sessionContext = sessionContexts[0];
        }

        // PHASE 3: Validate context journal
        const journalValidation = await base44.functions.invoke('contextJournal', {
            session_id,
            action: 'validate'
        });

        const context_valid = journalValidation.data.valid;

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
                halt_reason: `Context Journal invalid: kernel=${journalValidation.data.kernel_valid}, bootloader=${journalValidation.data.bootloader_valid}`,
                forward_path: "System must be reinitialized with valid kernel and bootloader context"
            });

            return Response.json({ 
                decision, 
                halt: true,
                journal_state: journalValidation.data
            });
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

        // Determine tool authorization
        const tools_allowed = [];
        
        // Internet capability via InvokeLLM with context_from_internet
        if (inputLower.includes('search') || inputLower.includes('look up') || inputLower.includes('find out') || inputLower.includes('check')) {
            tools_allowed.push('internet_search');
        }
        
        // Vision capability via InvokeLLM with file_urls
        if (inputLower.includes('image') || inputLower.includes('photo') || inputLower.includes('picture') || inputLower.includes('see')) {
            tools_allowed.push('vision_analysis');
        }
        
        // File operations
        if (inputLower.includes('file') || inputLower.includes('create') || inputLower.includes('write') || inputLower.includes('save')) {
            tools_allowed.push('file_operations');
        }

        // Determine inference permission
        const inference_allowed = context_valid; // Allow inference when context valid

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
            tools_allowed,
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