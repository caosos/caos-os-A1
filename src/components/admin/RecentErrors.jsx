import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Clock, ChevronDown, ChevronRight, X } from 'lucide-react';

const FILTERS = [
    { label: 'All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
];

function tsFilter(filter) {
    const now = Date.now();
    if (filter === 'today') return now - 24 * 60 * 60 * 1000;
    if (filter === 'week') return now - 7 * 24 * 60 * 60 * 1000;
    return 0;
}

const stageColor = (stage) => ({
    PROFILE_LOAD: 'bg-blue-700', MEMORY_WRITE: 'bg-purple-700',
    HISTORY_LOAD: 'bg-indigo-700', HEURISTICS: 'bg-cyan-700',
    OPENAI_CALL: 'bg-orange-700', MESSAGE_SAVE: 'bg-yellow-700',
    RESPONSE_BUILD: 'bg-green-800',
}[stage] || 'bg-gray-600');

const errorCodeColor = (code) => {
    if (!code) return 'bg-gray-600';
    if (code.includes('RATE_LIMIT')) return 'bg-yellow-600';
    if (code.includes('INTERNAL') || code.includes('SERVER')) return 'bg-red-700';
    if (code.includes('RECEIPT') || code.includes('SESSION')) return 'bg-orange-700';
    return 'bg-gray-600';
};

export default function RecentErrors({ initialFilter = null, onFilterUsed }) {
    const [allErrors, setAllErrors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [filter, setFilter] = useState('all');

    // Accept drilldown filter from parent (Users tab)
    useEffect(() => {
        if (initialFilter) {
            setFilter(initialFilter);
            if (onFilterUsed) onFilterUsed();
        }
    }, [initialFilter]);

    const fetchErrors = async () => {
        setLoading(true);
        try {
            const errorLogs = await base44.entities.ErrorLog.list('-created_date', 500);
            setAllErrors(errorLogs || []);
        } catch (error) {
            console.error('Failed to fetch errors:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchErrors();
    }, []);

    const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const cutoff = tsFilter(filter);
    const errors = allErrors.filter(e => new Date(e.created_date).getTime() >= cutoff);

    if (loading && allErrors.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading error logs...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Error Console
                    <Badge className="bg-red-700 ml-1">{errors.length}</Badge>
                    {filter !== 'all' && (
                        <span className="text-xs font-normal text-muted-foreground">
                            ({filter === 'today' ? 'last 24h' : 'last 7 days'} of {allErrors.length} total)
                        </span>
                    )}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {/* Time filters */}
                    <div className="flex rounded-md border overflow-hidden">
                        {FILTERS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={`px-3 py-1.5 text-sm transition-colors ${
                                    filter === f.value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted'
                                }`}
                            >
                                {f.label}
                                {f.value !== 'all' && (
                                    <span className="ml-1 text-xs opacity-70">
                                        ({allErrors.filter(e => new Date(e.created_date).getTime() >= tsFilter(f.value)).length})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchErrors} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {errors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No errors in this time window ✅
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                        {errors.map((err) => {
                            const isODEL = !!err.error_id;
                            const isOpen = !!expanded[err.id];
                            return (
                                <div key={err.id} className="border rounded-lg overflow-hidden">
                                    <button
                                        className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-start gap-2"
                                        onClick={() => toggleExpand(err.id)}
                                    >
                                        {isOpen
                                            ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                            : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                {isODEL && <Badge className="bg-violet-700 text-xs font-mono">ODEL v1</Badge>}
                                                {err.stage && <Badge className={`${stageColor(err.stage)} text-xs font-mono`}>{err.stage}</Badge>}
                                                {err.error_code && <Badge className={`${errorCodeColor(err.error_code)} text-xs font-mono`}>{err.error_code}</Badge>}
                                                {err.error_type && !err.error_code && <Badge className="bg-gray-600 text-xs">{err.error_type}</Badge>}
                                                {err.model_used && <Badge variant="outline" className="text-xs font-mono">{err.model_used}</Badge>}
                                                {err.latency_ms && <span className="text-xs text-muted-foreground font-mono">{err.latency_ms}ms</span>}
                                                <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(err.created_date).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-sm text-destructive truncate">{err.error_message}</div>
                                            {err.user_email && (
                                                <div className="text-xs text-muted-foreground mt-0.5">{err.user_email}</div>
                                            )}
                                            {err.error_id && (
                                                <div className="text-xs text-muted-foreground font-mono mt-0.5">error_id: {err.error_id}</div>
                                            )}
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="border-t bg-muted/30 p-3 space-y-3 text-xs font-mono">
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    ['error_id', err.error_id],
                                                    ['stage', err.stage],
                                                    ['error_code', err.error_code],
                                                    ['model_used', err.model_used],
                                                    ['latency_ms', err.latency_ms],
                                                    ['user_email', err.user_email],
                                                    ['conversation_id', err.conversation_id !== 'none' ? err.conversation_id : null],
                                                    ['system_version', err.system_version],
                                                    ['retry_attempted', err.retry_attempted != null ? String(err.retry_attempted) : null],
                                                    ['retry_count', err.retry_count || null],
                                                    ['resolved', err.resolved != null ? String(err.resolved) : null],
                                                ].filter(([, v]) => v != null).map(([k, v]) => (
                                                    <div key={k}>
                                                        <span className="text-muted-foreground">{k}: </span>
                                                        <span className="text-foreground break-all">{v}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {err.error_message && (
                                                <div>
                                                    <div className="text-muted-foreground mb-1">error_message:</div>
                                                    <pre className="bg-background rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">{err.error_message}</pre>
                                                </div>
                                            )}

                                            {err.stack_trace && (
                                                <div>
                                                    <div className="text-muted-foreground mb-1">stack_trace:</div>
                                                    <pre className="bg-background rounded p-2 text-xs overflow-x-auto max-h-40 whitespace-pre-wrap">{err.stack_trace}</pre>
                                                </div>
                                            )}

                                            {err.lost_message_content && (
                                                <div>
                                                    <div className="text-muted-foreground mb-1">lost_message_content:</div>
                                                    <pre className="bg-background rounded p-2 text-xs overflow-x-auto max-h-24 whitespace-pre-wrap">{err.lost_message_content}</pre>
                                                </div>
                                            )}

                                            {err.request_payload && (
                                                <div>
                                                    <div className="text-muted-foreground mb-1">request_payload:</div>
                                                    <pre className="bg-background rounded p-2 text-xs overflow-x-auto max-h-40 whitespace-pre-wrap">
                                                        {typeof err.request_payload === 'object'
                                                            ? JSON.stringify(err.request_payload, null, 2)
                                                            : err.request_payload}
                                                    </pre>
                                                </div>
                                            )}

                                            {err.resolution_notes && (
                                                <div>
                                                    <div className="text-muted-foreground mb-1">resolution_notes:</div>
                                                    <pre className="bg-background rounded p-2 text-xs whitespace-pre-wrap">{err.resolution_notes}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}