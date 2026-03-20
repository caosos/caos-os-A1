/**
 * INSPECTION TOOL - RAW ROUTING LOGS
 * 
 * Logs every stage of the pipeline for debugging.
 * NO PATCHES. NO EDITS. LOGS ONLY.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { normalizeInput } from './core/normalize.js';
import { resolveIntent } from './stages/resolveIntent.js';
import { routeTool } from './stages/routeTool.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const testInputs = [
            "Write a story about today.",
            "List my threads.",
            "Search threads for Brookdale.",
            "What's the next thing we should lock down?"
        ];

        const inspectionResults = [];

        for (const rawInput of testInputs) {
            const inspectionLog = {
                test_input: rawInput,
                stages: {}
            };

            try {
                // STAGE 0: LOG RAW INPUT
                inspectionLog.stages.raw_input = {
                    value: rawInput,
                    type: typeof rawInput,
                    length: rawInput.length
                };

                // STAGE 1: LOG NORMALIZE OUTPUT
                const normalized = await normalizeInput(rawInput, base44, user.email);
                inspectionLog.stages.normalize_output = {
                    value: normalized,
                    type: typeof normalized,
                    length: normalized.length,
                    changed: normalized !== rawInput,
                    diff_length: normalized.length - rawInput.length
                };

                // STAGE 2: LOG RESOLVE INTENT EXACT RETURN
                const intentResult = resolveIntent({
                    userMessage: normalized,
                    timestamp: Date.now(),
                    userEmail: user.email,
                    sessionId: `inspect_${Date.now()}`
                });

                inspectionLog.stages.resolveIntent_output = {
                    exact_return_object: intentResult,
                    triggered_branch: determineTriggeredBranch(normalized, intentResult)
                };

                // CHECK GEN_LOCK STATUS (doesn't exist anymore, but log that)
                inspectionLog.stages.gen_lock_status = {
                    active: false,
                    note: "GEN_LOCK removed - conversational lock now in pipeline"
                };

                // STAGE 3: LOG ROUTE TOOL EXACT RETURN
                const routeResult = routeTool(intentResult);
                inspectionLog.stages.routeTool_output = {
                    exact_return_object: routeResult
                };

                inspectionResults.push(inspectionLog);

            } catch (error) {
                inspectionLog.error = {
                    message: error.message,
                    stack: error.stack
                };
                inspectionResults.push(inspectionLog);
            }
        }

        return Response.json({
            inspection_timestamp: new Date().toISOString(),
            inspector: user.email,
            results: inspectionResults
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🔥 [INSPECTION_FAILED]', error);
        return Response.json({
            error: 'Inspection harness failure',
            details: error.message
        }, { status: 500 });
    }
});

function determineTriggeredBranch(input, intentResult) {
    const analysis = {
        intent: intentResult.intent,
        reason: intentResult.reason,
        confidence: intentResult.confidence,
        likely_branch: null,
        evidence: []
    };

    // Analyze which patterns likely triggered
    const searchKeywords = ['search', 'find', 'mention', 'mentions', 'list mentions', 'contain', 'contains', 'about'];
    const listPatterns = /^list (my )?threads|^show (my )?threads/i;
    const genStrongPatterns = [
        /talk about/i,
        /where are we/i,
        /reflect/i,
        /write (me )?a story/i
    ];

    if (listPatterns.test(input)) {
        analysis.likely_branch = 'explicit_list_pattern (line ~25-31 in resolveIntent)';
        analysis.evidence.push('Matched LIST_THREADS pattern');
    } else if (searchKeywords.some(kw => input.toLowerCase().includes(kw))) {
        analysis.likely_branch = 'search_keyword_detected (line ~67-81 in resolveIntent)';
        analysis.evidence.push('Detected search keyword in input');
    } else if (genStrongPatterns.some(p => p.test(input))) {
        analysis.likely_branch = 'gen_strong_pattern (line ~48-56 in resolveIntent)';
        analysis.evidence.push('Matched strong GEN pattern');
    } else {
        analysis.likely_branch = 'default_conversational_path (line ~88-94 in resolveIntent)';
        analysis.evidence.push('No strong patterns detected - defaulted to GEN');
    }

    return analysis;
}