import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Database, AlertTriangle, CheckCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export default function WCWStatusBadge({ wcwStatus, compact = true }) {
    if (!wcwStatus) return null;

    const getStatusConfig = (status) => {
        switch (status) {
            case 'regulated':
                return {
                    label: 'WCW Regulated',
                    icon: AlertTriangle,
                    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                    description: 'Token limit reached - automatic compaction occurred'
                };
            case 'nominal':
            default:
                return {
                    label: 'WCW Nominal',
                    icon: CheckCircle,
                    className: 'bg-green-100 text-green-800 border-green-300',
                    description: 'Memory within normal limits'
                };
        }
    };

    const config = getStatusConfig(wcwStatus);
    const Icon = config.icon;

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="outline" className={`text-xs gap-1 ${config.className}`}>
                            <Icon className="h-3 w-3" />
                            WCW
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <div className="text-xs">
                            <div className="font-semibold mb-1">{config.label}</div>
                            <div>{config.description}</div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.className}`}>
            <Icon className="h-4 w-4" />
            <div>
                <div className="text-xs font-semibold">{config.label}</div>
                <div className="text-xs opacity-90">{config.description}</div>
            </div>
        </div>
    );
}