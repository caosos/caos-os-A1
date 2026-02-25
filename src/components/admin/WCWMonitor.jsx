import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function WCWMonitor() {
    const [sessionId, setSessionId] = useState('');
    const [wcwData, setWcwData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchWCW = async () => {
        if (!sessionId.trim()) {
            setError('Session ID is required');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const response = await base44.functions.invoke('inspectPipeline', { 
                action: 'wcw',
                session_id: sessionId 
            });
            setWcwData(response.data);
        } catch (error) {
            console.error('Failed to fetch WCW:', error);
            setError(error.message || 'Failed to fetch WCW data');
            setWcwData(null);
        } finally {
            setLoading(false);
        }
    };

    const getUtilizationColor = (pct) => {
        if (pct < 60) return 'text-green-600';
        if (pct < 80) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getUtilizationStatus = (pct) => {
        if (pct < 60) return 'NOMINAL';
        if (pct < 80) return 'WARNING';
        return 'CRITICAL';
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Working Context Window Monitor
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Label htmlFor="sessionId">Session ID</Label>
                                <Input
                                    id="sessionId"
                                    placeholder="Enter session ID to inspect..."
                                    value={sessionId}
                                    onChange={(e) => setSessionId(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchWCW()}
                                />
                            </div>
                            <div className="flex items-end">
                                <Button onClick={fetchWCW} disabled={loading}>
                                    <Search className="h-4 w-4 mr-2" />
                                    Inspect
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

            {wcwData && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Session: {wcwData.session_id}</CardTitle>
                            <Badge className={
                                wcwData.utilization_pct < 60 ? 'bg-green-600' :
                                wcwData.utilization_pct < 80 ? 'bg-yellow-600' : 'bg-red-600'
                            }>
                                {getUtilizationStatus(wcwData.utilization_pct)}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Token Utilization</span>
                                <span className={`text-2xl font-bold ${getUtilizationColor(wcwData.utilization_pct)}`}>
                                    {wcwData.utilization_pct}%
                                </span>
                            </div>
                            <Progress value={wcwData.utilization_pct} className="h-3" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 border rounded-lg">
                                <div className="text-sm text-muted-foreground mb-1">Budget</div>
                                <div className="text-2xl font-bold">{wcwData.wcw_budget.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">tokens</div>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="text-sm text-muted-foreground mb-1">Used</div>
                                <div className="text-2xl font-bold">{wcwData.wcw_used.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">tokens</div>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="text-sm text-muted-foreground mb-1">Remaining</div>
                                <div className="text-2xl font-bold">{wcwData.wcw_remaining.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">tokens</div>
                            </div>
                        </div>

                        {wcwData.utilization_pct >= 80 && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-red-900">High Utilization Warning</p>
                                        <p className="text-sm text-red-800 mt-1">
                                            This session is approaching the WCW ceiling. Automatic regulation will trigger soon.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {wcwData.utilization_pct < 60 && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-green-900">Healthy Status</p>
                                        <p className="text-sm text-green-800 mt-1">
                                            Session has adequate headroom for continued operation.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {wcwData.last_activity && (
                            <div className="text-xs text-muted-foreground">
                                Last activity: {new Date(wcwData.last_activity).toLocaleString()}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}