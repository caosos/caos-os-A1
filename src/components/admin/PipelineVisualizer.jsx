import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';

export default function PipelineVisualizer() {
    const [requestId, setRequestId] = useState('');
    const [pipelineData, setPipelineData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPipelineData = async () => {
        if (!requestId.trim()) {
            setError('Please enter a request ID');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Fetch diagnostic receipt for the request
            const receipts = await base44.asServiceRole.entities.DiagnosticReceipt.filter(
                { request_id: requestId.trim() },
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
            console.error('Failed to fetch pipeline data:', err);
            setError('Failed to fetch pipeline data');
            setPipelineData(null);
        } finally {
            setLoading(false);
        }
    };

    const getStageStatus = (stage, data) => {
        if (!data) return 'pending';
        
        switch (stage) {
            case 'boot':
                return data.selector_decision?.boot_valid ? 'success' : 'failed';
            case 'context':
                return data.selector_decision?.context_loaded ? 'success' : 'failed';
            case 'selector':
                return data.selector_decision?.selector_invoked ? 'success' : 'failed';
            case 'recall':
                return data.recall_executed ? 'success' : 'skipped';
            case 'inference':
                return data.selector_decision?.inference_allowed ? 'success' : 'skipped';
            case 'tools':
                return data.tool_consideration?.length > 0 ? 'success' : 'skipped';
            default:
                return 'pending';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-500" />;
            case 'skipped':
                return <Clock className="h-5 w-5 text-yellow-500" />;
            default:
                return <Clock className="h-5 w-5 text-gray-400" />;
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Pipeline Visualizer
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter Request ID"
                        value={requestId}
                        onChange={(e) => setRequestId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && fetchPipelineData()}
                    />
                    <Button onClick={fetchPipelineData} disabled={loading}>
                        <Search className="h-4 w-4 mr-2" />
                        Trace
                    </Button>
                </div>

                {error && (
                    <div className="text-sm text-red-500 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading pipeline data...</p>
                    </div>
                )}

                {pipelineData && (
                    <div className="space-y-6">
                        {/* Overview */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-muted rounded-lg p-3">
                                <div className="text-xs text-muted-foreground mb-1">Session ID</div>
                                <div className="text-sm font-mono truncate">{pipelineData.session_id}</div>
                            </div>
                            <div className="bg-muted rounded-lg p-3">
                                <div className="text-xs text-muted-foreground mb-1">Total Latency</div>
                                <div className="text-sm font-semibold">
                                    {pipelineData.latency_breakdown?.total_ms || 0}ms
                                </div>
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

                        {/* Pipeline Stages */}
                        <div className="space-y-3">
                            <div className="text-sm font-semibold">Pipeline Stages</div>
                            {stages.map((stage, idx) => {
                                const status = getStageStatus(stage.id, pipelineData);
                                const latency = pipelineData.latency_breakdown?.[stage.key] || 0;

                                return (
                                    <div
                                        key={stage.id}
                                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
                                    >
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                                            {getStatusIcon(status)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{stage.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {latency > 0 ? `${latency}ms` : status}
                                            </div>
                                        </div>
                                        <Badge variant={status === 'success' ? 'default' : 'outline'}>
                                            {status}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Recall Details */}
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

                        {/* Tool Execution */}
                        {pipelineData.tool_consideration && pipelineData.tool_consideration.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-sm font-semibold">Tools Executed</div>
                                <div className="space-y-2">
                                    {pipelineData.tool_consideration.map((tool, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                                            <div className="text-sm">{tool.tool_name}</div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={tool.authorized ? 'default' : 'outline'}>
                                                    {tool.authorized ? 'Authorized' : 'Denied'}
                                                </Badge>
                                                {tool.executed && (
                                                    <Badge variant={tool.result_status === 'success' ? 'default' : 'destructive'}>
                                                        {tool.result_status}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}