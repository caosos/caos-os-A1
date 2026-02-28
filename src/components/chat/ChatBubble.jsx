import React, { useState } from 'react';
import { Volume2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleReadAloud } from './ChatBubbleReadAloud';
import ExecutionReceipt from './ExecutionReceipt';

export default function ChatBubble({ message, isUser, onUpdateMessage, closeMenuTrigger, userInitials }) {
  const [isReadingAloud, setIsReadingAloud] = useState(false);

  const handlePlayClick = () => {
    if (!isUser && message.content) {
      handleReadAloud(
        message.content,
        message.id,
        () => setIsReadingAloud(true),
        () => setIsReadingAloud(false)
      );
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 mb-4 items-end">
        <div className="max-w-xs md:max-w-md lg:max-w-lg bg-blue-600/30 backdrop-blur-sm border border-blue-500/50 rounded-2xl rounded-tr-md px-4 py-2 text-white">
          <p className="text-sm leading-relaxed">{message.content}</p>
          {message.file_urls?.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/20 text-xs text-blue-200">
              📎 {message.file_urls.length} file(s)
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
          {userInitials || 'U'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-4 items-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-2xl">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl rounded-tl-md px-4 py-3 text-white">
          <p className="text-sm leading-relaxed">{message.content}</p>
          
          {message.tool_calls?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20 text-xs space-y-1">
              {message.tool_calls.map((call, idx) => (
                <div key={idx} className="text-white/70">
                  🔧 {call.name}: {call.status}
                </div>
              ))}
            </div>
          )}
        </div>

        {message.execution_receipt && (
          <div className="mt-2">
            <ExecutionReceipt receipt={message.execution_receipt} />
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePlayClick}
            disabled={isReadingAloud}
            className="text-white/70 hover:text-white hover:bg-white/10"
            title="Read aloud with OpenAI voice"
          >
            <Volume2 className={`w-4 h-4 ${isReadingAloud ? 'animate-pulse' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}