import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Database, Zap, GitBranch, Users, AlertTriangle } from 'lucide-react';
import RepoBrowser from '@/components/admin/RepoBrowser';
import WCWInspector from '@/components/admin/WCWInspector';
import RecentErrors from '@/components/admin/RecentErrors';
import UserInsights from '@/components/admin/UserInsights';

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('users');
    const [errorFilter, setErrorFilter] = useState(null);

    React.useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
                if (currentUser.role !== 'admin') window.location.href = '/';
            } catch (error) {
                console.error('Auth check failed:', error);
                window.location.href = '/';
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    // Called from UserInsights when user clicks an error stat
    const handleErrorDrilldown = (filter) => {
        setErrorFilter(filter);
        setActiveTab('errors');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Checking permissions...</p>
                </div>
            </div>
        );
    }

    if (!user || user.role !== 'admin') return null;

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b bg-card">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold">CAOS Admin</h1>
                            <p className="text-sm text-muted-foreground">System monitoring and diagnostics</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="users" className="gap-2">
                            <Users className="h-4 w-4" />
                            Users &amp; Stats
                        </TabsTrigger>
                        <TabsTrigger value="errors" className="gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Errors
                        </TabsTrigger>
                        <TabsTrigger value="wcw_inspector" className="gap-2">
                            <Database className="h-4 w-4" />
                            Context Inspector
                        </TabsTrigger>
                        <TabsTrigger value="repo" className="gap-2">
                            <GitBranch className="h-4 w-4" />
                            Repo
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        <UserInsights onErrorDrilldown={handleErrorDrilldown} />
                    </TabsContent>

                    <TabsContent value="errors">
                        <RecentErrors initialFilter={errorFilter} onFilterUsed={() => setErrorFilter(null)} />
                    </TabsContent>

                    <TabsContent value="wcw_inspector">
                        <WCWInspector />
                    </TabsContent>

                    <TabsContent value="repo" className="h-[75vh]">
                        <RepoBrowser />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}