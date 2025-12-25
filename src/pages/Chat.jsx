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
import { base44 } from '@/api/base44Client';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [showThreads, setShowThreads] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Load user and their data
  useEffect(() => {
    const loadUserData = async () => {
      try {
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
        base44.auth.redirectToLogin();
      }
    };

    loadUserData();
  }, []);

  const currentMessages = currentConversationId ? (messages[currentConversationId] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  const handleNewThread = async () => {
    try {
      const newConversation = await base44.entities.Conversation.create({
        title: 'New Conversation',
        last_message_time: new Date().toISOString()
      });
      setConversations([newConversation, ...conversations]);
      setCurrentConversationId(newConversation.id);
      setMessages({ ...messages, [newConversation.id]: [] });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create new thread');
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
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
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete thread');
    }
  };

  const handleRenameConversation = async (id, newTitle) => {
    try {
      await base44.entities.Conversation.update(id, { title: newTitle });
      setConversations(conversations.map(c => 
        c.id === id ? { ...c, title: newTitle } : c
      ));
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast.error('Failed to rename thread');
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const handleUpdateMessage = async (messageId, updates) => {
    if (!currentConversationId) return;
    try {
      await base44.entities.Message.update(messageId, updates);
      const convMessages = messages[currentConversationId] || [];
      const updatedMessages = convMessages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      setMessages({ ...messages, [currentConversationId]: updatedMessages });
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleSendMessage = async (content, fileUrls = []) => {
    setIsLoading(true);

    try {
      let conversationId = currentConversationId;
      let conversation = conversations.find(c => c.id === conversationId);

      // Create new conversation if none exists
      if (!conversationId) {
        const title = content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : 'File attachment';
        conversation = await base44.entities.Conversation.create({
          title: title,
          last_message_time: new Date().toISOString()
        });
        conversationId = conversation.id;
        setConversations([conversation, ...conversations]);
        setCurrentConversationId(conversationId);
        setMessages({ ...messages, [conversationId]: [] });
      }

      const convMessages = messages[conversationId] || [];

      // Save user message to database
      const userMessage = await base44.entities.Message.create({
        conversation_id: conversationId,
        role: 'user',
        content: content || '📎 Sent file(s)',
        file_urls: fileUrls,
        timestamp: new Date().toISOString()
      });

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
          user_id: user?.email || 'guest',
          file_urls: fileUrls,
          mode: "conversation",
          intent: "normal"
        })
      });
      const data = await caosResponse.json();
      const response = data.reply;

      // Save AI response to database
      const aiMessage = await base44.entities.Message.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      });

      setMessages({ ...messages, [conversationId]: [...convMessages, userMessage, aiMessage] });

      // Update conversation
      await base44.entities.Conversation.update(conversationId, {
        last_message_preview: response.substring(0, 100),
        last_message_time: new Date().toISOString()
      });

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
      <div className="absolute inset-0 z-0">
        <StarfieldBackground />
      </div>
      
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
        user={user}
      />
    </div>
  );
}