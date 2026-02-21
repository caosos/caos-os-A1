import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GenModeUpgrade() {
  return (
    <div className="space-y-6 text-white/90 text-sm leading-relaxed">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              v2.0
            </Badge>
            CAOS:GEN.UPGRADE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">OBJECTIVE=ENFORCE_HIGH_SIGNAL_COMPREHENSIVE_GENERATION</Badge>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">SCOPE=GEN_MODE_ONLY</Badge>
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">PRIORITY=STRUCTURAL_INTEGRITY_OVER_VERBOSITY</Badge>
          </div>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">I. CORE PRINCIPLE</h3>
            <p className="mb-3">GEN mode must produce responses that are:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Layered</li>
              <li>Mechanism-based</li>
              <li>Constraint-aware</li>
              <li>Forward-actionable</li>
              <li>Truth-bounded</li>
            </ul>
            <div className="mt-3 bg-blue-500/10 border-l-4 border-blue-500 p-3 rounded">
              <p className="font-mono text-sm">Comprehensiveness = signal density + structure + declared limits</p>
              <p className="font-mono text-sm text-red-300">Comprehensiveness ≠ length</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">II. REQUIRED RESPONSE STRUCTURE (MANDATORY)</h3>
            <p className="mb-3 text-yellow-300">Every GEN response MUST contain:</p>
            <div className="space-y-3">
              <div className="bg-white/5 rounded p-3">
                <h4 className="font-bold text-blue-300 mb-1">1. OBSERVATIONAL LAYER</h4>
                <p className="text-sm">What is explicitly known from user input or verified context.</p>
              </div>
              <div className="bg-white/5 rounded p-3">
                <h4 className="font-bold text-purple-300 mb-1">2. INTERPRETIVE LAYER</h4>
                <p className="text-sm">What the observations imply (no unstated assumptions).</p>
              </div>
              <div className="bg-white/5 rounded p-3">
                <h4 className="font-bold text-green-300 mb-1">3. SYSTEMS LAYER</h4>
                <p className="text-sm">How this fits into architecture, execution flow, or systemic design.</p>
              </div>
              <div className="bg-white/5 rounded p-3">
                <h4 className="font-bold text-red-300 mb-1">4. CONSTRAINT & UNKNOWN LAYER</h4>
                <ul className="text-sm ml-4 list-disc">
                  <li>Explicit boundaries</li>
                  <li>Dependencies</li>
                  <li>What is not guaranteed</li>
                  <li>What requires configuration</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded p-3">
                <h4 className="font-bold text-yellow-300 mb-1">5. FORWARD VECTOR</h4>
                <ul className="text-sm ml-4 list-disc">
                  <li>Concrete next steps</li>
                  <li>Decision points</li>
                  <li>Stabilization suggestions</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 bg-red-500/10 border-l-4 border-red-500 p-3 rounded font-mono text-xs">
              <p>If any section missing → REGENERATE_ONCE</p>
              <p>If still missing → RETURN_VALIDATION_FAILURE</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">III. ASSERTION CLASSIFICATION RULE</h3>
            <p className="mb-3">All claims must be tagged internally as one of:</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 justify-center">VERIFIED_CAPABILITY</Badge>
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 justify-center">CONDITIONAL_CAPABILITY</Badge>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 justify-center">CONCEPTUAL_POTENTIAL</Badge>
            </div>
            <div className="bg-white/5 rounded p-3 space-y-2 text-sm">
              <p>• "real-time", "memory", "learns", "integrates" require <span className="text-yellow-300">CONDITIONAL_CAPABILITY</span> framing</p>
              <p>• Absolute words ("always", "guarantees", "ensures") <span className="text-red-300">prohibited</span></p>
              <p>• If host configuration unknown → include dependency clause</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">IV. CAPABILITY INFLATION FILTER</h3>
            <p className="mb-3 text-red-300">Prohibited patterns unless tool-verified:</p>
            <div className="grid grid-cols-2 gap-2">
              <code className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-xs">"comprehensive understanding"</code>
              <code className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-xs">"seamlessly"</code>
              <code className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-xs">"holistic"</code>
              <code className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-xs">"ensures accuracy"</code>
              <code className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-xs">"guaranteed"</code>
              <code className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-xs">"real-time access"</code>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">V. SIGNAL DENSITY REQUIREMENT</h3>
            <p className="mb-3">GEN output must contain:</p>
            <div className="bg-white/5 rounded p-3 space-y-1 text-sm">
              <p>✓ At least 3 concrete mechanism references</p>
              <p>✓ At least 1 declared dependency</p>
              <p>✓ At least 1 explicit limitation</p>
              <p>✓ At least 1 actionable next step</p>
              <p className="text-red-300 font-bold mt-2">✗ No filler conclusions permitted</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">VI. MODE SEPARATION ENFORCEMENT</h3>
            <p className="mb-3">GEN mode must NOT:</p>
            <div className="bg-red-500/10 border-l-4 border-red-500 p-3 rounded space-y-1 text-sm">
              <p>✗ Override Retrieval Mode outputs</p>
              <p>✗ Invent tool outputs</p>
              <p>✗ Replace STATE=UNKNOWN</p>
              <p>✗ Retry tools autonomously</p>
            </div>
            <p className="mt-3 text-blue-300 font-bold">GEN is synthesis layer only.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">VII. VALIDATION MIDDLEWARE CHECKLIST</h3>
            <div className="space-y-2">
              <div className="bg-white/5 rounded p-2 text-sm">
                <span className="text-blue-300 font-mono">CHECK_1:</span> Required 5 sections present?
              </div>
              <div className="bg-white/5 rounded p-2 text-sm">
                <span className="text-blue-300 font-mono">CHECK_2:</span> Constraint layer contains explicit boundary language?
              </div>
              <div className="bg-white/5 rounded p-2 text-sm">
                <span className="text-blue-300 font-mono">CHECK_3:</span> Prohibited capability inflation terms present?
              </div>
              <div className="bg-white/5 rounded p-2 text-sm">
                <span className="text-blue-300 font-mono">CHECK_4:</span> Absolute language detected?
              </div>
              <div className="bg-white/5 rounded p-2 text-sm">
                <span className="text-blue-300 font-mono">CHECK_5:</span> Dependency clause included when referencing memory/tools?
              </div>
              <div className="bg-white/5 rounded p-2 text-sm">
                <span className="text-blue-300 font-mono">CHECK_6:</span> Repetition of user text &gt;30%? (prevent filler echo)
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">VIII. REGENERATION POLICY</h3>
            <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-3 rounded">
              <p className="font-bold mb-2">Max regen attempts: 1</p>
              <p className="text-sm mb-2">If still invalid, return:</p>
              <pre className="bg-black/30 rounded p-2 text-xs font-mono">
STATE=GEN_VALIDATION_FAILURE
REASON=&lt;failed_check&gt;
              </pre>
              <p className="text-red-300 font-bold mt-2">No silent fallback.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">IX. OPERATOR CONTROLS</h3>
            <p className="mb-3">Expose to Console:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded p-2">
                <code className="text-xs text-green-300">GEN_SIGNAL_THRESHOLD</code>
                <p className="text-xs text-white/60">default: medium</p>
              </div>
              <div className="bg-white/5 rounded p-2">
                <code className="text-xs text-green-300">GEN_STRICT_MODE</code>
                <p className="text-xs text-white/60">true/false</p>
              </div>
              <div className="bg-white/5 rounded p-2">
                <code className="text-xs text-green-300">MAX_REGEN_ATTEMPTS</code>
                <p className="text-xs text-white/60">default: 1</p>
              </div>
              <div className="bg-white/5 rounded p-2">
                <code className="text-xs text-green-300">INFLATION_FILTER</code>
                <p className="text-xs text-white/60">on/off</p>
              </div>
              <div className="bg-white/5 rounded p-2">
                <code className="text-xs text-green-300">SECTION_ENFORCEMENT</code>
                <p className="text-xs text-white/60">strict/soft</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">X. EDUCATIONAL FEEDBACK LOOP</h3>
            <p className="mb-3">When regeneration occurs, log cause category:</p>
            <ul className="list-disc ml-6 space-y-1 text-sm">
              <li>Missing constraint</li>
              <li>Capability inflation</li>
              <li>Absolute language</li>
              <li>Structural omission</li>
            </ul>
            <div className="mt-3 bg-blue-500/10 border-l-4 border-blue-500 p-3 rounded text-sm">
              <p className="font-bold mb-1">Aggregate weekly:</p>
              <p>Generate GEN compliance score.</p>
              <p className="mt-2 text-white/70">Purpose: System learns pattern of violation. Operator sees drift trend.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-white/20 pb-2">XI. CONFIDENCE TAGGING (OPTIONAL)</h3>
            <p className="mb-3">Append:</p>
            <div className="flex gap-2">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Confidence: High</Badge>
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Confidence: Medium</Badge>
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Confidence: Low</Badge>
            </div>
            <p className="mt-3 text-sm">Required when discussing:</p>
            <ul className="list-disc ml-6 space-y-1 text-sm">
              <li>Architecture</li>
              <li>Societal impact</li>
              <li>Future capabilities</li>
            </ul>
          </section>

          <div className="mt-6 pt-6 border-t border-white/20 text-center">
            <Badge variant="outline" className="bg-white/5 text-white/90 border-white/30">
              END_TOKEN
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}