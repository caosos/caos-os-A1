import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import SessionSelector from './SessionSelector';

export default function PipelineVisualizer() {
    const [sessionId, setSessionId] = useState('');
    const [sessionTitle, setSessionTitle] = useState('');
    const [requestId, setRequestId] = useState('');
    const [pipelineData, setPipelineData] = useState(null);
    const [recentReceipts, setRecentReceipts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSelectSession = async (id, title) => {
        setSessionId(id);
        setSessionTitle(title);
        setPipelineData(null);
        setRequestId('');
        setError(null);
        // Load recent receipts for this session
        try {
            const receipts = await base44.asServiceRole.entities.DiagnosticReceipt.filter(
                { session_id: id },
                '-created_at',
                10
            );
            setRecentReceipts(receipts || []);
        } catch (e) {
            setRecentReceipts([]);
        }
    };

    const fetchPipelineData = async (rid) => {
        const id = rid || requestId;
        if (!id.trim()) {
            setError('Please enter a request ID');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const receipts = await base44.asServiceRole.entities.DiagnosticReceipt.filter(
                { request_id: id.trim() },
                '-created_at',
                1
            );
            if (!receipts || receipts.length === 0) {
                setError('No pipeline data found for this request ID');
                setPipelineData(null);
            } else {
                setPipelineData(receipts[0]);
            }
        } catch (err) {
            setError('Failed to fetch pipeline data');
            setPipelineData(null);
        } finally {
            setLoading(false);
        }
    };

    const getStageStatus = (stage, data) => {
        if (!data) return 'pending';
        switch (stage) {
            case 'boot': return data.selector_decision?.boot_valid ? 'success' : 'failed';
            case 'context': return data.selector_decision?.context_loaded ? 'success' : 'failed';
            case 'selector': return data.selector_decision?.selector_invoked ? 'success' : 'failed';
            case 'recall': return data.recall_executed ? 'success' : 'skipped';
            case 'inference': return data.selector_decision?.inference_allowed ? 'success' : 'skipped';
            case 'tools': return data.tool_consideration?.length > 0 ? 'success' : 'skipped';
            default: return 'pending';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
            case 'skipped': return <Clock className="h-5 w-5 text-yellow-500" />;
            default: return <Clock className="h-5 w-5 text-gray-400" />;
        }
    };

    const stages = [
        { id: 'boot', name: 'Boot Validation', key: 'boot_validation_ms' },
        { id: 'context', name: 'Context Load', key: 'context_load_ms' },
        { id: 'selector', name: 'Selector', key: 'selector_ms' },
        { id: 'recall', name: 'Recall', key: 'recall_ms' },
        { id: 'inference', name: 'Inference', key: 'inference_ms' },
        { id: 'tools', name: 'Tools', key: 'tool_execution_ms' }
    ];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-purple-500" />
                        Pipeline Visualizer
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select a session to see its recent requests, then click a request to trace its full pipeline execution.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SessionSelector selectedSessionId={sessionId} onSelectSession={handleSelectSession} />

                    {recentReceipts.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Recent Requests — click to trace</p>
                            {recentReceipts.map((r) => (
                                <button
                                    key={r.request_id}
                                    onClick={() => {
                                        setRequestId(r.request_id);
                                        fetchPipelineData(r.request_id);
                                    }}
                                    className={`w-full text-left flex items-center justify-between px-3 py-2 border rounded-lg hover:bg-muted/50 transition-colors text-xs ${pipelineData?.request_id === r.request_id ? 'bg-muted border-primary' : ''}`}
                                >
                                    <span className="font-mono truncate">{r.request_id}</span>
                                    <span className="text-muted-foreground ml-2 flex-shrink-0">{r.latency_breakdown?.total_ms || 0}ms</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Input
                            placeholder="Or paste a Request ID directly..."
                            value={requestId}
                            onChange={(e) => setRequestId(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && fetchPipelineData()}
                            className="text-xs font-mono"
                        />
                        <Button onClick={() => fetchPipelineData()} disabled={loading}>
                            <Search className="h-4 w-4 mr-2" />
                            Trace
                        </Button>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-500/10 rounded-lg p-3 border border-red-500/20">{error}</div>
                    )}
                </CardContent>
            </Card>

            {pipelineData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-mono truncate">{pipelineData.request_id}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-muted rounded-lg p-3">
                                <div className="text-xs text-muted-foreground mb-1">Session</div>
                                <div className="text-sm font-mono truncate">{pipelineData.session_id}</div>
                            </div>
                            <div className="bg-muted rounded-lg p-3">
                                <div className="text-xs text-muted-foreground mb-1">Total Latency</div>
                                <div className="text-sm font-semibold">{pipelineData.latency_breakdown?.total_ms || 0}ms</div>
                            </div>
                            <div className="bg-muted rounded-lg p-3">
                                <div className="text-xs text-muted-foreground mb-1">Mode</div>
                                <Badge>{pipelineData.selector_decision?.response_mode || 'N/A'}</Badge>
                            </div>
                            <div className="bg-muted rounded-lg p-3">
                                <div className="text-xs text-muted-foreground mb-1">Diagnostic</div>
                                <Badge variant={pipelineData.diagnostic_mode ? 'default' : 'outline'}>
                                    {pipelineData.diagnostic_mode ? 'ON' : 'OFF'}
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-sm font-semibold">Pipeline Stages</div>
                            {stages.map((stage) => {
                                const status = getStageStatus(stage.id, pipelineData);
                                const latency = pipelineData.latency_breakdown?.[stage.key] || 0;
                                return (
                                    <div key={stage.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                                            {getStatusIcon(status)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{stage.name}</div>
                                            <div className="text-xs text-muted-foreground">{latency > 0 ? `${latency}ms` : status}</div>
                                        </div>
                                        <Badge variant={status === 'success' ? 'default' : 'outline'}>{status}</Badge>
                                    </div>
                                );
                            })}
                        </div>

                        {pipelineData.recall_tier_counts && (
                            <div className="space-y-2">
                                <div className="text-sm font-semibold">Recall Tiers</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {Object.entries(pipelineData.recall_tier_counts).map(([tier, count]) => (
                                        <div key={tier} className="bg-muted rounded p-2">
                                            <div className="text-xs text-muted-foreground capitalize">{tier}</div>
                                            <div className="text-lg font-bold">{count}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}