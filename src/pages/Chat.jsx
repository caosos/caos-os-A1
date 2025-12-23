import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from "@/components/ui/scroll-area";
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import ThreadList from '@/components/chat/ThreadList';
import WelcomeGreeting from '@/components/chat/WelcomeGreeting';
import ProfilePanel from '@/components/chat/ProfilePanel';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showThreads, setShowThreads] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => base44.entities.Conversation.list('-created_date'),
  });

  // Fetch messages for current conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', currentConversationId],
    queryFn: () => currentConversationId 
      ? base44.entities.Message.filter({ conversation_id: currentConversationId }, 'created_date')
      : Promise.resolve([]),
    enabled: !!currentConversationId,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleSendMessage = async (content, fileUrls = []) => {
    setIsLoading(true);
    
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
      timestamp: new Date().toISOString(),
    });

    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });

    // Get AI response
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are CAOS, a Cognitive Adaptive Operating Space - an intelligent AI assistant. Be helpful, friendly, and concise. 

User message: ${content || 'User sent file(s)'}`,
      file_urls: fileUrls.length > 0 ? fileUrls : undefined,
    });

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
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <StarfieldBackground />
      
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full relative z-10">
        {/* Header */}
        <ChatHeader 
          user={user}
          onNewThread={handleNewThread}
          onShowThreads={() => setShowThreads(true)}
          onShowProfile={() => setShowProfile(true)}
        />
        
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4">
            <WelcomeGreeting />
            
            {messages.map((message) => (
              <ChatBubble 
                key={message.id} 
                message={message} 
                isUser={message.role === 'user'} 
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
        </ScrollArea>
        
        {/* Input */}
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