import React from 'react';
import FunctionDisplay from './FunctionDisplay';
import Reactions from './Reactions';
import Replies from './Replies';

export default function MessageMetadataContent({ toolCalls, reactions, replies }) {
  return (
    <>
      {/* Tool Calls */}
      {toolCalls?.length > 0 && (
        <div className="space-y-1 mt-2">
          {toolCalls.map((toolCall, idx) => (
            <FunctionDisplay key={idx} toolCall={toolCall} />
          ))}
        </div>
      )}

      {/* Reactions */}
      <Reactions reactions={reactions} />

      {/* Replies */}
      <Replies replies={replies} />
    </>
  );
}