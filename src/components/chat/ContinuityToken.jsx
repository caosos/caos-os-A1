import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ContinuityToken({ sessionId, userId, conversationMeta, messages }) {
  const [copied, setCopied] = useState(false);

  // L4 Raw Data: Direct conversation history without interpretation
  const token = {
    protocol: "CAOS-A1-CONTINUITY",
    version: "1.0",
    data_type: "L4_RAW",
    authority: {
      source: "base44-ui-ephemeral",
      scope: "session-bounded",
      integrity: "unverified",
      requires_lane5_validation: true
    },
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    user_id: userId,
    conversation_meta: conversationMeta,
    raw_history: messages?.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      file_urls: m.file_urls,
      reactions: m.reactions,
      replies: m.replies
    })) || [],
    handoff_target: "lane-4-tools",
    next_lane: "lane-5-verification"
  };

  const tokenString = JSON.stringify(token, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(tokenString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-white font-medium text-sm">Session Continuity Token</h3>
          <p className="text-xs text-blue-300 mt-0.5">L4 Raw Data • Unverified</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-8 px-3 text-white hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <ScrollArea className="h-[300px] w-full">
        <pre className="bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-white/80 font-mono">
          {tokenString}
        </pre>
      </ScrollArea>
      <p className="text-xs text-white/50 mt-2">
        Raw session data → Lane 4 tools → Lane 5 verification
      </p>
    </div>
  );
}