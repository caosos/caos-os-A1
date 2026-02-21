import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Code, Database, Zap } from 'lucide-react';

export default function GenValidatorExtension() {
  return (
    <div className="space-y-6 text-white/90 text-sm leading-relaxed">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              v2.1
            </Badge>
            CAOS:GEN.VALIDATOR.EXTENSION
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">APPLIES_TO=MODE_GEN_ONLY</Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">REQUIRES=GEN_UPGRADE_v2.0_ACTIVE</Badge>
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">PURPOSE=BLOCK_GENERIC_STRUCTURAL_COMPLIANCE_WITHOUT_SIGNAL</Badge>
          </div>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              I. PROBLEM STATEMENT
            </h3>
            <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded space-y-2">
              <p className="font-bold text-red-300">Structural compliance alone is insufficient.</p>
              <p>GEN may restate policy without applying it.</p>
              <p className="text-yellow-300">This extension enforces environment anchoring and mechanism density.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">II. NEW VALIDATION CHECKS</h3>
            
            {/* CHECK_7 */}
            <div className="bg-white/5 border border-blue-400/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-blue-300 text-base">CHECK_7: ENVIRONMENT ANCHOR REQUIREMENT</h4>
              </div>
              <p className="mb-3 text-yellow-300 font-medium">Response must reference at least THREE system-specific anchors.</p>
              
              <div className="bg-black/20 rounded p-3 mb-3">
                <p className="text-xs text-white/60 mb-2">Valid anchors include:</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <code className="text-cyan-300">hybridMessage</code>
                  <code className="text-cyan-300">ExecutionLog</code>
                  <code className="text-cyan-300">retrieval_pipeline</code>
                  <code className="text-cyan-300">generative_pipeline</code>
                  <code className="text-cyan-300">tool_choice</code>
                  <code className="text-cyan-300">temperature_used</code>
                  <code className="text-cyan-300">STATE=UNKNOWN</code>
                  <code className="text-cyan-300">idempotency_guard</code>
                  <code className="text-cyan-300">operator_console</code>
                  <code className="text-cyan-300">validation_middleware</code>
                  <code className="text-cyan-300">request_id</code>
                  <code className="text-cyan-300">payload_hash</code>
                  <code className="text-cyan-300">regen_attempt</code>
                  <code className="text-cyan-300">mode_isolation</code>
                  <code className="text-cyan-300">Base44</code>
                  <code className="text-cyan-300">Whisper_ingestion</code>
                </div>
              </div>
              
              <div className="bg-red-500/10 border-l-4 border-red-500 p-2 rounded font-mono text-xs">
                If count &lt; 3 → REGENERATE
              </div>
            </div>

            {/* CHECK_8 */}
            <div className="bg-white/5 border border-purple-400/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-purple-300 text-base">CHECK_8: DEPENDENCY DECLARATION REQUIREMENT</h4>
              </div>
              <p className="mb-3 text-yellow-300 font-medium">Response must include at least ONE explicit system dependency clause.</p>
              
              <div className="bg-black/20 rounded p-3 mb-3">
                <p className="text-xs text-white/60 mb-2">Valid patterns include:</p>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <code className="text-green-300">"depends on"</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <code className="text-green-300">"requires configuration"</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <code className="text-green-300">"only if enabled"</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <code className="text-green-300">"if the validator is active"</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <code className="text-green-300">"provided that"</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <code className="text-green-300">"assuming X is enforced"</code>
                  </li>
                </ul>
              </div>
              
              <div className="bg-red-500/10 border-l-4 border-red-500 p-2 rounded font-mono text-xs">
                If none detected → REGENERATE
              </div>
            </div>

            {/* CHECK_9 */}
            <div className="bg-white/5 border border-green-400/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-green-400" />
                <h4 className="font-bold text-green-300 text-base">CHECK_9: OPERATIONAL ACTION REQUIREMENT</h4>
              </div>
              <p className="mb-3 text-yellow-300 font-medium">Response must include at least ONE concrete runtime recommendation.</p>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-green-500/10 rounded p-3">
                  <p className="text-xs text-green-400 font-bold mb-2">✓ VALID EXAMPLES:</p>
                  <ul className="space-y-1 text-xs text-white/80">
                    <li>"add logging for request_id"</li>
                    <li>"enforce JSON schema at middleware"</li>
                    <li>"increase idempotency window"</li>
                    <li>"adjust GEN_SIGNAL_THRESHOLD"</li>
                    <li>"add CHECK_7–9 to validator pass"</li>
                  </ul>
                </div>
                <div className="bg-red-500/10 rounded p-3">
                  <p className="text-xs text-red-400 font-bold mb-2">✗ INVALID (TOO GENERIC):</p>
                  <ul className="space-y-1 text-xs text-white/80">
                    <li>"improve structure"</li>
                    <li>"enhance validation"</li>
                    <li>"optimize performance"</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-red-500/10 border-l-4 border-red-500 p-2 rounded font-mono text-xs">
                If no concrete action tied to runtime variables → REGENERATE
              </div>
            </div>

            {/* CHECK_10 */}
            <div className="bg-white/5 border border-red-400/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h4 className="font-bold text-red-300 text-base">CHECK_10: GENERICITY BLOCKER</h4>
              </div>
              <p className="mb-3 text-yellow-300 font-medium">Block response if:</p>
              
              <ul className="space-y-2 mb-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 flex-shrink-0">✗</span>
                  <span>More than 30% of content describes policy itself</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 flex-shrink-0">✗</span>
                  <span>No reference to active runtime state</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 flex-shrink-0">✗</span>
                  <span>Could apply unchanged to any generic AI system</span>
                </li>
              </ul>
              
              <div className="bg-red-500/20 border-l-4 border-red-500 p-3 rounded font-mono text-xs">
                <p className="font-bold mb-1">If detected → RETURN:</p>
                <p>STATE=GEN_GENERIC_BLOCKED</p>
                <p>REASON=INSUFFICIENT_ENVIRONMENT_BINDING</p>
                <p className="mt-2 text-red-300">No regeneration attempt for this failure class.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">III. SCORING LAYER</h3>
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/30 rounded-lg p-4">
              <pre className="font-mono text-sm text-white/90 mb-4">
GEN_QUALITY_SCORE = 
  (environment_anchor_count × 2) +
  (dependency_present ? 3 : 0) +
  (actionable_steps_count × 2) +
  (constraint_clause_present ? 2 : 0)
              </pre>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded p-3">
                  <p className="text-xs text-white/60 mb-1">Minimum acceptable score:</p>
                  <p className="text-2xl font-bold text-yellow-400">9</p>
                </div>
                <div className="bg-white/5 rounded p-3 text-xs space-y-1">
                  <p className="text-red-300">If score &lt; 9 → REGENERATE_ONCE</p>
                  <p className="text-red-400 font-bold">If still &lt; 9 → RETURN_VALIDATION_FAILURE</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">IV. LOGGING ENHANCEMENT</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3">
                <p className="text-xs text-yellow-400 font-bold mb-2">On regeneration, log:</p>
                <ul className="space-y-1 text-xs font-mono">
                  <li className="text-white/80">• missing_check</li>
                  <li className="text-white/80">• anchor_count</li>
                  <li className="text-white/80">• quality_score</li>
                  <li className="text-white/80">• regen_attempt_number</li>
                </ul>
              </div>
              
              <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3">
                <p className="text-xs text-red-400 font-bold mb-2">On block, log:</p>
                <ul className="space-y-1 text-xs font-mono">
                  <li className="text-white/80">• failure_type=GEN_GENERIC_BLOCKED</li>
                  <li className="text-white/80">• response_hash</li>
                  <li className="text-white/80">• request_id</li>
                </ul>
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-3">
              <p className="text-xs text-cyan-400 font-bold mb-2">Expose in operator console:</p>
              <div className="grid grid-cols-2 gap-2">
                <code className="text-xs text-cyan-300">GEN_QUALITY_SCORE</code>
                <code className="text-xs text-cyan-300">ANCHOR_COUNT</code>
                <code className="text-xs text-cyan-300">REGEN_COUNT</code>
                <code className="text-xs text-cyan-300">FAILURE_REASON</code>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">V. ENFORCEMENT ORDER</h3>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-xs text-white/60 mb-3">Validation order:</p>
              <ol className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-bold text-sm flex-shrink-0">1.</span>
                  <div>
                    <p className="text-white/90">Section structure check (v2.0)</p>
                    <p className="text-xs text-white/50">5 mandatory sections present</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-bold text-sm flex-shrink-0">2.</span>
                  <div>
                    <p className="text-white/90">Inflation filter</p>
                    <p className="text-xs text-white/50">Prohibited capability terms check</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-bold text-sm flex-shrink-0">3.</span>
                  <div>
                    <p className="text-white/90">CHECK_7 (anchor count)</p>
                    <p className="text-xs text-white/50">≥3 system-specific references</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-bold text-sm flex-shrink-0">4.</span>
                  <div>
                    <p className="text-white/90">CHECK_8 (dependency)</p>
                    <p className="text-xs text-white/50">≥1 explicit dependency clause</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-bold text-sm flex-shrink-0">5.</span>
                  <div>
                    <p className="text-white/90">CHECK_9 (operational action)</p>
                    <p className="text-xs text-white/50">≥1 concrete runtime recommendation</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-bold text-sm flex-shrink-0">6.</span>
                  <div>
                    <p className="text-white/90">CHECK_10 (genericity)</p>
                    <p className="text-xs text-white/50">Block generic policy restatements</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-bold text-sm flex-shrink-0">7.</span>
                  <div>
                    <p className="text-white/90">Score threshold</p>
                    <p className="text-xs text-white/50">Minimum quality score = 9</p>
                  </div>
                </li>
              </ol>
              
              <div className="mt-4 bg-red-500/10 border-l-4 border-red-500 p-3 rounded">
                <p className="text-red-300 font-bold text-sm">No silent fallback to looser rules.</p>
              </div>
            </div>
          </section>

          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-lg p-4">
              <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Quality Score Calculator Example
              </h4>
              <div className="bg-black/30 rounded p-3 font-mono text-xs space-y-1">
                <p className="text-cyan-300">environment_anchor_count = 5</p>
                <p className="text-cyan-300">dependency_present = true</p>
                <p className="text-cyan-300">actionable_steps_count = 2</p>
                <p className="text-cyan-300">constraint_clause_present = true</p>
                <p className="text-white/40 my-2">━━━━━━━━━━━━━━━━━━━━━━━</p>
                <p className="text-yellow-300">SCORE = (5 × 2) + 3 + (2 × 2) + 2</p>
                <p className="text-yellow-300">SCORE = 10 + 3 + 4 + 2</p>
                <p className="text-green-400 font-bold text-base">SCORE = 19 ✓ PASS</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/20 text-center">
            <Badge variant="outline" className="bg-white/5 text-white/90 border-white/30">
              END_PATCH
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}