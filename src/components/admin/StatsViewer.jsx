import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Clock, RefreshCw } from 'lucide-react';
import SessionSelector from './SessionSelector';

export default function StatsViewer() {
    const [sessionId, setSessionId] = useState('');
    const [sessionTitle, setSessionTitle] = useState('');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = async (sid) => {
        const id = sid || sessionId;
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const response = await base44.functions.invoke('inspectPipeline', {
                action: 'stats',
                session_id: id
            });
            setStats(response.data.stats);
        } catch (err) {
            setError(err.message || 'Failed to fetch stats');
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSession = (id, title) => {
        setSessionId(id);
        setSessionTitle(title);
        fetchStats(id);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Pipeline Statistics
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select a session to view its request count, latency, and diagnostic receipt history.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SessionSelector selectedSessionId={sessionId} onSelectSession={handleSelectSession} />
                    {sessionId && (
                        <Button onClick={() => fetchStats()} disabled={loading} variant="outline" size="sm">
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    )}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
                    )}
                </CardContent>
            </Card>

            {stats && (
                <>
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle className="truncate">{sessionTitle || stats.session_id}</CardTitle>
                                <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{stats.session_id}</p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 border rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-1">Total Requests</div>
                                    <div className="text-3xl font-bold">{stats.total_requests}</div>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-1">Avg Latency</div>
                                    <div className="text-3xl font-bold">{stats.avg_latency_ms}</div>
                                    <div className="text-xs text-muted-foreground">ms</div>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-1">Boot Status</div>
                                    <Badge className={stats.boot_valid ? 'bg-green-600' : 'bg-red-600'}>
                                        {stats.boot_valid ? 'Valid' : 'Invalid'}
                                    </Badge>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-1">Session ID</div>
                                    <div className="text-xs font-mono truncate">{stats.session_id}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {stats.recent_receipts && stats.recent_receipts.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Recent Requests
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {stats.recent_receipts.map((receipt) => (
                                        <div key={receipt.request_id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <code className="text-xs font-mono text-muted-foreground">{receipt.request_id}</code>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{receipt.total_ms}ms</Badge>
                                                    <Badge>{receipt.selector_decision}</Badge>
                                                </div>
                                            </div>
                                            {receipt.recall_tiers && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs text-muted-foreground">Recall:</span>
                                                    {Object.entries(receipt.recall_tiers).map(([tier, count]) => (
                                                        <Badge key={tier} variant="outline" className="text-xs">{tier}: {count}</Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {stats.total_requests === 0 && (
                        <Card>
                            <CardContent className="py-12">
                                <div className="text-center text-muted-foreground">No diagnostic receipts found for this session</div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}