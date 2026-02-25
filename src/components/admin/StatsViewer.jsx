import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, BarChart3, Clock } from 'lucide-react';

export default function StatsViewer() {
    const [sessionId, setSessionId] = useState('');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        if (!sessionId.trim()) {
            setError('Session ID is required');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const response = await base44.functions.invoke('inspectPipeline', { 
                action: 'stats',
                session_id: sessionId 
            });
            setStats(response.data.stats);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            setError(error.message || 'Failed to fetch stats');
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Pipeline Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Label htmlFor="sessionIdStats">Session ID</Label>
                                <Input
                                    id="sessionIdStats"
                                    placeholder="Enter session ID to view stats..."
                                    value={sessionId}
                                    onChange={(e) => setSessionId(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchStats()}
                                />
                            </div>
                            <div className="flex items-end">
                                <Button onClick={fetchStats} disabled={loading}>
                                    <Search className="h-4 w-4 mr-2" />
                                    View Stats
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                                <p className="text-sm">{error}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {stats && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Session Overview</CardTitle>
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
                                    {stats.recent_receipts.map((receipt, idx) => (
                                        <div
                                            key={receipt.request_id}
                                            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <code className="text-xs font-mono text-muted-foreground">
                                                    {receipt.request_id}
                                                </code>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{receipt.total_ms}ms</Badge>
                                                    <Badge>{receipt.selector_decision}</Badge>
                                                </div>
                                            </div>

                                            {receipt.recall_tiers && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs text-muted-foreground">Recall:</span>
                                                    {Object.entries(receipt.recall_tiers).map(([tier, count]) => (
                                                        <Badge key={tier} variant="outline" className="text-xs">
                                                            {tier}: {count}
                                                        </Badge>
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
                                <div className="text-center text-muted-foreground">
                                    No diagnostic receipts found for this session
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}