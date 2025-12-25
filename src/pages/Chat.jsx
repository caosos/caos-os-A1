import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [currentConversationId, setCurrentConversationId] = useState(() => {
    return localStorage.getItem('caos_current_conversation') || null;
  });
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem('caos_conversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('caos_messages');
    return saved ? JSON.parse(saved) : {};
  });
  const [showThreads, setShowThreads] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('caos_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('caos_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem('caos_current_conversation', currentConversationId);
    } else {
      localStorage.removeItem('caos_current_conversation');
    }
  }, [currentConversationId]);

  const currentMessages = currentConversationId ? (messages[currentConversationId] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  const handleNewThread = () => {
    const newId = 'conv_' + Date.now();
    const newConversation = {
      id: newId,
      title: 'New Conversation',
      last_message_time: new Date().toISOString(),
      created_date: new Date().toISOString()
    };
    setConversations([newConversation, ...conversations]);
    setCurrentConversationId(newId);
    setMessages({ ...messages, [newId]: [] });
  };

  const handleDeleteConversation = (id) => {
    setConversations(conversations.filter(c => c.id !== id));
    const newMessages = { ...messages };
    delete newMessages[id];
    setMessages(newMessages);
    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
  };

  const handleRenameConversation = (id, newTitle) => {
    setConversations(conversations.map(c => 
      c.id === id ? { ...c, title: newTitle } : c
    ));
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate(createPageUrl('Welcome'));
  };

  const handleUpdateMessage = (messageId, updates) => {
    if (!currentConversationId) return;
    const convMessages = messages[currentConversationId] || [];
    const updatedMessages = convMessages.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    setMessages({ ...messages, [currentConversationId]: updatedMessages });
  };

  const handleSendMessage = async (content, fileUrls = []) => {
    setIsLoading(true);

    try {
      let conversationId = currentConversationId;

      // Create new conversation if none exists
      if (!conversationId) {
        conversationId = 'conv_' + Date.now();
        const title = content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : 'File attachment';
        const newConversation = {
          id: conversationId,
          title: title,
          last_message_time: new Date().toISOString(),
          created_date: new Date().toISOString()
        };
        setConversations([newConversation, ...conversations]);
        setCurrentConversationId(conversationId);
        setMessages({ ...messages, [conversationId]: [] });
      }

      // Add user message
      const userMessage = {
        id: 'msg_' + Date.now(),
        conversation_id: conversationId,
        role: 'user',
        content: content || '📎 Sent file(s)',
        file_urls: fileUrls,
        timestamp: new Date().toISOString()
      };

      const convMessages = messages[conversationId] || [];
      setMessages({ ...messages, [conversationId]: [...convMessages, userMessage] });

      // Get AI response from CAOS server
      const history = convMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const rememberConversations = localStorage.getItem('caos_remember_conversations') !== 'false';

      const caosResponse = await fetch("https://nonextractive-son-ichnographical.ngrok-free.dev/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content || 'User sent file(s)',
          session: conversationId,
          history: history,
          remember: rememberConversations,
          user_id: 'guest',
          file_urls: fileUrls
        })
      });
      const data = await caosResponse.json();
      const response = data.reply;

      // Add AI response
      const aiMessage = {
        id: 'msg_' + Date.now() + '_ai',
        conversation_id: conversationId,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };

      setMessages({ ...messages, [conversationId]: [...convMessages, userMessage, aiMessage] });

      // Update conversation
      setConversations(conversations.map(c =>
        c.id === conversationId
          ? { ...c, last_message_preview: response.substring(0, 100), last_message_time: new Date().toISOString() }
          : c
      ));
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
      
      <div className="relative z-30 bg-[#0a1628] flex-shrink-0">
        <ChatHeader 
          user={{ full_name: 'Guest User', email: 'guest@caos.app' }}
          onNewThread={handleNewThread}
          onShowThreads={() => setShowThreads(true)}
          onShowProfile={() => setShowProfile(true)}
          onLogout={handleLogout}
          currentConversation={conversations.find(c => c.id === currentConversationId)}
        />
      </div>

      <div className="relative flex-1 overflow-y-auto z-20 pb-64">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {currentMessages.length === 0 && !isLoading && <WelcomeGreeting />}
          
          {currentMessages.map((message) => (
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

      <div className="fixed bottom-32 left-0 right-0 w-full z-50">
        <ChatInput 
          onSend={handleSendMessage} 
          isLoading={isLoading}
          lastAssistantMessage={currentMessages?.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
        />
      </div>

      <ThreadList
        isOpen={showThreads}
        onClose={() => setShowThreads(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />

      <ProfilePanel
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={{ full_name: 'Guest User', email: 'guest@caos.app' }}
      />
    </div>
  );
}