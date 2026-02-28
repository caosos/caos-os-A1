import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

const CHECK_DESCRIPTIONS = {
    database: {
        label: 'Database Connection',
        description: 'Verifies that the Base44 entity database is reachable and responding. If this fails, no messages can be saved or retrieved — all chat history and memory operations will fail.',
        passing: 'Database is reachable and responding normally.',
        failing: 'Database connection is down. Message persistence and memory operations are unavailable.'
    },
    openai_api: {
        label: 'OpenAI API',
        description: 'Confirms the OPENAI_API_KEY secret is configured and reachable. This is required for Aria to generate responses, TTS audio, and Whisper transcription.',
        passing: 'API key is configured. OpenAI inference is available.',
        failing: 'API key is missing or unreachable. Aria cannot generate responses.'
    }
};

function HealthCheck({ label, status, checkKey }) {
    const [expanded, setExpanded] = useState(false);
    const isPass = status === 'pass' || status === 'configured';
    const info = CHECK_DESCRIPTIONS[checkKey] || {};

    return (
        <div className="border rounded-lg overflow-hidden">
            <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {isPass
                        ? <CheckCircle className="h-4 w-4 text-green-600" />
                        : <XCircle className="h-4 w-4 text-red-600" />}
                    <span className="font-medium text-sm">{info.label || label}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={isPass ? 'default' : 'destructive'}>{status}</Badge>
                    {expanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
            </div>
            {expanded && info.description && (
                <div className="border-t bg-muted/30 px-4 py-3 space-y-2 text-sm">
                    <p className="text-muted-foreground">{info.description}</p>
                    <p className={isPass ? 'text-green-700' : 'text-red-700'}>
                        {isPass ? `✓ ${info.passing}` : `✗ ${info.failing}`}
                    </p>
                </div>
            )}
        </div>
    );
}

export default function SystemHealth() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('systemHealth', {});
            setHealth(response.data);
        } catch (error) {
            setHealth({ status: 'error', error: error.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 60000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'degraded': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
            default: return <XCircle className="h-5 w-5 text-red-600" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'bg-green-600';
            case 'degraded': return 'bg-yellow-600';
            default: return 'bg-red-600';
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
                    <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
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
                                <h3 className="font-semibold mb-3 text-sm">Health Checks — click to expand</h3>
                                <HealthCheck label="Database Connection" status={health.checks.database} checkKey="database" />
                                <HealthCheck label="OpenAI API" status={health.checks.openai_api} checkKey="openai_api" />
                            </div>
                        )}

                        {health?.latency_ms && (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <span className="font-medium text-sm">Health Check Latency</span>
                                    <p className="text-xs text-muted-foreground mt-0.5">Round-trip time for this health check to complete</p>
                                </div>
                                <Badge variant="outline">{health.latency_ms}ms</Badge>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}