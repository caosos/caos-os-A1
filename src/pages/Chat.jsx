import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import ThreadList from '@/components/chat/ThreadList';
import WelcomeGreeting from '@/components/chat/WelcomeGreeting';
import ProfilePanel from '@/components/chat/ProfilePanel';
import CodeTerminal from '@/components/terminal/CodeTerminal';
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
  const [closeMenuTrigger, setCloseMenuTrigger] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  
  const isDeveloperMode = localStorage.getItem('caos_developer_mode') === 'true';

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
        const savedUser = localStorage.getItem('caos_user');
        
        if (!savedUser) {
          setDataLoaded(true);
          return;
        }

        const currentUser = JSON.parse(savedUser);
        setUser(currentUser);
        setDataLoaded(true);

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
        
        // Restore last conversation
        const lastConvId = localStorage.getItem('caos_last_conversation');
        if (lastConvId && userConvos.some(c => c.id === lastConvId)) {
          setCurrentConversationId(lastConvId);
          handleSessionResume(lastConvId);
        }
        
        setDataLoaded(true);
      } catch (error) {
        console.error('Error loading user data:', error);
        setDataLoaded(true);
      }
    };

    loadUserData();
  }, []);

  const currentMessages = currentConversationId ? (messages[currentConversationId] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  const handleNewThread = async () => {
    if (!user) return;

    try {
      const newConversation = await base44.entities.Conversation.create({
        title: 'New Conversation',
        last_message_time: new Date().toISOString(),
        created_by: user.email
      });
      setConversations([newConversation, ...conversations]);
      setCurrentConversationId(newConversation.id);
      localStorage.setItem('caos_last_conversation', newConversation.id);
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
    const updatedConvos = conversations.map(c => 
      c.id === id ? { ...c, title: newTitle } : c
    );
    setConversations(updatedConvos);

    try {
      await base44.entities.Conversation.update(id, { title: newTitle });
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast.error('Failed to rename thread');
    }
  };

  const handleSaveUser = async (userData) => {
    localStorage.setItem('caos_user', JSON.stringify(userData));
    setUser(userData);
    
    // Load conversations after user is set
    try {
      const userConvos = await base44.entities.Conversation.filter(
        { created_by: userData.email },
        '-last_message_time',
        100
      );
      setConversations(userConvos);

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
    } catch (error) {
      console.error('Error loading user data:', error);
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
      await base44.entities.Message.update(messageId, updates);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleSessionResume = async (sessionId) => {
    try {
      await fetch("https://nonextractive-son-ichnographical.ngrok-free.dev/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "__SESSION_RESUME__",
          session: sessionId
        })
      });
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

      const convMessages = messages[conversationId] || [];

      // Process files and prepare structured data
      let fileContents = '';
      const fileMetadata = [];
      
      if (fileUrls.length > 0) {
        for (const fileUrl of fileUrls) {
          try {
            const fileName = fileUrl.split('/').pop();
            const extension = fileName.split('.').pop()?.toLowerCase();
            
            // Check if it's a text-based file
            const textExtensions = ['txt', 'md', 'json', 'csv', 'log', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'html', 'css', 'xml', 'yaml', 'yml'];
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
            const documentExtensions = ['pdf', 'doc', 'docx'];
            
            if (textExtensions.includes(extension)) {
              // Read text files fully
              const response = await fetch(fileUrl);
              const text = await response.text();
              fileContents += `\n\n=== File: ${fileName} ===\n${text}\n=== End of ${fileName} ===\n`;
              fileMetadata.push({ url: fileUrl, name: fileName, type: 'text', extension });
            } else if (imageExtensions.includes(extension)) {
              fileContents += `\n\n[IMAGE: Please analyze and describe the image file "${fileName}"]\n`;
              fileMetadata.push({ url: fileUrl, name: fileName, type: 'image', extension });
            } else if (documentExtensions.includes(extension)) {
              fileContents += `\n\n[DOCUMENT: Please extract and analyze content from "${fileName}"]\n`;
              fileMetadata.push({ url: fileUrl, name: fileName, type: 'document', extension });
            } else {
              fileContents += `\n\n[BINARY FILE: "${fileName}" - type: ${extension}]\n`;
              fileMetadata.push({ url: fileUrl, name: fileName, type: 'binary', extension });
            }
          } catch (error) {
            console.error('Error reading file:', error);
            fileContents += `\n\n[Could not read file: ${fileUrl.split('/').pop()}]\n`;
          }
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

      const savedUserMessage = await base44.entities.Message.create(userMessage);
      userMessage.id = savedUserMessage.id;

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

      const caosResponse = await fetch("https://nonextractive-son-ichnographical.ngrok-free.dev/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageWithFiles,
          session: conversationId,
          history: history,
          remember: rememberConversations,
          user_id: user?.email || 'guest',
          files: fileMetadata,
          mode: "conversation",
          intent: "normal"
        })
      });

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

      const savedAiMessage = await base44.entities.Message.create(aiMessage);
      aiMessage.id = savedAiMessage.id;

      setMessages(prev => ({ ...prev, [conversationId]: [...convMessages, userMessage, aiMessage] }));

      // Update conversation
      const updatedConvos = conversations.map(c =>
        c.id === conversationId
          ? { ...c, last_message_preview: response.substring(0, 100), last_message_time: new Date().toISOString() }
          : c
      );
      setConversations(updatedConvos);

      await base44.entities.Conversation.update(conversationId, {
        last_message_preview: response.substring(0, 100),
        last_message_time: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending message:', error);

      // Show more specific error messages
      if (error.message.includes('Failed to fetch')) {
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

  if (!user) {
    return (
      <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center">
        <StarfieldBackground />
        <div className="relative z-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-light text-white text-center mb-6">Welcome to CAOS</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleSaveUser({
              full_name: formData.get('name'),
              email: formData.get('email')
            });
          }} className="space-y-4">
            <div>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
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
        <div className={`relative flex flex-col overflow-hidden ${isDeveloperMode ? 'h-1/2 md:h-full md:w-1/2 md:border-r md:border-white/10' : 'h-full w-full'}`}>
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
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

          <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/80 to-transparent pt-8">
            <ChatInput 
              onSend={handleSendMessage} 
              isLoading={isLoading}
              lastAssistantMessage={currentMessages?.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
              onTypingStart={() => setCloseMenuTrigger(prev => prev + 1)}
            />
          </div>
        </div>

        {/* Terminal Section */}
        {isDeveloperMode && (
          <div className={`${isDeveloperMode ? 'h-1/2 md:h-full md:w-1/2' : ''}`}>
            <CodeTerminal onClose={() => {
              localStorage.setItem('caos_developer_mode', 'false');
              window.location.reload();
            }} />
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
      />
    </div>
  );
  }