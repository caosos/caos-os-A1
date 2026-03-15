import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, ChevronRight, Copy, Activity } from 'lucide-react';

const ZONE_COLORS = {
    green:  'bg-green-100 text-green-800 border-green-200',
    blue:   'bg-blue-100 text-blue-800 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red:    'bg-red-100 text-red-800 border-red-200',
};

function PressureBadge({ score, zone }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-semibold ${ZONE_COLORS[zone] || ZONE_COLORS.green}`}>
            {score ?? '—'}% {zone ? `(${zone})` : ''}
        </span>
    );
}

function JsonViewer({ label, data }) {
    if (!data) return <p className="text-xs text-muted-foreground italic">Not present (pre-patch event)</p>;
    return (
        <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <pre className="bg-muted rounded p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap break-all">
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}

function EventRow({ event }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const d = event.data || {};
    const pressureScore = d.wcw_turn?.context_pressure_score ?? d.wcw_state?.context_pressure_score ?? null;
    const zone = d.wcw_turn?.zone ?? d.wcw_state?.zone ?? null;

    const copyRequestId = () => {
        navigator.clipboard.writeText(event.request_id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <>
            <tr
                className="border-b hover:bg-muted/40 cursor-pointer transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {event.created_date ? new Date(event.created_date).toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                        <span className="font-mono text-xs truncate max-w-[160px]">{event.request_id}</span>
                        <button
                            onClick={e => { e.stopPropagation(); copyRequestId(); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy request_id"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                        {copied && <span className="text-xs text-green-600">✓</span>}
                    </div>
                </td>
                <td className="px-3 py-2 text-xs font-mono text-right">{d.duration_ms ?? '—'}</td>
                <td className="px-3 py-2 text-xs font-mono text-right">{d.wcw_used?.toLocaleString() ?? '—'}</td>
                <td className="px-3 py-2 text-xs font-mono text-right">{d.wcw_remaining?.toLocaleString() ?? '—'}</td>
                <td className="px-3 py-2">
                    {pressureScore !== null
                        ? <PressureBadge score={pressureScore} zone={zone} />
                        : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2">
                    {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </td>
            </tr>
            {expanded && (
                <tr className="border-b bg-muted/20">
                    <td colSpan={7} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <JsonViewer label="wcw_turn" data={d.wcw_turn} />
                            <JsonViewer label="wcw_state" data={d.wcw_state} />
                        </div>
                        {!d.wcw_turn && !d.wcw_state && (d.wcw_used != null) && (
                            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                Pre-patch event — partial data only: wcw_used={d.wcw_used} wcw_remaining={d.wcw_remaining}
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

export default function WCWInspector() {
    const [sessionId, setSessionId] = useState('');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [queried, setQueried] = useState(false);

    const fetchEvents = async () => {
        if (!sessionId.trim()) return;
        setLoading(true);
        setError(null);
        setEvents([]);
        setQueried(false);
        try {
            const res = await base44.functions.invoke('getRequestTrace', { session_id: sessionId.trim() });
            const allEvents = res?.data?.events || [];
            const complete = allEvents.filter(e => e.stage === 'PIPELINE_COMPLETE');
            // Sort newest first
            complete.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
            setEvents(complete);
            setQueried(true);
        } catch (err) {
            setError(err.message || 'Failed to fetch events');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        WCW Inspector
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Query PIPELINE_COMPLETE events for a session to inspect WCW telemetry timeline.
                        New events (post-patch) include full <code className="font-mono text-xs">wcw_turn</code> + <code className="font-mono text-xs">wcw_state</code> with pressure score.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter session_id..."
                            value={sessionId}
                            onChange={e => setSessionId(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchEvents()}
                            className="font-mono text-sm"
                        />
                        <Button onClick={fetchEvents} disabled={loading || !sessionId.trim()}>
                            <Search className="h-4 w-4 mr-2" />
                            {loading ? 'Loading…' : 'Fetch'}
                        </Button>
                    </div>
                    {error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">{error}</div>
                    )}
                </CardContent>
            </Card>

            {queried && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">PIPELINE_COMPLETE Events</CardTitle>
                            <Badge variant="outline">{events.length} found</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {events.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                                No PIPELINE_COMPLETE events found for this session.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Time</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Request ID</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Duration (ms)</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">WCW Used</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">WCW Remaining</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Pressure</th>
                                            <th className="px-3 py-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.map(e => <EventRow key={e.id || e.request_id} event={e} />)}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}