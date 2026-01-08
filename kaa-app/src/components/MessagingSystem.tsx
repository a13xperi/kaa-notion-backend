import React, { useState, useEffect, useRef } from 'react';
import logger from '../utils/logger';
import './MessagingSystem.css';

interface Message {
  id: string;
  sender: string;
  senderType: 'client' | 'team';
  recipient: string;
  recipientType: 'client' | 'team';
  content: string;
  timestamp: string;
  read: boolean;
  projectId?: string;
  attachments?: string[];
}

interface MessagingSystemProps {
  currentUser: string;
  userType: 'client' | 'team';
  projectId?: string;
  onClose?: () => void; // Optional - not needed when used in workspace
}

const MessagingSystem: React.FC<MessagingSystemProps> = ({ 
  currentUser, 
  userType, 
  projectId, 
  onClose 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string>('');
  const [conversations, setConversations] = useState<{[key: string]: {name: string, lastMessage: string, unread: number, isSage?: boolean}}>({});
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = () => {
    // Demo conversations - in production, this would come from the API
    // Sage is always first
    const demoConversations = {
      'sage': {
        name: 'Sage',
        lastMessage: 'How can I help you today?',
        unread: 0,
        isSage: true
      },
      'team-demo': {
        name: userType === 'client' ? 'Project Manager (Demo)' : 'Demo Project Address',
        lastMessage: userType === 'client' ? 'Thanks for the upload!' : 'I uploaded the permit application',
        unread: userType === 'client' ? 0 : 1,
        isSage: false
      },
      'team-alex': {
        name: userType === 'client' ? 'Alex - Project Manager' : '123 Main Street Client',
        lastMessage: userType === 'client' ? 'The design review is ready' : 'When will the design be ready?',
        unread: userType === 'client' ? 1 : 0,
        isSage: false
      },
      'team-sarah': {
        name: userType === 'client' ? 'Sarah - Designer' : '456 Oak Avenue Client',
        lastMessage: userType === 'client' ? 'New mockups uploaded' : 'Love the new design!',
        unread: 0,
        isSage: false
      }
    };
    setConversations(demoConversations);
    
    // Set Sage as default selected conversation if none selected
    if (!selectedConversation) {
      setSelectedConversation('sage');
    }
  };

  const loadMessages = (conversationId: string) => {
    // Different messages for each conversation
    let demoMessages: Message[] = [];
    
    if (conversationId === 'sage') {
      // Sage conversation - starts with welcome message
      demoMessages = [
        {
          id: 'sage-1',
          sender: 'Sage',
          senderType: 'team',
          recipient: currentUser,
          recipientType: userType,
          content: `Hello ${currentUser}! 👋 I'm Sage, your AI assistant. I'm here to help you with:\n\n• Navigating the Client Portal\n• Answering questions about your project\n• Explaining features and pricing tiers\n• Connecting you with your support team\n\nHow can I help you today?`,
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          read: true,
          projectId: projectId
        }
      ];
    } else if (conversationId === 'team-demo') {
      // Project Manager (Demo) conversation
      demoMessages = [
        {
          id: '1',
          sender: userType === 'client' ? currentUser : 'Project Manager (Demo)',
          senderType: userType === 'client' ? 'client' : 'team',
          recipient: userType === 'client' ? 'Project Manager (Demo)' : currentUser,
          recipientType: userType === 'client' ? 'team' : 'client',
          content: userType === 'client' ? 'Hello! I have a question about the project timeline.' : 'Hello! How can I help you today?',
          timestamp: '2024-10-05T10:30:00Z',
          read: true,
          projectId: projectId
        },
        {
          id: '2',
          sender: userType === 'client' ? 'Project Manager (Demo)' : currentUser,
          senderType: userType === 'client' ? 'team' : 'client',
          recipient: userType === 'client' ? currentUser : 'Project Manager (Demo)',
          recipientType: userType === 'client' ? 'client' : 'team',
          content: userType === 'client' ? 'Of course! The project is on track and we should be done by next month.' : 'Great! I uploaded the permit application yesterday.',
          timestamp: '2024-10-05T10:32:00Z',
          read: true,
          projectId: projectId
        },
        {
          id: '3',
          sender: userType === 'client' ? currentUser : 'Project Manager (Demo)',
          senderType: userType === 'client' ? 'client' : 'team',
          recipient: userType === 'client' ? 'Project Manager (Demo)' : currentUser,
          recipientType: userType === 'client' ? 'team' : 'client',
          content: userType === 'client' ? 'Perfect! Thanks for the update.' : 'Thanks for the update!',
          timestamp: '2024-10-05T10:35:00Z',
          read: userType === 'client' ? true : false,
          projectId: projectId
        }
      ];
    } else if (conversationId === 'team-alex') {
      // Alex conversation
      demoMessages = [
        {
          id: 'alex-1',
          sender: userType === 'client' ? currentUser : 'Alex - Project Manager',
          senderType: userType === 'client' ? 'client' : 'team',
          recipient: userType === 'client' ? 'Alex - Project Manager' : currentUser,
          recipientType: userType === 'client' ? 'team' : 'client',
          content: userType === 'client' ? 'Hi Alex, when will the design review be ready?' : 'Hi! I have a question about the design timeline.',
          timestamp: '2024-10-06T09:15:00Z',
          read: true,
          projectId: projectId
        },
        {
          id: 'alex-2',
          sender: userType === 'client' ? 'Alex - Project Manager' : currentUser,
          senderType: userType === 'client' ? 'team' : 'client',
          recipient: userType === 'client' ? currentUser : 'Alex - Project Manager',
          recipientType: userType === 'client' ? 'client' : 'team',
          content: userType === 'client' ? 'The design review is ready! I\'ll send it over shortly.' : 'The design review should be ready by end of week.',
          timestamp: '2024-10-06T09:20:00Z',
          read: userType === 'client' ? false : true,
          projectId: projectId
        }
      ];
    } else if (conversationId === 'team-sarah') {
      // Sarah conversation
      demoMessages = [
        {
          id: 'sarah-1',
          sender: userType === 'client' ? 'Sarah - Designer' : currentUser,
          senderType: userType === 'client' ? 'team' : 'client',
          recipient: userType === 'client' ? currentUser : 'Sarah - Designer',
          recipientType: userType === 'client' ? 'client' : 'team',
          content: userType === 'client' ? 'New mockups uploaded' : 'I uploaded the new mockups for review.',
          timestamp: '2024-10-07T14:30:00Z',
          read: true,
          projectId: projectId
        },
        {
          id: 'sarah-2',
          sender: userType === 'client' ? currentUser : 'Sarah - Designer',
          senderType: userType === 'client' ? 'client' : 'team',
          recipient: userType === 'client' ? 'Sarah - Designer' : currentUser,
          recipientType: userType === 'client' ? 'team' : 'client',
          content: userType === 'client' ? 'Love the new design!' : 'The new mockups look great!',
          timestamp: '2024-10-07T15:00:00Z',
          read: true,
          projectId: projectId
        }
      ];
    }
    
    setMessages(demoMessages);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setIsLoading(true);
    const messageContent = newMessage.trim();
    
    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: currentUser,
      senderType: userType,
      recipient: conversations[selectedConversation].name,
      recipientType: userType === 'client' ? 'team' : 'client',
      content: messageContent,
      timestamp: new Date().toISOString(),
      read: false,
      projectId: projectId
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    
    // Update conversation last message
    setConversations(prev => ({
      ...prev,
      [selectedConversation]: {
        ...prev[selectedConversation],
        lastMessage: messageContent,
        unread: prev[selectedConversation].unread + (userType === 'client' ? 0 : 1)
      }
    }));

    setNewMessage('');

    // If this is Sage conversation, get ChatGPT response
    if (selectedConversation === 'sage') {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        
        // Prepare conversation history (last 10 messages for context)
        const conversationHistory = messages.slice(-10).map(msg => ({
          type: msg.sender === 'Sage' ? 'sage' : 'user',
          content: msg.content
        }));

        // Check if user is asking about support agents or pricing
        const lowerMessage = messageContent.toLowerCase();
        const isAskingAboutSupport = lowerMessage.includes('support') || 
                                     lowerMessage.includes('agent') || 
                                     lowerMessage.includes('tier') || 
                                     lowerMessage.includes('pricing') ||
                                     lowerMessage.includes('plan') ||
                                     lowerMessage.includes('price');

        const response = await fetch(`${apiUrl}/api/sage/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageContent,
            conversationHistory,
            clientAddress: currentUser,
            mode: userType === 'client' ? 'client' : 'team',
            currentView: 'messages',
            onboardingActive: false,
            onboardingStep: 0,
            isAskingAboutSupport: isAskingAboutSupport
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let sageResponseContent = data.response || 'I apologize, but I encountered an error. Please try again.';
          
          // If asking about support agents, enhance response with pricing tier info
          if (isAskingAboutSupport && !sageResponseContent.includes('Tier')) {
            sageResponseContent += `\n\n**Our Service Tiers:**\n\n` +
              `**Tier 1 - The Concept** 🤖\n` +
              `• Fully automated, no-touch service\n` +
              `• Perfect for straightforward projects\n` +
              `• Fast turnaround, fixed pricing\n\n` +
              `**Tier 2 - The Builder** 📞\n` +
              `• Systematized with designer checkpoints\n` +
              `• Low-touch service with review and refinement\n` +
              `• Great balance of efficiency and personalization\n\n` +
              `**Tier 3 - The Concierge** 👟\n` +
              `• Includes physical site visits\n` +
              `• Hybrid of tech efficiency + boots on the ground\n` +
              `• More hands-on support\n\n` +
              `**Tier 4 - KAA White Glove** 💎\n` +
              `• Premium white glove service\n` +
              `• Full-service landscape architecture\n` +
              `• We choose the clients (exclusive)\n` +
              `• Percentage of install pricing\n\n` +
              `Would you like to know more about any specific tier?`;
          }
          
          const sageResponse: Message = {
            id: (Date.now() + 1).toString(),
            sender: 'Sage',
            senderType: 'team',
            recipient: currentUser,
            recipientType: userType,
            content: sageResponseContent,
            timestamp: new Date().toISOString(),
            read: false,
            projectId: projectId
          };
          
          setMessages(prev => [...prev, sageResponse]);
          
          // Update conversation last message with Sage's response
          setConversations(prev => ({
            ...prev,
            [selectedConversation]: {
              ...prev[selectedConversation],
              lastMessage: sageResponseContent.substring(0, 50) + (sageResponseContent.length > 50 ? '...' : ''),
              unread: 0
            }
          }));
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (error) {
        logger.error('Error calling Sage ChatGPT API:', error);
        
        // Fallback response
        const fallbackResponse: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'Sage',
          senderType: 'team',
          recipient: currentUser,
          recipientType: userType,
          content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment, or contact your project manager directly.',
          timestamp: new Date().toISOString(),
          read: false,
          projectId: projectId
        };
        
        setMessages(prev => [...prev, fallbackResponse]);
      }
    } else {
      // For non-Sage conversations, simulate a response (in production, this would come from the API)
      setTimeout(() => {
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: conversations[selectedConversation].name,
          senderType: userType === 'client' ? 'team' : 'client',
          recipient: currentUser,
          recipientType: userType,
          content: `Thanks for your message! I'll get back to you soon.`,
          timestamp: new Date().toISOString(),
          read: false,
          projectId: projectId
        };
        
        setMessages(prev => [...prev, responseMessage]);
        
        setConversations(prev => ({
          ...prev,
          [selectedConversation]: {
            ...prev[selectedConversation],
            lastMessage: responseMessage.content,
            unread: userType === 'client' ? 0 : 1
          }
        }));
      }, 1500);
    }

    setIsLoading(false);
    logger.info('Sending message:', userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="messaging-system">
      <div className="messaging-content">
        {/* Conversations Sidebar */}
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h3>Conversations</h3>
            <button className="new-conversation-btn">+ New</button>
          </div>
          <div className="conversations-list">
            {Object.entries(conversations).map(([id, conversation]) => (
              <div
                key={id}
                className={`conversation-item ${selectedConversation === id ? 'active' : ''} ${conversation.isSage ? 'sage-conversation' : ''}`}
                onClick={() => {
                  setSelectedConversation(id);
                }}
              >
                <div className={`conversation-avatar ${conversation.isSage ? 'sage-avatar' : ''}`}>
                  {conversation.isSage ? '🧙‍♀️' : conversation.name.charAt(0).toUpperCase()}
                </div>
                <div className="conversation-details">
                  <div className="conversation-name">{conversation.name}</div>
                  <div className="conversation-preview">{conversation.lastMessage}</div>
                </div>
                {conversation.unread > 0 && (
                  <div className="unread-badge">{conversation.unread}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="messages-area">
          {selectedConversation ? (
            <>
              <div className="messages-header">
                <div className="conversation-info">
                  <div className={`conversation-avatar ${conversations[selectedConversation]?.isSage ? 'sage-avatar' : ''}`}>
                    {conversations[selectedConversation]?.isSage ? '🧙‍♀️' : conversations[selectedConversation]?.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="conversation-name">{conversations[selectedConversation]?.name}</div>
                    <div className="conversation-status">
                      {conversations[selectedConversation]?.isSage ? '• Online' : 'Online'}
                    </div>
                  </div>
                </div>
                <div className="message-actions">
                  {!conversations[selectedConversation]?.isSage && (
                    <>
                      <button className="action-btn">📞</button>
                      <button className="action-btn">📧</button>
                      <button className="action-btn">ℹ️</button>
                    </>
                  )}
                </div>
              </div>

              <div className="messages-list">
                {messages.map((message) => {
                  const isSageMessage = message.sender === 'Sage';
                  return (
                    <div
                      key={message.id}
                      className={`message ${message.senderType === userType ? 'sent' : 'received'} ${isSageMessage ? 'sage-message' : ''}`}
                    >
                      {isSageMessage && (
                        <div className="sage-message-avatar">🧙‍♀️</div>
                      )}
                      <div className="message-content">
                        <div className="message-text">{message.content}</div>
                        <div className="message-time">{formatTime(message.timestamp)}</div>
                      </div>
                      {message.senderType !== userType && !message.read && !isSageMessage && (
                        <div className="unread-indicator">●</div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input-area">
                <div className="input-actions">
                  <button className="attachment-btn">📎</button>
                  <button className="emoji-btn">😊</button>
                </div>
                <div className="message-input-container">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="message-input"
                    rows={1}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isLoading}
                    className="send-btn"
                  >
                    {isLoading ? '⏳' : '➤'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-conversation">
              <div className="no-conversation-icon">💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagingSystem;
