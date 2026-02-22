import React from 'react';

export default function UnifiedGovernanceGateSpec() {
    return (
        <div className="max-w-6xl mx-auto p-8 bg-slate-50">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="border-b-4 border-slate-800 pb-4 mb-8">
                    <h1 className="text-4xl font-bold text-slate-900">CAOS UNIFIED GOVERNANCE GATE</h1>
                    <div className="flex gap-4 mt-2 text-sm text-slate-600">
                        <span><strong>Version:</strong> v2026-02-22</span>
                        <span><strong>Status:</strong> CANONICAL IMPLEMENTATION SPEC</span>
                    </div>
                    <p className="mt-2 text-slate-700">Single deterministic pipeline enforcing all CAOS contracts</p>
                </div>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">I. EXECUTIVE SUMMARY</h2>
                    <p className="mb-4 text-slate-700">
                        The Unified Governance Gate is the <strong>single mandatory execution path</strong> for all CAOS operations. It enforces:
                    </p>
                    <ul className="list-disc ml-6 space-y-2 text-slate-700">
                        <li><strong>Mode Discipline</strong> (GEN cannot search)</li>
                        <li><strong>System Claim Verification</strong> (no unverified assertions)</li>
                        <li><strong>Memory Continuity</strong> (activation + drift detection)</li>
                        <li><strong>Fail Loudly</strong> (explicit error propagation)</li>
                        <li><strong>Receipt Generation</strong> (full audit trail)</li>
                    </ul>
                    <p className="mt-4 text-lg font-bold text-red-600">No bypass. No fallback. No skip.</p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">II. PIPELINE STAGES (NON-SKIPPABLE)</h2>
                    
                    <div className="space-y-6">
                        {/* Stage 0 */}
                        <div className="border-l-4 border-blue-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 0: PRE-INFERENCE NORMALIZATION</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> Clean STT artifacts, apply lexical rules (chaos → CAOS), collapse whitespace
                            </p>
                            <div className="bg-slate-50 p-4 rounded mt-2">
                                <code className="text-sm">
                                    {`Input: { raw_input, user_email }`}<br/>
                                    {`Output: { stage: "NORMALIZE", input, output, transformations_applied }`}
                                </code>
                            </div>
                        </div>

                        {/* Stage 1 */}
                        <div className="border-l-4 border-green-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 1: INTENT RESOLUTION</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> Detect patterns, extract terms, classify intent (LIST_THREADS, SEARCH_THREADS, GENERIC_GEN)
                            </p>
                            <div className="bg-slate-50 p-4 rounded mt-2">
                                <code className="text-sm">
                                    {`Output: { intent, confidence, extractedTerms, multiQuery, forceRetrievalMode }`}
                                </code>
                            </div>
                            <div className="bg-red-50 border border-red-200 p-3 rounded mt-2">
                                <strong className="text-red-700">Failure:</strong> <code>DRIFT_VIOLATION</code> if forceRetrievalMode=true but intent ≠ SEARCH_THREADS
                            </div>
                        </div>

                        {/* Stage 2 */}
                        <div className="border-l-4 border-purple-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 2: MODE ASSIGNMENT</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> Map intent → mode, verify capability enabled in manifest
                            </p>
                            <div className="bg-slate-50 p-4 rounded mt-2">
                                <code className="text-sm">
                                    {`Modes: RETRIEVAL | GEN | LIVE_WEB | FILE_SEARCH | PYTHON | IMAGE`}
                                </code>
                            </div>
                            <div className="bg-red-50 border border-red-200 p-3 rounded mt-2">
                                <strong className="text-red-700">Failure:</strong> <code>MODE_DISABLED</code> if capability not enabled
                            </div>
                        </div>

                        {/* Stage 3 */}
                        <div className="border-l-4 border-orange-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 3: TOOL ROUTING</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> Map intent → route, select formatter, verify route matches mode
                            </p>
                            <div className="bg-red-50 border border-red-200 p-3 rounded mt-2">
                                <strong className="text-red-700">Failure:</strong> <code>ROUTE_MODE_MISMATCH</code> if RETRIEVAL mode with non-THREAD route
                            </div>
                        </div>

                        {/* Stage 4 */}
                        <div className="border-l-4 border-indigo-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 4: MEMORY ACTIVATION</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> Query BeliefNodes, compute recency + relevance, activate top-K beliefs
                            </p>
                            <div className="bg-slate-50 p-4 rounded mt-2">
                                <code className="text-sm">
                                    {`activation = recency × relevance`}<br/>
                                    {`threshold: 0.35 | decay_days: 60 | top_k: 25`}
                                </code>
                            </div>
                        </div>

                        {/* Stage 5 */}
                        <div className="border-l-4 border-yellow-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 5: DRIFT CHECK</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> Detect conflicts (contradiction, incompatible facts), classify severity
                            </p>
                            <div className="bg-slate-50 p-4 rounded mt-2">
                                <code className="text-sm">
                                    {`Status: PASS | ALERT | BLOCKED`}
                                </code>
                            </div>
                            <div className="bg-red-50 border border-red-200 p-3 rounded mt-2">
                                <strong className="text-red-700">Failure:</strong> <code>DRIFT_DETECTED</code> if status=BLOCKED
                            </div>
                        </div>

                        {/* Stage 6 */}
                        <div className="border-l-4 border-cyan-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 6: TOOL EXECUTION</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> Execute tool based on route, return executor contract response
                            </p>
                            <div className="bg-slate-50 p-4 rounded mt-2">
                                <code className="text-sm">
                                    {`Contract: { ok, tool, executor, latency_ms, input_fingerprint, output_fingerprint, data }`}
                                </code>
                            </div>
                        </div>

                        {/* Stage 7 */}
                        <div className="border-l-4 border-pink-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 7: RESULT FORMATTING</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> Apply formatter, structure output for mode
                            </p>
                        </div>

                        {/* Stage 8 */}
                        <div className="border-l-4 border-teal-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 8: CLAIM VERIFICATION</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> Parse claims, classify as OBSERVED | RETRIEVED | MEMORY | INFERRED | UNVERIFIED
                            </p>
                            <div className="bg-red-50 border border-red-200 p-3 rounded mt-2">
                                <strong className="text-red-700">Contract:</strong> GEN mode with RETRIEVED claims → <code>GEN_SEARCH_VIOLATION</code>
                            </div>
                        </div>

                        {/* Stage 9 */}
                        <div className="border-l-4 border-lime-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 9: RECEIPT GENERATION</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> Aggregate metadata, build audit receipt
                            </p>
                            <div className="bg-slate-50 p-4 rounded mt-2">
                                <code className="text-sm">
                                    {`Receipt: { request_id, mode, intent, route, executor, claims, drift_status, latency_ms }`}
                                </code>
                            </div>
                        </div>

                        {/* Stage 10 */}
                        <div className="border-l-4 border-rose-500 pl-4">
                            <h3 className="text-xl font-bold text-slate-900">STAGE 10: COGNITIVE LAYER</h3>
                            <p className="text-slate-700 mt-2">
                                <strong>Operations:</strong> If GEN mode: optional LLM expansion. Enforce GEN constraints (no citations)
                            </p>
                            <div className="bg-red-50 border border-red-200 p-3 rounded mt-2">
                                <strong className="text-red-700">Failure:</strong> <code>ROUTE_VIOLATION_GEN_SEARCH</code> if search simulation detected
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">III. CONTRACT ENFORCEMENT MATRIX</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-slate-300">
                            <thead className="bg-slate-800 text-white">
                                <tr>
                                    <th className="border border-slate-300 px-4 py-2 text-left">Contract</th>
                                    <th className="border border-slate-300 px-4 py-2 text-left">Enforced By</th>
                                    <th className="border border-slate-300 px-4 py-2 text-left">Stage</th>
                                    <th className="border border-slate-300 px-4 py-2 text-left">Failure Code</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                <tr>
                                    <td className="border border-slate-300 px-4 py-2">GEN No Search</td>
                                    <td className="border border-slate-300 px-4 py-2">applyCognitiveLayer</td>
                                    <td className="border border-slate-300 px-4 py-2">10</td>
                                    <td className="border border-slate-300 px-4 py-2"><code>ROUTE_VIOLATION_GEN_SEARCH</code></td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 px-4 py-2">Mode matches capability</td>
                                    <td className="border border-slate-300 px-4 py-2">stage2_assignMode</td>
                                    <td className="border border-slate-300 px-4 py-2">2</td>
                                    <td className="border border-slate-300 px-4 py-2"><code>MODE_DISABLED</code></td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 px-4 py-2">Route matches mode</td>
                                    <td className="border border-slate-300 px-4 py-2">stage3_routeTool</td>
                                    <td className="border border-slate-300 px-4 py-2">3</td>
                                    <td className="border border-slate-300 px-4 py-2"><code>ROUTE_MODE_MISMATCH</code></td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 px-4 py-2">Drift detected</td>
                                    <td className="border border-slate-300 px-4 py-2">stage5_driftCheck</td>
                                    <td className="border border-slate-300 px-4 py-2">5</td>
                                    <td className="border border-slate-300 px-4 py-2"><code>DRIFT_DETECTED</code></td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 px-4 py-2">Executor contract</td>
                                    <td className="border border-slate-300 px-4 py-2">executeTool</td>
                                    <td className="border border-slate-300 px-4 py-2">6</td>
                                    <td className="border border-slate-300 px-4 py-2">Varies (ok=false)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">IV. BASE44 IMPLEMENTATION CHECKLIST</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">Backend (Minimum Viable)</h3>
                            <ul className="space-y-1 text-slate-700">
                                <li>☐ Deploy unifiedGovernanceGate.js</li>
                                <li>☐ Create SessionManifest entity</li>
                                <li>☐ Create BeliefNode entity</li>
                                <li>☐ Implement memory activation engine</li>
                                <li>☐ Implement drift detection engine</li>
                                <li>☐ Implement claim verification classifier</li>
                                <li>☐ Wire all 10 stages</li>
                                <li>☐ Add DriftEvent logging</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">Frontend (Minimum Viable)</h3>
                            <ul className="space-y-1 text-slate-700">
                                <li>☐ Mode banner (always visible)</li>
                                <li>☐ Receipt drawer (click to expand)</li>
                                <li>☐ Drift alert modal (blocks on conflicts)</li>
                                <li>☐ Memory dashboard page</li>
                                <li>☐ Belief detail page</li>
                                <li>☐ Claim classification tags in responses</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">V. PHASED ROLLOUT</h2>
                    <div className="space-y-4">
                        <div className="bg-green-50 border-l-4 border-green-500 p-4">
                            <h4 className="font-bold text-green-900">Phase 1 (MVP)</h4>
                            <p className="text-green-800">Stages 0-3, 6-7, 10 only. No memory. Basic claims. Receipt generation.</p>
                        </div>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                            <h4 className="font-bold text-blue-900">Phase 2 (Memory)</h4>
                            <p className="text-blue-800">Enable stages 4-5. Full claim verification. Memory activation + drift check.</p>
                        </div>
                        <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                            <h4 className="font-bold text-purple-900">Phase 3 (Production)</h4>
                            <p className="text-purple-800">Full contract enforcement. Strict mode. Acceptance tests passing. Monitoring + alerts.</p>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900 text-white p-6 rounded-lg">
                    <h2 className="text-2xl font-bold mb-4">FINAL NOTES</h2>
                    <p className="text-lg mb-4">
                        This spec is <strong>executable</strong>. Base44 can implement this as-is.
                    </p>
                    <ul className="space-y-2 text-lg">
                        <li>✓ No ambiguity.</li>
                        <li>✓ No optional steps.</li>
                        <li>✓ No "best effort."</li>
                    </ul>
                    <p className="text-xl font-bold mt-6 text-red-400">Fail loudly. Always.</p>
                </section>
            </div>
        </div>
    );
}