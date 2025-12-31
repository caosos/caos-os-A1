import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ContinuityToken({ sessionId, userId, conversationMeta }) {
  const [copied, setCopied] = useState(false);

  const token = {
    protocol: "CAOS-A1-CONTINUITY",
    version: "1.0",
    source: "base44-ui",
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    user_id: userId,
    conversation_meta: conversationMeta,
    handoff_target: "lane-4-tools"
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
        <h3 className="text-white font-medium text-sm">Session Continuity Token</h3>
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
      <pre className="bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-white/80 overflow-x-auto font-mono">
        {tokenString}
      </pre>
      <p className="text-xs text-white/50 mt-2">
        Pass to Lane 4 → Lane 5 for backend continuity
      </p>
    </div>
  );
}