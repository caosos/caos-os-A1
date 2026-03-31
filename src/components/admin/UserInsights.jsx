import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Globe, MessageSquare, RefreshCw, TrendingUp, Zap, Clock, Monitor, UserCheck, UserX } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'text-blue-500' }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <div className="text-4xl font-bold">{value ?? '—'}</div>
                {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
            </CardContent>
        </Card>
    );
}

function MiniBar({ label, value, max, color = 'bg-blue-500' }) {
    const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
    return (
        <div className="flex items-center gap-3">
            <div className="w-28 text-sm text-muted-foreground truncate">{label}</div>
            <div className="flex-1 bg-muted rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <div className="w-8 text-sm font-medium text-right">{value}</div>
        </div>
    );
}

export default function UserInsights() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [users, conversations, logins, errors] = await Promise.all([
                base44.entities.User.list('-created_date', 500),
                base44.entities.Conversation.list('-last_message_time', 1000),
                base44.entities.UserLogin.list('-login_time', 1000),
                base44.entities.ErrorLog.list('-created_date', 500),
            ]);

            const now = Date.now();
            const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
            const oneHourAgo = now - 60 * 60 * 1000;

            // ── USERS ─────────────────────────────────────────────────────────
            const allUsers = users || [];
            const nonAdminUsers = allUsers.filter(u => u.role !== 'admin');
            const totalRegistered = nonAdminUsers.length;
            const newThisWeek = nonAdminUsers.filter(u => new Date(u.created_date).getTime() > sevenDaysAgo).length;
            const newToday = nonAdminUsers.filter(u => new Date(u.created_date).getTime() > oneDayAgo).length;
            const newThisMonth = nonAdminUsers.filter(u => new Date(u.created_date).getTime() > thirtyDaysAgo).length;

            // ── SESSIONS / LOGINS ─────────────────────────────────────────────
            const allLogins = logins || [];
            const registeredLogins = allLogins.filter(l => !l.is_guest);
            const guestLogins = allLogins.filter(l => l.is_guest);

            // "Currently active" = last_active_time within last hour and no logout_time
            const currentlyActive = allLogins.filter(l => {
                const last = l.last_active_time ? new Date(l.last_active_time).getTime() : 0;
                return last > oneHourAgo && !l.logout_time;
            });
            const currentlyActiveRegistered = currentlyActive.filter(l => !l.is_guest).length;
            const currentlyActiveGuest = currentlyActive.filter(l => l.is_guest).length;

            // Active today (any session active in last 24h)
            const activeToday = allLogins.filter(l => {
                const last = l.last_active_time ? new Date(l.last_active_time).getTime()
                    : l.login_time ? new Date(l.login_time).getTime() : 0;
                return last > oneDayAgo;
            });
            const activeTodayCount = activeToday.length;

            // Active this week
            const activeThisWeek = allLogins.filter(l => {
                const last = l.last_active_time ? new Date(l.last_active_time).getTime()
                    : l.login_time ? new Date(l.login_time).getTime() : 0;
                return last > sevenDaysAgo;
            }).length;

            // Total ever logged in (unique emails for registered, count for guests)
            const uniqueRegisteredEmails = [...new Set(registeredLogins.map(l => l.user_email).filter(Boolean))];
            const totalEverLoggedIn = uniqueRegisteredEmails.length;
            const totalSessions = allLogins.length;
            const totalGuestSessions = guestLogins.length;

            // Login methods
            const methodCounts = {};
            allLogins.forEach(l => {
                const m = l.login_method || 'unknown';
                methodCounts[m] = (methodCounts[m] || 0) + 1;
            });

            // Avg session duration (registered only, where known)
            const durationsKnown = registeredLogins.filter(l => l.session_duration_minutes > 0);
            const avgSessionMin = durationsKnown.length > 0
                ? Math.round(durationsKnown.reduce((s, l) => s + l.session_duration_minutes, 0) / durationsKnown.length)
                : null;

            // ── GEO ──────────────────────────────────────────────────────────
            const countryCounts = {};
            allLogins.forEach(l => {
                if (l.country) {
                    countryCounts[l.country] = (countryCounts[l.country] || 0) + 1;
                }
            });
            const topCountries = Object.entries(countryCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

            // ── CONVERSATIONS ─────────────────────────────────────────────────
            const nonAdminEmails = new Set(nonAdminUsers.map(u => u.email));
            const userConvos = (conversations || []).filter(c => !c.created_by || nonAdminEmails.has(c.created_by) || !allUsers.find(u => u.email === c.created_by));
            const totalConversations = userConvos.length;
            const convosToday = userConvos.filter(c => {
                const t = c.last_message_time ? new Date(c.last_message_time).getTime() : 0;
                return t > oneDayAgo;
            }).length;
            const convosThisWeek = userConvos.filter(c => {
                const t = c.last_message_time ? new Date(c.last_message_time).getTime() : 0;
                return t > sevenDaysAgo;
            }).length;

            // ── ERRORS ────────────────────────────────────────────────────────
            const allErrors = errors || [];
            const errorsToday = allErrors.filter(e => new Date(e.created_date).getTime() > oneDayAgo).length;
            const errorsThisWeek = allErrors.filter(e => new Date(e.created_date).getTime() > sevenDaysAgo).length;

            // Error types breakdown
            const errorTypes = {};
            allErrors.forEach(e => {
                errorTypes[e.error_type || 'unknown'] = (errorTypes[e.error_type || 'unknown'] || 0) + 1;
            });

            // ── REGISTRATION CHART (14 days) ──────────────────────────────────
            const regByDay = {};
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                regByDay[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
            }
            nonAdminUsers.forEach(u => {
                if (u.created_date) {
                    const key = new Date(u.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (regByDay[key] !== undefined) regByDay[key]++;
                }
            });

            // ── SESSION CHART (14 days) ───────────────────────────────────────
            const sessionsByDay = {};
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                sessionsByDay[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
            }
            allLogins.forEach(l => {
                if (l.login_time) {
                    const key = new Date(l.login_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (sessionsByDay[key] !== undefined) sessionsByDay[key]++;
                }
            });

            setData({
                totalRegistered, newThisWeek, newToday, newThisMonth,
                currentlyActiveRegistered, currentlyActiveGuest,
                activeTodayCount, activeThisWeek,
                totalEverLoggedIn, totalSessions, totalGuestSessions,
                methodCounts, avgSessionMin,
                topCountries,
                totalConversations, convosToday, convosThisWeek,
                totalErrors: allErrors.length, errorsToday, errorsThisWeek, errorTypes,
                regByDay, sessionsByDay,
            });
        } catch (e) {
            console.error('UserInsights error:', e);
            setError(e.message);
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
    if (error) return (
        <div className="text-center py-20 text-red-500">Failed to load: {error}</div>
    );
    if (!data) return null;

    const maxReg = Math.max(...Object.values(data.regByDay), 1);
    const maxSessions = Math.max(...Object.values(data.sessionsByDay), 1);
    const maxCountry = data.topCountries[0]?.[1] || 1;
    const maxErrorType = Math.max(...Object.values(data.errorTypes), 1);

    return (
        <div className="space-y-6">

            {/* LIVE STATUS */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                    Live Status
                </h2>
                <Button variant="outline" size="sm" onClick={load}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={UserCheck} label="Active Now (registered)" value={data.currentlyActiveRegistered} sub="sessions in last hour" color="text-green-500" />
                <StatCard icon={Users} label="Active Now (guests)" value={data.currentlyActiveGuest} sub="sessions in last hour" color="text-teal-500" />
                <StatCard icon={TrendingUp} label="Active Today" value={data.activeTodayCount} sub="all session types" color="text-blue-500" />
                <StatCard icon={TrendingUp} label="Active This Week" value={data.activeThisWeek} sub="all session types" color="text-purple-500" />
            </div>

            {/* ACCOUNTS */}
            <h2 className="text-lg font-semibold flex items-center gap-2 pt-2">
                <Users className="h-5 w-5" /> Registered Accounts
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Registered" value={data.totalRegistered} color="text-blue-500" />
                <StatCard icon={UserCheck} label="Ever Logged In" value={data.totalEverLoggedIn} sub="unique emails" color="text-green-500" />
                <StatCard icon={TrendingUp} label="New This Month" value={data.newThisMonth} color="text-purple-500" />
                <StatCard icon={TrendingUp} label="New Today" value={data.newToday} sub={`+${data.newThisWeek} this week`} color="text-orange-500" />
            </div>

            {/* SESSIONS */}
            <h2 className="text-lg font-semibold flex items-center gap-2 pt-2">
                <Clock className="h-5 w-5" /> Sessions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Clock} label="Total Sessions Ever" value={data.totalSessions} color="text-blue-500" />
                <StatCard icon={UserX} label="Guest Sessions" value={data.totalGuestSessions} sub="no account required" color="text-slate-500" />
                <StatCard icon={Clock} label="Avg Session Length" value={data.avgSessionMin != null ? `${data.avgSessionMin}m` : 'N/A'} sub="registered users" color="text-teal-500" />
                <StatCard icon={MessageSquare} label="Total Threads" value={data.totalConversations} sub={`${data.convosToday} today · ${data.convosThisWeek} this week`} color="text-purple-500" />
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Registrations chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">New Registrations — Last 14 Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-1 h-20">
                            {Object.entries(data.regByDay).map(([day, count]) => (
                                <div key={day} className="flex-1 flex flex-col items-center gap-0.5" title={`${day}: ${count}`}>
                                    <div
                                        className="w-full bg-blue-500/70 rounded-sm"
                                        style={{ height: `${(count / maxReg) * 72}px`, minHeight: count > 0 ? '3px' : '1px' }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-xs text-muted-foreground">{Object.keys(data.regByDay)[0]}</span>
                            <span className="text-xs text-muted-foreground">Today</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Sessions chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Sessions Started — Last 14 Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-1 h-20">
                            {Object.entries(data.sessionsByDay).map(([day, count]) => (
                                <div key={day} className="flex-1 flex flex-col items-center gap-0.5" title={`${day}: ${count}`}>
                                    <div
                                        className="w-full bg-green-500/70 rounded-sm"
                                        style={{ height: `${(count / maxSessions) * 72}px`, minHeight: count > 0 ? '3px' : '1px' }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-xs text-muted-foreground">{Object.keys(data.sessionsByDay)[0]}</span>
                            <span className="text-xs text-muted-foreground">Today</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* GEO + LOGIN METHODS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Globe className="h-4 w-4" /> Top Countries
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {data.topCountries.length > 0 ? data.topCountries.map(([country, count]) => (
                            <MiniBar key={country} label={country} value={count} max={maxCountry} color="bg-blue-500" />
                        )) : (
                            <p className="text-sm text-muted-foreground">No geo data yet — requires login tracking via useSessionTracker.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Monitor className="h-4 w-4" /> Login Methods
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {Object.keys(data.methodCounts).length > 0 ? (
                            Object.entries(data.methodCounts)
                                .sort((a, b) => b[1] - a[1])
                                .map(([method, count]) => (
                                    <MiniBar key={method} label={method} value={count} max={data.totalSessions} color="bg-purple-500" />
                                ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No login session data yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ERRORS */}
            <h2 className="text-lg font-semibold flex items-center gap-2 pt-2">
                <Zap className="h-5 w-5 text-red-500" /> Errors
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={Zap} label="Total Logged" value={data.totalErrors} color="text-red-500" />
                <StatCard icon={Zap} label="This Week" value={data.errorsThisWeek} color="text-orange-500" />
                <StatCard icon={Zap} label="Today" value={data.errorsToday} color="text-yellow-500" />
            </div>
            {Object.keys(data.errorTypes).length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="text-base">Error Types Breakdown</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {Object.entries(data.errorTypes).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                            <MiniBar key={type} label={type} value={count} max={maxErrorType} color="bg-red-400" />
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* COST NOTE */}
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                <CardContent className="pt-5">
                    <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <div className="font-medium text-yellow-900 dark:text-yellow-300">Cost Reference (no billing active)</div>
                            <p className="text-sm text-yellow-800 dark:text-yellow-400 mt-1">
                                GPT-4o-mini ~$0.15/1M input tokens · Gemini Flash ~$0.075/1M · Grok-3 ~$3/1M · OpenAI TTS ~$15/1M chars.
                                Per-turn token cost tracking can be added by storing <code>usage_tokens</code> from hybridMessage responses into Message records.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}