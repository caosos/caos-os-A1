import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Shield, Activity, Database, Route, Zap, GitBranch } from 'lucide-react';
import RepoBrowser from '@/components/admin/RepoBrowser';
import RoutesViewer from '@/components/admin/RoutesViewer';
import StatsViewer from '@/components/admin/StatsViewer';
import WCWMonitor from '@/components/admin/WCWMonitor';
import SystemHealth from '@/components/admin/SystemHealth';
import RecentErrors from '@/components/admin/RecentErrors';
import PipelineVisualizer from '@/components/admin/PipelineVisualizer';

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
                
                if (currentUser.role !== 'admin') {
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                window.location.href = '/';
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Checking permissions...</p>
                </div>
            </div>
        );
    }

    if (!user || user.role !== 'admin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b bg-card">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold">CAOS Admin Dashboard</h1>
                            <p className="text-sm text-muted-foreground">
                                System monitoring and diagnostics
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                <Tabs defaultValue="health" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="health" className="gap-2">
                            <Activity className="h-4 w-4" />
                            Health
                        </TabsTrigger>
                        <TabsTrigger value="routes" className="gap-2">
                            <Route className="h-4 w-4" />
                            Routes
                        </TabsTrigger>
                        <TabsTrigger value="wcw" className="gap-2">
                            <Database className="h-4 w-4" />
                            WCW
                        </TabsTrigger>
                        <TabsTrigger value="stats" className="gap-2">
                            <Activity className="h-4 w-4" />
                            Stats
                        </TabsTrigger>
                        <TabsTrigger value="errors" className="gap-2">
                            <Shield className="h-4 w-4" />
                            Errors
                        </TabsTrigger>
                        <TabsTrigger value="pipeline" className="gap-2">
                            <Zap className="h-4 w-4" />
                            Pipeline
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="health">
                        <SystemHealth />
                    </TabsContent>

                    <TabsContent value="routes">
                        <RoutesViewer />
                    </TabsContent>

                    <TabsContent value="wcw">
                        <WCWMonitor />
                    </TabsContent>

                    <TabsContent value="stats">
                        <StatsViewer />
                    </TabsContent>

                    <TabsContent value="errors">
                        <RecentErrors />
                    </TabsContent>

                    <TabsContent value="pipeline">
                        <PipelineVisualizer />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}