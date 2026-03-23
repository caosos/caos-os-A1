import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function EvidencePanel({ message }) {
    const [expanded, setExpanded] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const DEV = localStorage.getItem('caos_developer_mode') === 'true';

    const receipt = message.execution_receipt;
    const toolReceipts = message.tool_receipts;
    const hasEvidence = receipt || toolReceipts?.length > 0;

    if (!hasEvidence) return null;

    const provider = message.provider || receipt?.provider || 'openai';
    const fallbackTier = message.fallback_tier ?? receipt?.fallback_tier;
    const degraded = message.degraded;
    const model = receipt?.model_used || 'unknown';

    return (
        <div className="mt-2 text-xs select-none">
            <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors"
            >
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>Evidence</span>
                {degraded && <span className="text-yellow-400/70 ml-1">⚠ degraded T{fallbackTier}</span>}
                {provider !== 'openai' && <span className="text-purple-400/60 ml-1">[{provider}]</span>}
            </button>

            {expanded && (
                <div className="mt-1.5 pl-3 border-l border-white/10 space-y-2">
                    {/* Core receipt fields */}
                    {receipt && (
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-white/40">
                            <span className="text-white/25">provider</span><span>{provider}</span>
                            <span className="text-white/25">model</span><span>{model}</span>
                            {receipt.heuristics_intent && <><span className="text-white/25">intent</span><span>{receipt.heuristics_intent}</span></>}
                            {receipt.latency_ms != null && <><span className="text-white/25">latency</span><span>{receipt.latency_ms}ms</span></>}
                            {fallbackTier != null && <><span className="text-white/25">fallback</span><span className="text-yellow-400">Tier {fallbackTier}</span></>}
                            {receipt.wcw_used != null && receipt.wcw_budget != null && (
                                <><span className="text-white/25">wcw</span>
                                <span>{Math.round(receipt.wcw_used / 1000)}K / {Math.round(receipt.wcw_budget / 1000)}K</span></>
                            )}
                        </div>
                    )}

                    {/* Tool receipts */}
                    {toolReceipts?.length > 0 && (
                        <div>
                            <div className="text-white/25 mb-1">tool steps</div>
                            {toolReceipts.map((t, i) => (
                                <div key={i} className="flex items-center gap-2 text-white/35 py-0.5">
                                    <span className={t.ok ? 'text-green-500/50' : 'text-red-500/60'}>●</span>
                                    <span className="w-36 truncate">{t.tool}</span>
                                    {t.elapsed_ms != null && <span className="text-white/20">{t.elapsed_ms}ms</span>}
                                    {t.skipped && <span className="text-white/20 italic">skip</span>}
                                    {t.injected === true && <span className="text-blue-400/50">injected</span>}
                                    {t.degraded && <span className="text-yellow-400/60">T{t.fallback_tier}</span>}
                                    {t.history_count != null && <span className="text-white/20">{t.history_count} msgs</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Dev raw JSON */}
                    {DEV && (
                        <div>
                            <button
                                onClick={() => setShowRaw(r => !r)}
                                className="text-white/20 hover:text-white/50 text-[10px] transition-colors"
                            >
                                {showRaw ? '▲ hide raw' : '▼ raw JSON'}
                            </button>
                            {showRaw && (
                                <pre className="mt-1 text-[9px] text-white/25 bg-black/30 rounded p-2 overflow-x-auto max-h-52 leading-relaxed">
                                    {JSON.stringify({ receipt, tool_receipts: toolReceipts, provider, fallback_tier: fallbackTier }, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}