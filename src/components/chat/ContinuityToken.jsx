import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ContinuityToken({ sessionId, userId, conversationMeta, messages }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('session');

  // SESSION TOKEN: L4 Raw Data for current conversation
  const sessionToken = {
    protocol: "CAOS-A1-CONTINUITY",
    version: "1.0",
    token_type: "SESSION_DATA",
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

  // IMPLEMENTATION TOKEN: UI contract specs for backend matching
  const implementationToken = {
    protocol: "CAOS-A1-UI-BACKEND-CONTRACT",
    version: "1.0",
    token_type: "IMPLEMENTATION_SPEC",
    authority: {
      source: "base44-ui-implementation",
      scope: "cross-layer-contract",
      requires_backend_alignment: true
    },
    timestamp: new Date().toISOString(),
    ui_capabilities: {
      voice_input: {
        pause_tolerance: "5000ms",
        auto_restart: "on_pause_with_delay",
        error_handling: "retry_with_5s_delay",
        implementation: "webkitSpeechRecognition"
      },
      file_handling: {
        supported_types: ["text", "image", "document", "binary"],
        multi_file_synthesis: true,
        image_vision_analysis: true,
        screen_capture: true,
        camera_capture: true
      },
      session_management: {
        session_resume_handshake: true,
        session_desync_detection: true,
        continuity_token_protocol: "CAOS-A1-CONTINUITY v1.0"
      },
      memory_gate: {
        implementation: "explicit_recall_keywords",
        session_scope: "ephemeral_l4_raw",
        cross_session: "requires_explicit_keywords",
        keywords: ["earlier", "before", "previously", "last time", "you said", "i said", "what did", "remember", "recall"]
      },
      message_format: {
        request_includes: ["message", "session", "memory_gate", "images"],
        expected_response: ["reply", "session"],
        session_verification: "mandatory"
      }
    },
    backend_requirements: {
      endpoints: [
        {
          path: "/api/message",
          method: "POST",
          contract: {
            request: {
              message: "string (includes file content synthesis)",
              session: "string (conversation_id)",
              memory_gate: {
                allowed: "boolean",
                scope: "string (session|cross-session)",
                explicit_recall: "boolean",
                reason: "string"
              },
              images: "array[{url: string}] (optional)"
            },
            response: {
              reply: "string",
              session: "string (must match request.session)"
            }
          }
        }
      ],
      session_integrity: {
        verification: "compare request.session === response.session",
        on_mismatch: "log_error + user_toast",
        resume_handshake: "POST with type=__SESSION_RESUME__"
      }
    },
    data_structures: {
      conversation: {
        id: "string (uuid)",
        title: "string",
        last_message_time: "ISO timestamp",
        last_message_preview: "string"
      },
      message: {
        id: "string (uuid)",
        conversation_id: "string (fk)",
        role: "user|assistant",
        content: "string",
        file_urls: "array[string] (optional)",
        timestamp: "ISO timestamp",
        reactions: "array[{emoji, selected_text}] (optional)",
        replies: "array[{selected_text, user_reply, ai_response, timestamp}] (optional)"
      }
    },
    handoff_target: "lane-4-tools",
    next_lane: "lane-5-backend-implementation"
  };

  const currentToken = activeTab === 'session' ? sessionToken : implementationToken;
  const tokenString = JSON.stringify(currentToken, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(tokenString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = activeTab === 'session' 
      ? `caos-session-${sessionId?.substring(0, 8)}-${Date.now()}.txt`
      : `caos-implementation-spec-${Date.now()}.txt`;
    
    const blob = new Blob([tokenString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">CAOS-A1 Session Token</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleDownload}
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download
          </Button>
          <Button
            size="sm"
            onClick={handleCopy}
            className="bg-gray-600 hover:bg-gray-700 text-white h-8 px-3 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/10 border border-white/20 w-full mb-2 p-0.5 h-9">
          <TabsTrigger value="session" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70 flex-1 py-1.5">
            Session Data
          </TabsTrigger>
          <TabsTrigger value="implementation" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70 flex-1 py-1.5">
            Implementation Spec
          </TabsTrigger>
        </TabsList>

        <TabsContent value="session" className="mt-0">
          <p className="text-xs text-blue-300 mb-1.5">L4 Raw Data • Session {sessionId?.substring(0, 8)}...</p>
          <ScrollArea className="h-[200px] w-full">
            <pre className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white/80 font-mono whitespace-pre-wrap break-all">
              {tokenString}
            </pre>
          </ScrollArea>
          <p className="text-xs text-white/50 mt-1.5">
            Raw conversation history → Lane 4 → Lane 5 verification
          </p>
        </TabsContent>

        <TabsContent value="implementation" className="mt-0">
          <p className="text-xs text-blue-300 mb-1.5">UI-Backend Contract • For Backend Alignment</p>
          <ScrollArea className="h-[200px] w-full">
            <pre className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white/80 font-mono whitespace-pre-wrap break-all">
              {tokenString}
            </pre>
          </ScrollArea>
          <p className="text-xs text-white/50 mt-1.5">
            UI capabilities + contract specs → Lane 4 tools → Lane 5 backend implementation
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}