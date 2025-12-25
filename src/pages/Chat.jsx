import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from "@/components/ui/scroll-area";
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import ThreadList from '@/components/chat/ThreadList';
import WelcomeGreeting from '@/components/chat/WelcomeGreeting';
import ProfilePanel from '@/components/chat/ProfilePanel';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(() => {
    return localStorage.getItem('caos_current_conversation') || null;
  });
  const [showThreads, setShowThreads] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (!isAuthenticated) {
          navigate(createPageUrl('Welcome'));
          return;
        }
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth error:', error);
        navigate(createPageUrl('Welcome'));
      }
    };
    loadUser();
  }, [navigate]);

  // Persist current conversation
  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem('caos_current_conversation', currentConversationId);
    } else {
      localStorage.removeItem('caos_current_conversation');
    }
  }, [currentConversationId]);

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => base44.entities.Conversation.list('-created_date'),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // Fetch messages for current conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', currentConversationId],
    queryFn: () => currentConversationId 
      ? base44.entities.Message.filter({ conversation_id: currentConversationId }, 'created_date')
      : Promise.resolve([]),
    enabled: !!currentConversationId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // Track last message for smart scrolling
  const lastMessageIdRef = useRef(null);
  
  // Only scroll to bottom when new messages are added, not when existing ones update
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage?.id;
    
    // Scroll only if this is a genuinely new message
    if (lastMessageId && lastMessageId !== lastMessageIdRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      lastMessageIdRef.current = lastMessageId;
    }
  }, [messages]);

  const handleNewThread = async () => {
    const newConversation = await base44.entities.Conversation.create({
      title: 'New Conversation',
      last_message_time: new Date().toISOString(),
    });
    setCurrentConversationId(newConversation.id);
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const handleDeleteConversation = async (id) => {
    // Delete all messages in the conversation
    const conversationMessages = await base44.entities.Message.filter({ conversation_id: id });
    for (const msg of conversationMessages) {
      await base44.entities.Message.delete(msg.id);
    }
    // Delete the conversation
    await base44.entities.Conversation.delete(id);

    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleRenameConversation = async (id, newTitle) => {
    await base44.entities.Conversation.update(id, { title: newTitle });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const handleUpdateMessage = async (messageId, updates) => {
    try {
      await base44.entities.Message.update(messageId, updates);
      queryClient.invalidateQueries({ queryKey: ['messages', currentConversationId] });
    } catch (error) {
      console.error('Error updating message:', error);
      // Refresh messages to sync with server state
      queryClient.invalidateQueries({ queryKey: ['messages', currentConversationId] });
    }
  };

  const handleSendMessage = async (content, fileUrls = []) => {
    setIsLoading(true);

    try {
      let conversationId = currentConversationId;

      // Create new conversation if none exists
      if (!conversationId) {
        const title = content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : 'File attachment';
        const newConversation = await base44.entities.Conversation.create({
          title: title,
          last_message_time: new Date().toISOString(),
        });
        conversationId = newConversation.id;
        setCurrentConversationId(conversationId);
      }

      // Save user message
      const userMessage = content || '📎 Sent file(s)';
      await base44.entities.Message.create({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        file_urls: fileUrls,
        timestamp: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });

      // Get user's memory preference
      const rememberConversations = localStorage.getItem('caos_remember_conversations') !== 'false';

      // Fetch conversation history for CAOS
      const conversationHistory = await base44.entities.Message.filter({ conversation_id: conversationId }, 'created_date');

      // Format history for CAOS (excluding the message we just added since we're sending it separately)
      const history = conversationHistory.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get AI response from CAOS server
      const caosResponse = await fetch("https://nonextractive-son-ichnographical.ngrok-free.dev/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content || 'User sent file(s)',
          session: conversationId,
          history: history,
          remember: rememberConversations,
          user_id: user?.id || 'guest',
          file_urls: fileUrls
        })
      });
      const data = await caosResponse.json();
      const response = data.reply;

      // Save AI response
      await base44.entities.Message.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      });

      // Update conversation
      await base44.entities.Conversation.update(conversationId, {
        last_message_preview: response.substring(0, 100),
        last_message_time: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <StarfieldBackground />
      </div>
      
      {/* Header */}
      <div className="relative z-30 bg-[#0a1628] flex-shrink-0">
        <ChatHeader 
          user={user}
          onNewThread={handleNewThread}
          onShowThreads={() => setShowThreads(true)}
          onShowProfile={() => setShowProfile(true)}
          onLogout={handleLogout}
          currentConversation={conversations.find(c => c.id === currentConversationId)}
        />
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto z-20 pb-64">
        <div className="max-w-2xl mx-auto px-4 py-4">
            {messages.length === 0 && !isLoading && <WelcomeGreeting />}
            
            {messages.map((message) => (
              <ChatBubble 
                key={message.id} 
                message={message} 
                isUser={message.role === 'user'}
                onUpdateMessage={handleUpdateMessage}
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

      {/* Input - Fixed higher up for mobile browser UI */}
      <div className="fixed bottom-32 left-0 right-0 w-full z-50">
        <ChatInput 
          onSend={handleSendMessage} 
          isLoading={isLoading}
          lastAssistantMessage={messages?.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
        />
      </div>

      {/* Thread List Sidebar */}
      <ThreadList
        isOpen={showThreads}
        onClose={() => setShowThreads(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
      />
    </div>
  );
}