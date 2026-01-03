import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import ThreadList from '@/components/chat/ThreadList';
import WelcomeGreeting from '@/components/chat/WelcomeGreeting';
import ProfilePanel from '@/components/chat/ProfilePanel';
import ContinuityToken from '@/components/chat/ContinuityToken';
import CodeTerminal from '@/components/terminal/CodeTerminal';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [showThreads, setShowThreads] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [closeMenuTrigger, setCloseMenuTrigger] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [multiAgentMode, setMultiAgentMode] = useState(localStorage.getItem('caos_multi_agent_mode') === 'true');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  
  const isDeveloperMode = localStorage.getItem('caos_developer_mode') === 'true';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    const handleShowToken = () => setShowToken(true);
    window.addEventListener('show-continuity-token', handleShowToken);
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('show-continuity-token', handleShowToken);
    };
  }, []);

  // Load user and their data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if guest mode
        const guestUser = localStorage.getItem('caos_guest_user');
        if (guestUser) {
          const currentUser = JSON.parse(guestUser);
          setUser(currentUser);

          // Load guest conversations from localStorage
          const guestConvos = JSON.parse(localStorage.getItem('caos_guest_conversations') || '[]');
          setConversations(guestConvos);

          const guestMessages = JSON.parse(localStorage.getItem('caos_guest_messages') || '{}');
          setMessages(guestMessages);

          setDataLoaded(true);
          return;
        }

        // For authenticated users - check if logged in
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Load conversations for this user
        const userConvos = await base44.entities.Conversation.filter(
          { created_by: currentUser.email },
          '-last_message_time',
          100
        );
        setConversations(userConvos);

        // Load messages for all conversations
        const messagesMap = {};
        for (const conv of userConvos) {
          const convMessages = await base44.entities.Message.filter(
            { conversation_id: conv.id },
            'timestamp',
            1000
          );
          messagesMap[conv.id] = convMessages;
        }
        setMessages(messagesMap);

        setDataLoaded(true);
        } catch (error) {
        console.error('Error loading user data:', error);
        // Not authenticated - redirect to welcome page
        navigate(createPageUrl('Welcome'));
        }
    };

    loadUserData();
  }, [navigate]);

  const isGuestMode = !!localStorage.getItem('caos_guest_user');
  const currentMessages = currentConversationId ? (messages[currentConversationId] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  const handleNewThread = async () => {
    if (!user) return;

    try {
      if (isGuestMode) {
        // Guest mode: create conversation locally
        const newConversation = {
          id: 'guest_' + Date.now(),
          title: 'New Conversation',
          last_message_time: new Date().toISOString(),
          created_by: user.email
        };
        const updatedConvos = [newConversation, ...conversations];
        setConversations(updatedConvos);
        localStorage.setItem('caos_guest_conversations', JSON.stringify(updatedConvos));
        setCurrentConversationId(newConversation.id);
        setMessages({ ...messages, [newConversation.id]: [] });
      } else {
        // Authenticated: save to database
        const newConversation = await base44.entities.Conversation.create({
          title: 'New Conversation',
          last_message_time: new Date().toISOString(),
          created_by: user.email
        });
        setConversations([newConversation, ...conversations]);
        setCurrentConversationId(newConversation.id);
        localStorage.setItem('caos_last_conversation', newConversation.id);
        setMessages({ ...messages, [newConversation.id]: [] });
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create new thread');
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      if (isGuestMode) {
        // Guest mode: delete locally
        const updatedConvos = conversations.filter(c => c.id !== id);
        setConversations(updatedConvos);
        localStorage.setItem('caos_guest_conversations', JSON.stringify(updatedConvos));
        
        const newMessages = { ...messages };
        delete newMessages[id];
        setMessages(newMessages);
        localStorage.setItem('caos_guest_messages', JSON.stringify(newMessages));
        
        if (currentConversationId === id) {
          setCurrentConversationId(null);
        }
      } else {
        // Authenticated: delete from database
        await base44.entities.Conversation.delete(id);
        const convMessages = messages[id] || [];
        for (const msg of convMessages) {
          await base44.entities.Message.delete(msg.id);
        }
        setConversations(conversations.filter(c => c.id !== id));
        const newMessages = { ...messages };
        delete newMessages[id];
        setMessages(newMessages);
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          localStorage.removeItem('caos_last_conversation');
        }
      }
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete thread');
    }
  };

  const handleRenameConversation = async (id, newTitle) => {
    const updatedConvos = conversations.map(c => 
      c.id === id ? { ...c, title: newTitle } : c
    );
    setConversations(updatedConvos);

    try {
      if (isGuestMode) {
        localStorage.setItem('caos_guest_conversations', JSON.stringify(updatedConvos));
      } else {
        await base44.entities.Conversation.update(id, { title: newTitle });
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast.error('Failed to rename thread');
    }
  };



  const handleUpdateMessage = async (messageId, updates) => {
    if (!currentConversationId) return;
    
    const convMessages = messages[currentConversationId] || [];
    const updatedMessages = convMessages.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    const newMessages = { ...messages, [currentConversationId]: updatedMessages };
    setMessages(newMessages);

    try {
      if (isGuestMode) {
        localStorage.setItem('caos_guest_messages', JSON.stringify(newMessages));
      } else {
        await base44.entities.Message.update(messageId, updates);
      }
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleSessionResume = async (sessionId) => {
    try {
      const conversation = conversations.find(c => c.id === sessionId);
      const response = await fetch("https://nonextractive-son-ichnographical.ngrok-free.dev/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "__SESSION_RESUME__",
          session: sessionId,
          thread_meta: {
            title: conversation?.title || 'Untitled',
            created_ts: conversation?.created_date ? new Date(conversation.created_date).getTime() : Date.now(),
            last_ts: conversation?.last_message_time ? new Date(conversation.last_message_time).getTime() : Date.now()
          }
        })
      });

      const data = await response.json();

      // Verify session alignment per CAOS-A1 contract
      if (data.session && data.session !== sessionId) {
        console.error('SESSION DESYNC on resume:', { expected: sessionId, received: data.session });
        toast.error('Session mismatch detected during resume.');
      }
    } catch (error) {
      console.error('Session resume handshake failed:', error);
    }
  };

  const handleSendMessage = async (content, fileUrls = []) => {
    if (!user) return;
    setIsLoading(true);

    try {
      let conversationId = currentConversationId;
      let conversation = conversations.find(c => c.id === conversationId);

      // Create new conversation if none exists
      if (!conversationId) {
        const title = content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : 'File attachment';

        if (isGuestMode) {
          conversation = {
            id: 'guest_' + Date.now(),
            title: title,
            last_message_time: new Date().toISOString(),
            created_by: user.email
          };
          conversationId = conversation.id;
          const updatedConvos = [conversation, ...conversations];
          setConversations(updatedConvos);
          localStorage.setItem('caos_guest_conversations', JSON.stringify(updatedConvos));
          setCurrentConversationId(conversationId);
          setMessages({ ...messages, [conversationId]: [] });
        } else {
          conversation = await base44.entities.Conversation.create({
            title: title,
            last_message_time: new Date().toISOString(),
            created_by: user.email
          });
          conversationId = conversation.id;
          setConversations([conversation, ...conversations]);
          setCurrentConversationId(conversationId);
          localStorage.setItem('caos_last_conversation', conversationId);
          setMessages({ ...messages, [conversationId]: [] });
        }
      }

      const convMessages = messages[conversationId] || [];

      // Process files per CAOS-A1 contract
      let fileContents = '';
      const images = [];
      const fileSummary = { text: 0, image: 0, document: 0, other: 0 };

      if (fileUrls.length > 0) {
        for (let i = 0; i < fileUrls.length; i++) {
          const fileUrl = fileUrls[i];
          try {
            const fileName = fileUrl.split('/').pop();
            const extension = fileName.split('.').pop()?.toLowerCase();

            const textExtensions = ['txt', 'md', 'json', 'csv', 'log', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'html', 'css', 'xml', 'yaml', 'yml'];
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
            const documentExtensions = ['pdf', 'doc', 'docx'];

            if (textExtensions.includes(extension)) {
              const response = await fetch(fileUrl);
              const fileContent = await response.text();
              fileContents += `\n\n=== TEXT FILE: ${fileName} ===\n${fileContent}\n=== END TEXT FILE ===\n`;
              fileSummary.text++;
            } else if (imageExtensions.includes(extension)) {
              images.push({ url: fileUrl });
              fileContents += `\n\n[IMAGE ${i + 1}: "${fileName}" - USE VISION TO ANALYZE AND DESCRIBE IN DETAIL]\n`;
              fileSummary.image++;
            } else if (documentExtensions.includes(extension)) {
              fileContents += `\n\n[DOCUMENT ${i + 1}: "${fileName}" - EXTRACT TEXT, SUMMARIZE KEY POINTS]\n`;
              fileSummary.document++;
            } else {
              fileContents += `\n\n[BINARY FILE ${i + 1}: "${fileName}" (${extension}) - PROVIDE METADATA]\n`;
              fileSummary.other++;
            }
          } catch (error) {
            console.error('Error reading file:', error);
            fileContents += `\n\n[ERROR: Could not read "${fileUrl.split('/').pop()}"]\n`;
          }
        }

        // Add synthesis instruction if multiple files
        if (fileUrls.length > 1) {
          const fileTypesList = [];
          if (fileSummary.text > 0) fileTypesList.push(`${fileSummary.text} text file${fileSummary.text > 1 ? 's' : ''}`);
          if (fileSummary.image > 0) fileTypesList.push(`${fileSummary.image} image${fileSummary.image > 1 ? 's' : ''}`);
          if (fileSummary.document > 0) fileTypesList.push(`${fileSummary.document} document${fileSummary.document > 1 ? 's' : ''}`);
          if (fileSummary.other > 0) fileTypesList.push(`${fileSummary.other} other file${fileSummary.other > 1 ? 's' : ''}`);

          fileContents = `\n\n[MULTI-FILE REQUEST: ${fileUrls.length} files provided - ${fileTypesList.join(', ')}]\n[INSTRUCTION: Analyze each file according to its type, then synthesize findings into a cohesive response]\n` + fileContents;
        }
      }

      const messageWithFiles = content ? `${content}${fileContents}` : fileContents || 'User sent file(s)';

      // Create user message
      const userMessage = {
        conversation_id: conversationId,
        role: 'user',
        content: content || '📎 Sent file(s)',
        file_urls: fileUrls,
        timestamp: new Date().toISOString(),
        created_by: user.email
      };

      if (isGuestMode) {
        userMessage.id = 'guest_msg_' + Date.now();
      } else {
        const savedUserMessage = await base44.entities.Message.create(userMessage);
        userMessage.id = savedUserMessage.id;
      }

      // Get AI response from CAOS server
      const history = convMessages.map(msg => {
        let content = msg.content;

        // Add reactions context
        if (msg.reactions && msg.reactions.length > 0) {
          const reactionsText = msg.reactions.map(r => 
            `[User reacted ${r.emoji} to: "${r.selected_text}"]`
          ).join('\n');
          content += '\n' + reactionsText;
        }

        // Add replies context
        if (msg.replies && msg.replies.length > 0) {
          const repliesText = msg.replies.map(r => 
            `[User replied to "${r.selected_text}": ${r.user_reply}]\n[CAOS responded: ${r.ai_response}]`
          ).join('\n');
          content += '\n' + repliesText;
        }

        return {
          role: msg.role,
          content: content
        };
      });

      const rememberConversations = localStorage.getItem('caos_remember_conversations') !== 'false';

      // CAOS-A1 Session-Implied Recall: Session continuity is ephemeral context, always allowed
      // Cross-session recall requires explicit keywords
      const memoryKeywords = ['earlier', 'before', 'previously', 'last time', 'you said', 'i said', 'what did', 'remember', 'recall'];
      const hasExplicitRecallQuery = memoryKeywords.some(kw => messageWithFiles.toLowerCase().includes(kw));

      // Session recall: implicit (L4 raw, session-bounded)
      // Cross-session recall: explicit request only (L2 reconstructive)
      const memory_gate = {
        allowed: rememberConversations,
        scope: 'session',
        explicit_recall: hasExplicitRecallQuery,
        reason: rememberConversations 
          ? (hasExplicitRecallQuery ? 'Explicit recall requested' : 'Session continuity enabled') 
          : 'Memory disabled by user'
      };

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const caosResponse = await fetch("https://nonextractive-son-ichnographical.ngrok-free.dev/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageWithFiles,
          session: conversationId,
          memory_gate: memory_gate,
          images: images.length > 0 ? images : undefined,
          capabilities: {
            file_operations: {
              read: true,
              create: true,
              modify: true,
              description: "Files are provided by the UI/caller. You can read provided files and create new files as output."
            },
            vision: images.length > 0,
            internet_access: memory_gate.allowed && memory_gate.explicit_recall
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!caosResponse.ok) {
        throw new Error(`Server error: ${caosResponse.status}`);
      }

      const data = await caosResponse.json();

      // CAOS-A1 Contract: Verify session alignment
      if (data.session && data.session !== conversationId) {
        console.error('SESSION DESYNC:', { expected: conversationId, received: data.session });
        toast.error('Session mismatch detected. Please refresh.');
        return;
      }

      const response = data.reply;

      // Create AI message
      const aiMessage = {
        conversation_id: conversationId,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        created_by: user.email
      };

      if (isGuestMode) {
        aiMessage.id = 'guest_msg_' + Date.now() + '_ai';
      } else {
        const savedAiMessage = await base44.entities.Message.create(aiMessage);
        aiMessage.id = savedAiMessage.id;
      }

      const updatedMessages = { ...messages, [conversationId]: [...convMessages, userMessage, aiMessage] };
      setMessages(updatedMessages);

      // Update conversation with sort order
      const updatedConvo = {
        ...conversation,
        last_message_preview: response.substring(0, 100),
        last_message_time: new Date().toISOString()
      };
      const updatedConvos = [
        updatedConvo,
        ...conversations.filter(c => c.id !== conversationId)
      ];
      setConversations(updatedConvos);

      if (isGuestMode) {
        localStorage.setItem('caos_guest_messages', JSON.stringify(updatedMessages));
        localStorage.setItem('caos_guest_conversations', JSON.stringify(updatedConvos));
      } else {
        await base44.entities.Conversation.update(conversationId, {
          last_message_preview: response.substring(0, 100),
          last_message_time: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Show more specific error messages
      if (error.name === 'AbortError') {
        toast.error('Request timed out after 60 seconds. The server may be processing a large file.');
      } else if (error.message.includes('Failed to fetch')) {
        toast.error('Cannot reach CAOS server. Please check if the server is running.');
      } else if (error.message.includes('Server error')) {
        toast.error('Server error. The message may be too large or malformed.');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!dataLoaded) {
    return (
      <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center">
        <StarfieldBackground />
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }



  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col overflow-hidden">
      <div className="fixed inset-0 z-0">
        <StarfieldBackground />
      </div>

      <div className="relative z-30 bg-[#0a1628] flex-shrink-0">
        <ChatHeader 
          user={user}
          onNewThread={handleNewThread}
          onShowThreads={() => setShowThreads(true)}
          onShowProfile={() => setShowProfile(true)}
          currentConversation={conversations.find(c => c.id === currentConversationId)}
        />
      </div>

      <div className={`relative flex-1 z-20 overflow-hidden ${isDeveloperMode ? 'flex flex-col md:flex-row' : 'flex flex-col'}`}>
        {/* Chat Section */}
        <div className={`relative flex flex-col overflow-hidden ${
          isDeveloperMode 
            ? 'h-1/2 md:h-full md:w-1/2 md:border-r md:border-white/10' 
            : multiAgentMode 
              ? 'h-3/4 w-full' 
              : 'h-full w-full'
        }`}>
          <div className={`flex-1 overflow-y-auto overflow-x-hidden ${multiAgentMode ? 'pb-28' : 'pb-24'}`}>
            <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4">
              {currentMessages.length === 0 && !isLoading && (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <WelcomeGreeting />
                </div>
              )}

              {currentMessages.map((message) => (
                <ChatBubble 
                  key={message.id} 
                  message={message} 
                  isUser={message.role === 'user'}
                  onUpdateMessage={handleUpdateMessage}
                  closeMenuTrigger={closeMenuTrigger}
                />
              ))}

              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-500/30 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/80 to-transparent pt-8 pb-12 pointer-events-none">
            <div className="pointer-events-auto pb-6">
              <ChatInput 
                onSend={handleSendMessage} 
                isLoading={isLoading}
                lastAssistantMessage={currentMessages?.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
                onTypingStart={() => setCloseMenuTrigger(prev => prev + 1)}
                multiAgentMode={multiAgentMode}
              />
            </div>

            {/* Generated Files Panel - Below Input Bar */}
            {generatedFiles.length > 0 && (
              <div className="pointer-events-auto max-w-4xl mx-auto px-4 mt-3">
                <div className="bg-[#0f1f3d]/95 backdrop-blur-xl border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-white/50 mb-2 flex items-center gap-2">
                    <span>📁</span> Generated Files
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {generatedFiles.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const blob = new Blob([file.content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = file.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded px-3 py-2 text-left transition-colors group"
                      >
                        <span className="text-blue-400">📄</span>
                        <span className="text-white/80 text-sm flex-1 truncate">{file.name}</span>
                        <span className="text-white/40 text-xs group-hover:text-white/60">Download</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Blackboard Below Input - Only in multi-agent mode WITHOUT developer mode */}
        {multiAgentMode && !isDeveloperMode && (
          <div className="h-1/4 w-full border-t border-white/10 bg-[#0a1628]/50 backdrop-blur-sm overflow-y-auto">
            <div className="text-center pt-2 pb-1">
              <div className="inline-block text-white/60 text-xs font-medium px-4 py-1 bg-white/5 border border-white/10 rounded-full">
                📋 Blackboard
              </div>
            </div>
            <div className="p-4 pt-2">
              <div className="space-y-3 text-sm">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                  <div className="text-blue-300 font-medium text-xs mb-1">ARCHITECT</div>
                  <div className="text-white/70 text-xs">No entries yet</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                  <div className="text-red-300 font-medium text-xs mb-1">SECURITY</div>
                  <div className="text-white/70 text-xs">No entries yet</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                  <div className="text-green-300 font-medium text-xs mb-1">ENGINEER</div>
                  <div className="text-white/70 text-xs">No entries yet</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                  <div className="text-yellow-300 font-medium text-xs mb-1">QA</div>
                  <div className="text-white/70 text-xs">No entries yet</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2">
                  <div className="text-purple-300 font-medium text-xs mb-1">DOCS</div>
                  <div className="text-white/70 text-xs">No entries yet</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Blackboard + Terminal - Only in developer mode */}
        {isDeveloperMode && (
          <div className="h-1/2 md:h-full md:w-1/2 flex flex-col">
            {/* Blackboard Section - Only show if multi-agent mode */}
            {multiAgentMode && (
            <div className="h-1/3 border-b border-white/10 bg-[#0a1628]/50 backdrop-blur-sm overflow-y-auto">
              <div className="text-center pt-2 pb-1">
                <div className="inline-block text-white/60 text-xs font-medium px-4 py-1 bg-white/5 border border-white/10 rounded-full">
                  📋 Blackboard
                </div>
              </div>
              <div className="p-4 pt-2">
                <div className="space-y-3 text-sm">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                    <div className="text-blue-300 font-medium text-xs mb-1">ARCHITECT</div>
                    <div className="text-white/70 text-xs">No entries yet</div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                    <div className="text-red-300 font-medium text-xs mb-1">SECURITY</div>
                    <div className="text-white/70 text-xs">No entries yet</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                    <div className="text-green-300 font-medium text-xs mb-1">ENGINEER</div>
                    <div className="text-white/70 text-xs">No entries yet</div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                    <div className="text-yellow-300 font-medium text-xs mb-1">QA</div>
                    <div className="text-white/70 text-xs">No entries yet</div>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2">
                    <div className="text-purple-300 font-medium text-xs mb-1">DOCS</div>
                    <div className="text-white/70 text-xs">No entries yet</div>
                  </div>
                </div>
              </div>
              </div>
              )}

              {/* Terminal Section */}
              <div className={multiAgentMode ? "h-2/3" : "h-full"}>
            <CodeTerminal onClose={() => {
              localStorage.setItem('caos_developer_mode', 'false');
              window.location.reload();
            }} />
            </div>
            </div>
            )}
      </div>

      <ThreadList
        isOpen={showThreads}
        onClose={() => setShowThreads(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => {
          setCurrentConversationId(id);
          localStorage.setItem('caos_last_conversation', id);
          handleSessionResume(id);
        }}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />

      <ProfilePanel
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
        multiAgentMode={multiAgentMode}
        onMultiAgentModeChange={(enabled) => {
          setMultiAgentMode(enabled);
          localStorage.setItem('caos_multi_agent_mode', enabled);
        }}
      />

      <Dialog open={showToken} onOpenChange={setShowToken}>
        <DialogContent className="bg-[#0f1f3d]/95 backdrop-blur-xl border-white/10 text-white max-w-3xl">
          <ContinuityToken
            sessionId={currentConversationId}
            userId={user?.email}
            conversationMeta={{
              title: conversations.find(c => c.id === currentConversationId)?.title,
              message_count: currentMessages.length,
              last_message_time: conversations.find(c => c.id === currentConversationId)?.last_message_time
            }}
            messages={currentMessages}
          />
        </DialogContent>
      </Dialog>
      </div>
      );
      }