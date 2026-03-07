import React from 'react';
import MessageMetadataDisplay from './MessageMetadataDisplay';

export default function MessageMetaRow({ 
  isUser, 
  timestamp, 
  response_time_ms, 
  latency, 
  wcw_status, 
  formatDateTime, 
  rightSlot 
}) {
  return (
    (timestamp || (!isUser && response_time_ms)) && (
      <div className={`flex items-center justify-between mt-1.5 ${isUser ? '' : 'gap-3'}`}>
        <MessageMetadataDisplay 
          isUser={isUser} 
          timestamp={timestamp} 
          response_time_ms={response_time_ms} 
          latency={latency} 
          wcw_status={wcw_status}
          formatDateTime={formatDateTime}
        />
        {rightSlot}
      </div>
    )
  );
}