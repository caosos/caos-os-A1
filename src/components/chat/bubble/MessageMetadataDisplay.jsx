import React from 'react';
import LatencyIndicator from '../LatencyIndicator';
import WCWStatusBadge from '../WCWStatusBadge';

export default function MessageMetadataDisplay({ isUser, timestamp, response_time_ms, latency, wcw_status, formatDateTime }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {timestamp && (
        <p className={`text-xs ${isUser ? 'text-white/60' : 'text-white/40'}`}>
          {formatDateTime(timestamp)}
        </p>
      )}
      {!isUser && response_time_ms && response_time_ms > 0 && (
        <span className="text-xs text-green-400/70 flex items-center gap-1">
          {timestamp && <span>•</span>}
          ⏱️ {response_time_ms < 1000 ? `${response_time_ms}ms` : `${(response_time_ms / 1000).toFixed(1)}s`}
        </span>
      )}
      {/* Latency Indicator */}
      {!isUser && latency && (
        <LatencyIndicator latency={latency} compact={true} />
      )}
      {/* WCW Status Badge */}
      {!isUser && wcw_status && (
        <WCWStatusBadge wcwStatus={wcw_status} compact={true} />
      )}
    </div>
  );
}