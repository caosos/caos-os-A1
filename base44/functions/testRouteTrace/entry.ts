import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { resolveIntent } from './stages/resolveIntent.js';
import { routeTool } from './stages/routeTool.js';
import { executeTool } from './stages/executeTool.js';
import { formatResult } from './stages/formatResult.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const testInputs = [
            "list mentions of Brookdale",
            "list mentions",
            "Write a story about today",
            "Tell me about Dan Bongino",
            "You like to smoke weed, man?"
        ];

        const results = [];

        for (const input of testInputs) {
            const request_id = crypto.randomUUID();
            const timestamp = Date.now();
            const stage_trace = [];
            const execution_receipt = {
                receipt_version: "1.0",
                receipt_id: request_id,
                timestamp_utc: new Date().toISOString(),
                entry_point: "testRouteTrace",
                execution_mode: null,
                intent: {
                    classification: null,
                    confidence: 0.0,
                    force_retrieval: false,
                    reason: null
                },
                routing: {
                    pipeline: null,
                    formatter: null,
                    requires_tool: false
                },
                tools: {
                    invoked: false,
                    tool_name: null,
                    arguments_valid: null,
                    execution_status: null
                },
                fallback: {
                    triggered: false,
                    fallback_type: null,
                    reason: null
                },
                memory_access: {
                    used: false,
                    source: null
                },
                guardrails: {
                    downgrade_blocked: false,
                    policy_triggered: false
                },
                latency_ms: 0
            };

            // STAGE 1: Entry
            stage_trace.push({
                stage: "entry",
                entry_point: "testRouteTrace",
                request_id,
                input
            });

            let intentResult = null;
            let routeResult = null;
            let toolResult = null;
            let formattedResult = null;
            let finalMode = null;

            try {
                // STAGE 2: Resolve Intent
                intentResult = resolveIntent({
                    userMessage: input,
                    timestamp,
                    userEmail: user.email,
                    sessionId: 'test_session'
                });

                stage_trace.push({
                    stage: "resolveIntent",
                    normalized: input.toLowerCase().replace(/[^a-z0-9,\s]/g, '').trim(),
                    intent: intentResult.intent,
                    confidence: intentResult.confidence,
                    reason: intentResult.reason,
                    extractedTerms: intentResult.extractedTerms || [],
                    forceRetrievalMode: intentResult.forceRetrievalMode || false,
                    error_code: intentResult.error_code || null
                });

                execution_receipt.intent = {
                    classification: intentResult.intent,
                    confidence: intentResult.confidence,
                    force_retrieval: intentResult.forceRetrievalMode || false,
                    reason: intentResult.reason
                };

                // Check for intent-level failure
                if (intentResult.confidence === 0.0 && intentResult.error_code) {
                    execution_receipt.fallback = {
                        triggered: true,
                        fallback_type: "INTENT_EXTRACTION_ERROR",
                        reason: intentResult.error_code
                    };
                    execution_receipt.execution_mode = "ERROR";
                    stage_trace.push({
                        stage: "routeTool",
                        route: null,
                        formatter: null,
                        requiresTool: null,
                        notes: `Failed at intent stage: ${intentResult.error_code}`
                    });
                    stage_trace.push({
                        stage: "executeTool",
                        tool: null,
                        invoked: false,
                        status: null,
                        error_code: intentResult.error_code,
                        result_summary: null
                    });
                    stage_trace.push({
                        stage: "formatResult",
                        formatter: null,
                        output_type: null,
                        notes: "Skipped due to intent failure"
                    });
                    stage_trace.push({
                        stage: "applyCognitiveLayer",
                        mutated_prose: false,
                        notes: "Skipped due to intent failure"
                    });

                    results.push({
                        input,
                        stage_trace,
                        execution_receipt
                    });
                    continue;
                }

                // STAGE 3: Route Tool
                try {
                    routeResult = routeTool(intentResult);

                    stage_trace.push({
                        stage: "routeTool",
                        route: routeResult.route,
                        formatter: routeResult.formatter,
                        requiresTool: routeResult.requiresTool,
                        notes: routeResult.reason || null
                    });

                    execution_receipt.routing = {
                        pipeline: routeResult.route,
                        formatter: routeResult.formatter,
                        requires_tool: routeResult.requiresTool
                    };
                } catch (routeError) {
                    stage_trace.push({
                        stage: "routeTool",
                        route: null,
                        formatter: null,
                        requiresTool: null,
                        notes: `Failed: ${routeError.code || routeError.message}`
                    });

                    execution_receipt.routing.pipeline = "VALIDATION_FAILED";
                    execution_receipt.fallback = {
                        triggered: true,
                        fallback_type: routeError.code || "ROUTE_ERROR",
                        reason: routeError.message || "Route validation failed"
                    };
                    execution_receipt.execution_mode = "ERROR";

                    stage_trace.push({
                        stage: "executeTool",
                        tool: null,
                        invoked: false,
                        status: null,
                        error_code: routeError.code,
                        result_summary: null
                    });
                    stage_trace.push({
                        stage: "formatResult",
                        formatter: null,
                        output_type: null,
                        notes: "Skipped due to route failure"
                    });
                    stage_trace.push({
                        stage: "applyCognitiveLayer",
                        mutated_prose: false,
                        notes: "Skipped due to route failure"
                    });

                    results.push({
                        input,
                        stage_trace,
                        execution_receipt
                    });
                    continue;
                }

                // STAGE 4: Execute Tool
                if (routeResult.requiresTool) {
                    try {
                        toolResult = await executeTool(routeResult, intentResult, base44);

                        stage_trace.push({
                            stage: "executeTool",
                            tool: toolResult.type || toolResult.executor || "database_filter",
                            invoked: true,
                            status: "success",
                            error_code: null,
                            result_summary: `${toolResult.count || 0} results`
                        });

                        execution_receipt.tools = {
                            invoked: true,
                            tool_name: toolResult.type || toolResult.executor || "database_filter",
                            arguments_valid: true,
                            execution_status: "SUCCESS"
                        };
                    } catch (execError) {
                        stage_trace.push({
                            stage: "executeTool",
                            tool: "unknown",
                            invoked: true,
                            status: "fail",
                            error_code: execError.error || "EXECUTION_ERROR",
                            result_summary: null
                        });

                        execution_receipt.tools = {
                            invoked: true,
                            tool_name: "unknown",
                            arguments_valid: true,
                            execution_status: "FAILED"
                        };
                        execution_receipt.fallback = {
                            triggered: true,
                            fallback_type: "TOOL_EXECUTION_ERROR",
                            reason: execError.message || "Tool execution failed"
                        };
                        execution_receipt.execution_mode = "ERROR";

                        stage_trace.push({
                            stage: "formatResult",
                            formatter: null,
                            output_type: null,
                            notes: "Skipped due to execution failure"
                        });
                        stage_trace.push({
                            stage: "applyCognitiveLayer",
                            mutated_prose: false,
                            notes: "Skipped due to execution failure"
                        });

                        results.push({
                            input,
                            stage_trace,
                            execution_receipt
                        });
                        continue;
                    }
                } else {
                    stage_trace.push({
                        stage: "executeTool",
                        tool: null,
                        invoked: false,
                        status: null,
                        error_code: null,
                        result_summary: "No tool required"
                    });
                }

                // STAGE 5: Format Result
                try {
                    formattedResult = formatResult(routeResult, toolResult);

                    stage_trace.push({
                        stage: "formatResult",
                        formatter: routeResult.formatter,
                        output_type: formattedResult.mode,
                        notes: formattedResult.summary || null
                    });

                    finalMode = formattedResult.mode;
                    execution_receipt.execution_mode = finalMode;
                } catch (formatError) {
                    stage_trace.push({
                        stage: "formatResult",
                        formatter: routeResult.formatter,
                        output_type: null,
                        notes: `Failed: ${formatError.message}`
                    });

                    execution_receipt.fallback = {
                        triggered: true,
                        fallback_type: "FORMAT_ERROR",
                        reason: formatError.message || "Formatting failed"
                    };
                    execution_receipt.execution_mode = "ERROR";

                    stage_trace.push({
                        stage: "applyCognitiveLayer",
                        mutated_prose: false,
                        notes: "Skipped due to format failure"
                    });

                    results.push({
                        input,
                        stage_trace,
                        execution_receipt
                    });
                    continue;
                }

                // STAGE 6: Apply Cognitive Layer
                const proseWillBeMutated = finalMode === 'GEN';
                stage_trace.push({
                    stage: "applyCognitiveLayer",
                    mutated_prose: proseWillBeMutated,
                    notes: proseWillBeMutated ? "GEN mode - LLM will generate response" : "RETRIEVAL mode - formatted output returned as-is"
                });

                execution_receipt.latency_ms = Date.now() - timestamp;

                results.push({
                    input,
                    stage_trace,
                    execution_receipt
                });

            } catch (error) {
                // Catch-all for any unexpected errors
                execution_receipt.fallback = {
                    triggered: true,
                    fallback_type: "CRITICAL_ERROR",
                    reason: error.message
                };
                execution_receipt.execution_mode = "ERROR";
                execution_receipt.latency_ms = Date.now() - timestamp;

                results.push({
                    input,
                    stage_trace,
                    execution_receipt,
                    error: error.message
                });
            }
        }

        return Response.json({
            test_version: "2026-02-23-AUDIT-RT1",
            test_count: testInputs.length,
            results
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        return Response.json({
            error: 'Test harness failure',
            details: error.message
        }, { status: 500 });
    }
});