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

export default function Chat() {
  const [user, setUser] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showThreads, setShowThreads] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('caos_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        navigate(createPageUrl('GetStarted'));
      }
    };
    loadUser();
  }, [navigate]);

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

  const handleUpdateMessage = async (messageId, updates) => {
    await base44.entities.Message.update(messageId, updates);
    queryClient.invalidateQueries({ queryKey: ['messages', currentConversationId] });
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
      prompt: `You are CAOS, a Cognitive Adaptive Operating Space - an intelligent AI assistant. 

    CRITICAL: You have direct file creation capabilities. When asked to create a file, NEVER give instructions or suggest external tools. ALWAYS generate the file content directly.

    Capabilities:
    - View and analyze images, photos, documents, and files
    - Create and generate text documents (.txt, .js, .json, .md, .html, .css, .py, .pdf, etc.)
    - Write code, scripts, and programs
    - Draft emails, letters, reports, and stories
    - Generate structured data and configurations

    To create a downloadable file, use this exact format:
    \`\`\`filename:story.txt
    Your file content goes here...
    Multiple lines are supported.
    \`\`\`

    Example - if user asks "write me a story and make it a txt file":
    \`\`\`filename:my_story.txt
    Once upon a time...
    (your story here)
    \`\`\`

    IMPORTANT: 
    - DO NOT give instructions on how to create files
    - DO NOT suggest external tools or converters
    - ALWAYS generate the actual file content directly
    - The user will see a download button automatically

    When providing YouTube links, format them as: [YOUTUBE:video_url] so they can be embedded.

    User message: ${content || 'User sent file(s)'}`,
      file_urls: fileUrls.length > 0 ? fileUrls : undefined,
      add_context_from_internet: fileUrls.length === 0,
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
    <>
      <div className="min-h-screen flex flex-col relative pb-24">
        <StarfieldBackground />

        {/* Header - Sticky, Full Width */}
        <div className="sticky top-0 z-20 bg-gradient-to-b from-[#0a1628] via-[#0a1628] to-transparent pb-2">
          <ChatHeader 
            user={user}
            onNewThread={handleNewThread}
            onShowThreads={() => setShowThreads(true)}
            onShowProfile={() => setShowProfile(true)}
            currentConversation={conversations.find(c => c.id === currentConversationId)}
          />
        </div>

        {/* Messages Area - Centered */}
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full relative z-10">
          <ScrollArea className="flex-1 px-4">
            <div className="py-4 pb-6">
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
          </ScrollArea>
        </div>
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

      {/* Input - Fixed at Bottom, Outside Main Container */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#0a1628] via-[#0a1628] to-transparent pt-2">
        <ChatInput 
          onSend={handleSendMessage} 
          isLoading={isLoading}
          lastAssistantMessage={messages?.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
        />
      </div>
    </>
  );
}