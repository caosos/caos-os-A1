import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Globe, MessageSquare, RefreshCw, TrendingUp, Zap } from 'lucide-react';

export default function UserInsights() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            // Pull all users, conversations, and pipeline events in parallel
            const [users, conversations, logins, errors] = await Promise.all([
                base44.entities.User.list('-created_date', 200),
                base44.entities.Conversation.list('-last_message_time', 500),
                base44.entities.UserLogin ? base44.entities.UserLogin.list('-created_date', 500) : Promise.resolve([]),
                base44.entities.ErrorLog.list('-created_date', 200),
            ]);

            // Total accounts (exclude the admin — role=admin)
            const nonAdminUsers = (users || []).filter(u => u.role !== 'admin');
            const totalAccounts = nonAdminUsers.length;

            // Active in last 7 days: users who have a conversation updated recently
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const recentConvos = (conversations || []).filter(c => {
                const t = c.last_message_time ? new Date(c.last_message_time).getTime() : 0;
                return t > sevenDaysAgo;
            });
            const activeUserEmails = [...new Set(recentConvos.map(c => c.created_by).filter(Boolean))];
            const activeUsersCount = activeUserEmails.filter(e => {
                const u = (users || []).find(u => u.email === e);
                return !u || u.role !== 'admin';
            }).length;

            // Active today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const activeToday = (conversations || []).filter(c => {
                const t = c.last_message_time ? new Date(c.last_message_time).getTime() : 0;
                const email = c.created_by;
                const u = (users || []).find(u => u.email === email);
                return t > todayStart.getTime() && (!u || u.role !== 'admin');
            });
            const activeTodayCount = [...new Set(activeToday.map(c => c.created_by).filter(Boolean))].length;

            // Total conversations (non-admin)
            const nonAdminConvos = (conversations || []).filter(c => {
                const u = (users || []).find(u => u.email === c.created_by);
                return !u || u.role !== 'admin';
            });

            // New accounts this week
            const newThisWeek = nonAdminUsers.filter(u => {
                const t = u.created_date ? new Date(u.created_date).getTime() : 0;
                return t > sevenDaysAgo;
            }).length;

            // Error rate
            const totalErrors = (errors || []).length;
            const recentErrors = (errors || []).filter(e => {
                const t = e.created_date ? new Date(e.created_date).getTime() : 0;
                return t > sevenDaysAgo;
            }).length;

            // Provider usage from inference_provider field on messages
            // We'll estimate from conversations' message counts and error logs' model_used
            const providerCounts = {};
            (errors || []).forEach(e => {
                if (e.model_used) {
                    const p = e.model_used.includes('gemini') ? 'Gemini'
                        : e.model_used.includes('grok') ? 'Grok'
                        : 'OpenAI';
                    providerCounts[p] = (providerCounts[p] || 0) + 1;
                }
            });

            // Registrations by day (last 14 days)
            const registrationsByDay = {};
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                registrationsByDay[key] = 0;
            }
            nonAdminUsers.forEach(u => {
                if (u.created_date) {
                    const d = new Date(u.created_date);
                    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (registrationsByDay[key] !== undefined) registrationsByDay[key]++;
                }
            });

            setData({
                totalAccounts,
                activeUsersCount,
                activeTodayCount,
                newThisWeek,
                totalConversations: nonAdminConvos.length,
                totalErrors,
                recentErrors,
                providerCounts,
                registrationsByDay,
            });
        } catch (e) {
            console.error('UserInsights load error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );

    if (!data) return (
        <div className="text-center py-20 text-muted-foreground">Failed to load insights.</div>
    );

    const maxReg = Math.max(...Object.values(data.registrationsByDay), 1);

    return (
        <div className="space-y-6">
            {/* Top stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">Total Accounts</span>
                        </div>
                        <div className="text-4xl font-bold">{data.totalAccounts}</div>
                        {data.newThisWeek > 0 && (
                            <div className="text-xs text-green-600 mt-1">+{data.newThisWeek} this week</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Active (7d)</span>
                        </div>
                        <div className="text-4xl font-bold">{data.activeUsersCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">{data.activeTodayCount} active today</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-4 w-4 text-purple-500" />
                            <span className="text-sm text-muted-foreground">Total Threads</span>
                        </div>
                        <div className="text-4xl font-bold">{data.totalConversations}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">Errors (7d)</span>
                        </div>
                        <div className="text-4xl font-bold">{data.recentErrors}</div>
                        <div className="text-xs text-muted-foreground mt-1">{data.totalErrors} total logged</div>
                    </CardContent>
                </Card>
            </div>

            {/* Registrations over time */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            New Registrations (Last 14 Days)
                        </span>
                        <Button variant="outline" size="sm" onClick={load}>
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Refresh
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-1 h-24">
                        {Object.entries(data.registrationsByDay).map(([day, count]) => (
                            <div key={day} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full bg-blue-500/70 rounded-sm transition-all"
                                    style={{ height: `${(count / maxReg) * 80}px`, minHeight: count > 0 ? '4px' : '1px' }}
                                    title={`${day}: ${count} registrations`}
                                />
                                {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                            {Object.keys(data.registrationsByDay)[0]}
                        </span>
                        <span className="text-xs text-muted-foreground">Today</span>
                    </div>
                </CardContent>
            </Card>

            {/* Provider usage (from error logs) */}
            {Object.keys(data.providerCounts).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Provider Usage (from error logs)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-3 flex-wrap">
                            {Object.entries(data.providerCounts).map(([p, c]) => (
                                <div key={p} className="flex items-center gap-2 border rounded-lg px-4 py-3">
                                    <span className="font-medium">{p}</span>
                                    <Badge variant="secondary">{c} events</Badge>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            Provider data sourced from error logs. Full per-turn provider tracking can be added via PipelineEvent indexing.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Cost note */}
            <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <div className="font-medium text-yellow-900">Cost Tracking Note</div>
                            <p className="text-sm text-yellow-800 mt-1">
                                Full per-turn token cost tracking requires storing <code>usage_tokens</code> from hybridMessage responses into a PipelineEvent or Message record. 
                                Currently tracking is approximated. To get exact costs: OpenAI ~$0.15/1M input tokens (GPT-4o-mini), Gemini Flash ~$0.075/1M, Grok-3 ~$3/1M.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}