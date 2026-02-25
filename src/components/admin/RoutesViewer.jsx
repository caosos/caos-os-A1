import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Lock, Unlock, Terminal } from 'lucide-react';

export default function RoutesViewer() {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchRoutes = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('inspectPipeline', { action: 'routes' });
            setRoutes(response.data.routes || []);
        } catch (error) {
            console.error('Failed to fetch routes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutes();
    }, []);

    const getCategoryColor = (category) => {
        switch (category) {
            case 'prod': return 'bg-green-600';
            case 'diagnostic': return 'bg-blue-600';
            case 'admin': return 'bg-purple-600';
            default: return 'bg-gray-600';
        }
    };

    const filteredRoutes = filter === 'all' 
        ? routes 
        : routes.filter(r => r.category === filter);

    if (loading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading routes...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Registered Routes</CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchRoutes}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" onValueChange={setFilter}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="all">All ({routes.length})</TabsTrigger>
                            <TabsTrigger value="prod">
                                Production ({routes.filter(r => r.category === 'prod').length})
                            </TabsTrigger>
                            <TabsTrigger value="diagnostic">
                                Diagnostic ({routes.filter(r => r.category === 'diagnostic').length})
                            </TabsTrigger>
                            <TabsTrigger value="admin">
                                Admin ({routes.filter(r => r.category === 'admin').length})
                            </TabsTrigger>
                        </TabsList>

                        <div className="space-y-3">
                            {filteredRoutes.map((route) => (
                                <div
                                    key={route.route_id}
                                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Terminal className="h-4 w-4 text-muted-foreground" />
                                            <code className="text-sm font-mono">{route.route_id}</code>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={getCategoryColor(route.category)}>
                                                {route.category}
                                            </Badge>
                                            {route.requires_auth ? (
                                                <Lock className="h-4 w-4 text-yellow-600" />
                                            ) : (
                                                <Unlock className="h-4 w-4 text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                    
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {route.description}
                                    </p>
                                    
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="font-mono">{route.path}</span>
                                        {route.requires_role && (
                                            <Badge variant="outline" className="text-xs">
                                                Role: {route.requires_role}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filteredRoutes.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No routes found in this category
                                </div>
                            )}
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}