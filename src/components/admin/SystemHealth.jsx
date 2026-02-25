import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function SystemHealth() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('systemHealth', {});
            setHealth(response.data);
        } catch (error) {
            console.error('Failed to fetch health:', error);
            setHealth({ status: 'error', error: error.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'bg-green-600';
            case 'degraded': return 'bg-yellow-600';
            case 'unhealthy': return 'bg-red-600';
            default: return 'bg-gray-600';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return <CheckCircle className="h-5 w-5" />;
            case 'degraded': return <AlertCircle className="h-5 w-5" />;
            default: return <XCircle className="h-5 w-5" />;
        }
    };

    if (loading && !health) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading system health...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        {getStatusIcon(health?.status)}
                        <div>
                            <CardTitle>System Status</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Last updated: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchHealth}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <span className="font-medium">Overall Status</span>
                            <Badge className={getStatusColor(health?.status)}>
                                {health?.status?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                        </div>

                        {health?.checks && (
                            <div className="space-y-2">
                                <h3 className="font-semibold mb-3">Health Checks</h3>
                                
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-2">
                                        {health.checks.database === 'pass' ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                        )}
                                        <span>Database Connection</span>
                                    </div>
                                    <Badge variant={health.checks.database === 'pass' ? 'default' : 'destructive'}>
                                        {health.checks.database}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-2">
                                        {health.checks.openai_api === 'configured' ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                        )}
                                        <span>OpenAI API</span>
                                    </div>
                                    <Badge variant={health.checks.openai_api === 'configured' ? 'default' : 'destructive'}>
                                        {health.checks.openai_api}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        {health?.latency_ms && (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <span>Health Check Latency</span>
                                <Badge variant="outline">{health.latency_ms}ms</Badge>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}