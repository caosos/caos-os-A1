import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Clock } from 'lucide-react';

export default function RecentErrors() {
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchErrors = async () => {
        setLoading(true);
        try {
            const errorLogs = await base44.asServiceRole.entities.ErrorLog.filter(
                {},
                '-created_date',
                20
            );
            setErrors(errorLogs || []);
        } catch (error) {
            console.error('Failed to fetch errors:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchErrors();
        const interval = setInterval(fetchErrors, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const getErrorTypeColor = (type) => {
        switch (type) {
            case 'timeout': return 'bg-yellow-600';
            case 'network_error': return 'bg-orange-600';
            case 'server_error': return 'bg-red-600';
            default: return 'bg-gray-600';
        }
    };

    if (loading && errors.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading error logs...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Recent Errors
                </CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchErrors}
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent>
                {errors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No errors logged recently - system is healthy! ✅
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {errors.map((error) => (
                            <div
                                key={error.id}
                                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Badge className={getErrorTypeColor(error.error_type)}>
                                            {error.error_type}
                                        </Badge>
                                        {error.retry_count > 0 && (
                                            <Badge variant="outline">
                                                Retried {error.retry_count}x
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {new Date(error.created_date).toLocaleString()}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-destructive">
                                        {error.error_message}
                                    </div>

                                    {error.user_email && (
                                        <div className="text-xs text-muted-foreground">
                                            User: {error.user_email}
                                        </div>
                                    )}

                                    {error.conversation_id && error.conversation_id !== 'none' && (
                                        <div className="text-xs text-muted-foreground">
                                            Conversation: {error.conversation_id}
                                        </div>
                                    )}

                                    {error.lost_message_content && (
                                        <div className="mt-2">
                                            <div className="text-xs text-muted-foreground mb-1">Lost Message:</div>
                                            <div className="bg-muted rounded p-2 text-xs">
                                                {error.lost_message_content.substring(0, 200)}
                                                {error.lost_message_content.length > 200 && '...'}
                                            </div>
                                        </div>
                                    )}

                                    {error.stack_trace && (
                                        <details className="mt-2">
                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                                View Stack Trace
                                            </summary>
                                            <pre className="mt-2 bg-muted rounded p-2 text-xs overflow-x-auto">
                                                {error.stack_trace}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}