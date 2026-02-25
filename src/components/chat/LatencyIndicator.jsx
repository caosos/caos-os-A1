import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, AlertTriangle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export default function LatencyIndicator({ latency, compact = false }) {
    if (!latency || !latency.total_ms) return null;

    const getLatencyStatus = (ms) => {
        if (ms < 2000) return { status: 'fast', color: 'text-green-600', icon: Zap };
        if (ms < 5000) return { status: 'normal', color: 'text-yellow-600', icon: Clock };
        return { status: 'slow', color: 'text-red-600', icon: AlertTriangle };
    };

    const { status, color, icon: Icon } = getLatencyStatus(latency.total_ms);

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs gap-1">
                            <Icon className={`h-3 w-3 ${color}`} />
                            {latency.total_ms}ms
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1 text-xs">
                            <div className="font-semibold mb-2">Pipeline Latency</div>
                            {latency.boot_validation_ms > 0 && (
                                <div className="flex justify-between gap-4">
                                    <span>Boot:</span>
                                    <span className="font-mono">{latency.boot_validation_ms}ms</span>
                                </div>
                            )}
                            {latency.context_load_ms > 0 && (
                                <div className="flex justify-between gap-4">
                                    <span>Context:</span>
                                    <span className="font-mono">{latency.context_load_ms}ms</span>
                                </div>
                            )}
                            {latency.selector_ms > 0 && (
                                <div className="flex justify-between gap-4">
                                    <span>Selector:</span>
                                    <span className="font-mono">{latency.selector_ms}ms</span>
                                </div>
                            )}
                            {latency.recall_ms > 0 && (
                                <div className="flex justify-between gap-4">
                                    <span>Recall:</span>
                                    <span className="font-mono">{latency.recall_ms}ms</span>
                                </div>
                            )}
                            {latency.inference_ms > 0 && (
                                <div className="flex justify-between gap-4">
                                    <span>Inference:</span>
                                    <span className="font-mono">{latency.inference_ms}ms</span>
                                </div>
                            )}
                            {latency.tool_execution_ms > 0 && (
                                <div className="flex justify-between gap-4">
                                    <span>Tools:</span>
                                    <span className="font-mono">{latency.tool_execution_ms}ms</span>
                                </div>
                            )}
                            <div className="flex justify-between gap-4 pt-1 border-t font-semibold">
                                <span>Total:</span>
                                <span className="font-mono">{latency.total_ms}ms</span>
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <Icon className={`h-3 w-3 ${color}`} />
                <span>Response time: {latency.total_ms}ms</span>
            </div>
        </div>
    );
}