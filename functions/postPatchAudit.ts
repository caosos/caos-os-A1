/**
 * CAOS — MANDATORY POST-PATCH TEST PROTOCOL
 * 
 * Automatically runs canonical test suite after any code change.
 * Enforces Patch → Auto Test → Report workflow.
 * 
 * No fix is valid until it passes the 5-test harness.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CANONICAL_TESTS = [
    { input: "Write a story about today.", expects: { mode: "GEN", no_mode_tag: true, identity_maintained: true } },
    { input: "Aria, reflect in the first person.", expects: { mode: "GEN", no_mode_tag: true, identity_maintained: true } },
    { input: "List mentions of Brookdale.", expects: { mode: "RETRIEVAL", no_mode_tag: true } },
    { input: "You like to smoke weed, man?", expects: { mode: "GEN", no_fallback: true } },
    { input: "Aria, what do you know about Grok?", expects: { mode: "GEN", trace_returned: true } }
];

const FORBIDDEN_FALLBACK_PHRASES = [
    /as an artificial intelligence/i,
    /as an ai language model/i,
    /i am an ai assistant/i,
    /i'm just an ai/i
];

async function runSingleTest(input, base44, user, sessionId) {
    try {
        // Include internal test header to bypass auth in nested calls if needed
        const response = await base44.functions.invoke('hybridMessage', {
            input,
            session_id: sessionId,
            trace: true,
            _internal_test: true
        });

        const { data } = response;
        
        return {
            success: true,
            mode: data?.mode || null,
            reply: data?.reply || null,
            execution_receipt: data?.execution_receipt || null,
            trace: data?.trace || null,
            execution_state: data?.execution_state || null
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Test execution failed',
            mode: null,
            reply: null,
            execution_receipt: null,
            trace: null
        };
    }
}

function analyzeResult(testCase, result) {
    const analysis = {
        test_input: testCase.input,
        route_used: result.execution_receipt?.routing?.pipeline || 'UNKNOWN',
        mode_returned: result.mode,
        mode_leakage: false,
        identity_maintained: true,
        fallback_detected: false,
        trace_returned: !!result.trace,
        errors: [],
        warnings: []
    };

    // Check for mode tag leakage in reply
    if (result.reply && /\[MODE=[A-Z_]+\]/i.test(result.reply)) {
        analysis.mode_leakage = true;
        analysis.errors.push('MODE tag found in user-facing response');
    }

    // Check for forbidden fallback phrases
    if (result.reply) {
        for (const pattern of FORBIDDEN_FALLBACK_PHRASES) {
            if (pattern.test(result.reply)) {
                analysis.fallback_detected = true;
                analysis.identity_maintained = false;
                analysis.errors.push(`Forbidden fallback phrase detected: ${pattern.source}`);
                break;
            }
        }
    }

    // Verify expected mode
    if (testCase.expects.mode && result.mode !== testCase.expects.mode) {
        analysis.warnings.push(`Expected mode ${testCase.expects.mode}, got ${result.mode}`);
    }

    // Verify trace presence
    if (testCase.expects.trace_returned && !result.trace) {
        analysis.errors.push('Trace expected but not returned');
    }

    // Check for execution errors
    if (!result.success) {
        analysis.errors.push(result.error || 'Execution failed');
    }

    // Check execution receipt for failures
    if (result.execution_receipt?.execution_mode === 'ERROR') {
        analysis.errors.push(`Execution error: ${result.execution_receipt.fallback?.reason || 'Unknown'}`);
    }

    return analysis;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Check for internal test execution flag
        const isInternalTest = req.headers.get('x-internal-test') === 'true';
        
        // Allow if internal test OR admin user
        if (!isInternalTest) {
            const user = await base44.auth.me();
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Admin access required' }, { status: 403 });
            }
        }
        
        const user = await base44.auth.me().catch(() => null);

        const sessionId = `audit_${Date.now()}`;
        const auditResults = [];
        let passCount = 0;
        let failCount = 0;
        let regressionDetected = false;

        console.log('🔬 [POST-PATCH AUDIT] Starting canonical test suite...');

        for (const testCase of CANONICAL_TESTS) {
            console.log(`\n📋 Testing: "${testCase.input}"`);
            
            const result = await runSingleTest(testCase.input, base44, user, sessionId);
            const analysis = analyzeResult(testCase, result);
            
            auditResults.push(analysis);

            // Determine pass/fail
            const hasCriticalErrors = analysis.errors.length > 0 || 
                                     analysis.mode_leakage || 
                                     analysis.fallback_detected ||
                                     (testCase.expects.trace_returned && !analysis.trace_returned);

            if (hasCriticalErrors) {
                failCount++;
                regressionDetected = true;
                console.error(`❌ FAIL: ${analysis.errors.join(', ')}`);
            } else {
                passCount++;
                console.log(`✅ PASS`);
            }
        }

        const auditSummary = {
            test_protocol_version: "2026-02-24-MANDATORY",
            timestamp: new Date().toISOString(),
            total_tests: CANONICAL_TESTS.length,
            passed: passCount,
            failed: failCount,
            regression_detected: regressionDetected,
            status: regressionDetected ? 'REGRESSION_DETECTED' : 'ALL_PASS'
        };

        console.log('\n' + '='.repeat(70));
        console.log('🔬 POST-PATCH AUDIT SUMMARY');
        console.log('='.repeat(70));
        console.log(`Tests Run: ${auditSummary.total_tests}`);
        console.log(`Passed: ${auditSummary.passed}`);
        console.log(`Failed: ${auditSummary.failed}`);
        console.log(`Status: ${auditSummary.status}`);
        console.log('='.repeat(70));

        if (regressionDetected) {
            console.error('\n🚨 REGRESSION DETECTED - FIX NOT VALID');
            console.error('Review failed tests above and address issues.');
        } else {
            console.log('\n✅ ALL TESTS PASSED - FIX VALIDATED');
        }

        return Response.json({
            summary: auditSummary,
            results: auditResults,
            canonical_tests: CANONICAL_TESTS
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🔥 [AUDIT_HARNESS_FAILURE]', error);
        return Response.json({
            error: 'Audit harness failure',
            details: error.message
        }, { status: 500 });
    }
});