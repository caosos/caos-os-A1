/**
 * CAOS — MANDATORY POST-PATCH TEST PROTOCOL
 * 
 * Automatically runs canonical test suite after any code change.
 * Enforces Patch → Auto Test → Report workflow.
 * 
 * No fix is valid until it passes the 5-test harness.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { runHybridPipeline } from './runHybridPipeline.js';

// PATCH 01: 5-Test Gate (MUST PASS for deployment)
const CANONICAL_TESTS = [
    { 
        input: "Write a story about today.", 
        expects: { mode: "GEN", no_mode_tag: true, no_scaffold: true, identity_maintained: true, identity_is_aria: true } 
    },
    { 
        input: "Aria, reflect in the first person about what we fixed today.", 
        expects: { mode: "GEN", no_mode_tag: true, no_scaffold: true, identity_maintained: true, first_person: true } 
    },
    { 
        input: "list mentions of Brookdale", 
        expects: { mode: "RETRIEVAL", no_mode_tag: true, no_scaffold: true } 
    },
    { 
        input: "https://www.youtube.com/watch?v=v23H7c149HM don't echo this; summarize what it is", 
        expects: { mode: "GEN", no_mode_tag: true, no_scaffold: true, no_echo_url: true } 
    },
    { 
        input: "You like to smoke weed, man?", 
        expects: { mode: "GEN", no_mode_tag: true, no_scaffold: true, no_fallback: true, natural_tone: true } 
    }
];

const FORBIDDEN_FALLBACK_PHRASES = [
    /as an artificial intelligence/i,
    /as an ai language model/i,
    /i am an ai assistant/i,
    /i'm just an ai/i
];

async function runSingleTest(input, base44, user, sessionId) {
    try {
        // Call pipeline directly - no HTTP layer, no auth blocking
        const result = await runHybridPipeline(input, {
            base44,
            user,
            session_id: sessionId,
            trace: true
        });

        return {
            success: true,
            mode: result.mode || null,
            reply: result.reply || null,
            execution_receipt: result.execution_receipt || null,
            trace: result.trace || null,
            execution_state: result.execution_state || null
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
        scaffold_leakage: false,
        identity_maintained: true,
        identity_is_aria: true,
        first_person_used: false,
        url_echoed: false,
        fallback_detected: false,
        natural_tone: true,
        trace_returned: !!result.trace,
        errors: [],
        warnings: []
    };

    // Check for mode tag leakage in reply
    if (result.reply && /\[MODE=[A-Z_]+\]/i.test(result.reply)) {
        analysis.mode_leakage = true;
        analysis.errors.push('MODE tag found in user-facing response');
    }

    // Check for scaffold leakage (PATCH 1 CRITICAL)
    const scaffoldPatterns = [
        /OBSERVATIONAL LAYER/i,
        /INTERPRETIVE LAYER/i,
        /SYSTEMS FRAMING LAYER/i,
        /FORWARD VECTOR LAYER/i,
        /OBSERVATIONAL:/i,
        /INTERPRETIVE:/i,
        /SYSTEMS:/i,
        /FORWARD:/i
    ];

    if (result.reply) {
        for (const pattern of scaffoldPatterns) {
            if (pattern.test(result.reply)) {
                analysis.scaffold_leakage = true;
                analysis.errors.push(`Scaffold leaked: ${pattern.source}`);
                break;
            }
        }
    }

    // Check for forbidden fallback phrases
    if (result.reply) {
        for (const pattern of FORBIDDEN_FALLBACK_PHRASES) {
            if (pattern.test(result.reply)) {
                analysis.fallback_detected = true;
                analysis.identity_maintained = false;
                analysis.natural_tone = false;
                analysis.errors.push(`Forbidden fallback phrase detected: ${pattern.source}`);
                break;
            }
        }
        
        // PATCH 01: Check identity is Aria (not CAOS)
        if (/I am CAOS/i.test(result.reply) || /I'm CAOS/i.test(result.reply)) {
            analysis.identity_is_aria = false;
            analysis.errors.push('Assistant identified as CAOS instead of Aria');
        }
        
        // PATCH 01: Check for first-person if expected
        if (testCase.expects.first_person) {
            if (/\b(I|me|my|mine)\b/i.test(result.reply)) {
                analysis.first_person_used = true;
            } else {
                analysis.errors.push('Expected first-person perspective not detected');
            }
        }
        
        // PATCH 01: Check URL not simply echoed back
        if (testCase.expects.no_echo_url && testCase.input.includes('http')) {
            const urlMatch = testCase.input.match(/https?:\/\/[^\s]+/);
            if (urlMatch && result.reply.includes(urlMatch[0]) && result.reply.length < 200) {
                analysis.url_echoed = true;
                analysis.errors.push('URL echoed back without analysis');
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

    // Check for scaffold leak error
    if (result.error === 'SCAFFOLD_LEAK_DETECTED') {
        analysis.scaffold_leakage = true;
        analysis.errors.push(`Sanitization caught leak: ${result.details}`);
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
                                       analysis.scaffold_leakage ||
                                       analysis.fallback_detected ||
                                       !analysis.identity_is_aria ||
                                       (testCase.expects.no_echo_url && analysis.url_echoed) ||
                                       (testCase.expects.first_person && !analysis.first_person_used) ||
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