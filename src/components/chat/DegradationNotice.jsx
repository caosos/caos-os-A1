import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

export default function DegradationNotice({ degradation }) {
    if (!degradation) return null;

    const getDegradationType = (type) => {
        switch (type) {
            case 'recall_failed':
                return {
                    title: 'Memory Recall Limited',
                    description: 'Unable to access conversation history. Responding with current context only.',
                    icon: Info,
                    variant: 'default'
                };
            case 'tool_execution_failed':
                return {
                    title: 'Tool Execution Failed',
                    description: 'Requested operation could not complete. Generated response based on available information.',
                    icon: AlertTriangle,
                    variant: 'warning'
                };
            case 'wcw_regulated':
                return {
                    title: 'Memory Compacted',
                    description: 'Conversation memory was automatically compressed to maintain performance.',
                    icon: Info,
                    variant: 'default'
                };
            default:
                return {
                    title: 'Degraded Mode',
                    description: 'Operating with limited capabilities.',
                    icon: AlertTriangle,
                    variant: 'warning'
                };
        }
    };

    const config = getDegradationType(degradation.type);
    const Icon = config.icon;

    return (
        <Alert className="mb-4 border-l-4">
            <Icon className="h-4 w-4" />
            <AlertDescription>
                <div className="font-semibold text-sm mb-1">{config.title}</div>
                <div className="text-xs text-muted-foreground">{config.description}</div>
                {degradation.details && (
                    <div className="text-xs text-muted-foreground mt-2 opacity-70">
                        {degradation.details}
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}