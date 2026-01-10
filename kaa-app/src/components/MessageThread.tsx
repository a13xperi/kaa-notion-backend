import React, { useState, useRef, useEffect } from 'react';
import { useMessages, useSendMessage } from '../hooks/useMessages';
import './MessageThread.css';

interface MessageThreadProps {
  projectId: string;
  projectName?: string;
  currentUserId: string;
  userRole: 'CLIENT' | 'ADMIN' | 'TEAM';
}

const MessageThread: React.FC<MessageThreadProps> = ({
  projectId,
  projectName,
  currentUserId,
  userRole
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isInternalMode, setIsInternalMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isTeamOrAdmin = userRole === 'ADMIN' || userRole === 'TEAM';

  // Fetch messages
  const {
    messages,
    hasMore,
    isLoading,
    isError,
    refetch
  } = useMessages({
    projectId,
    limit: 50,
    includeInternal: isTeamOrAdmin,
  });

  // Send message mutation
  const { sendMessage, isSending } = useSendMessage(projectId);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    sendMessage({
      content: newMessage.trim(),
      isInternal: isInternalMode && isTeamOrAdmin,
    }, {
      onSuccess: () => {
        setNewMessage('');
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'TEAM': return 'Team';
      case 'CLIENT': return 'Client';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className="message-thread">
        <div className="message-thread-header">
          <h3>{projectName || 'Project Messages'}</h3>
        </div>
        <div className="message-thread-content">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="message-thread">
        <div className="message-thread-header">
          <h3>{projectName || 'Project Messages'}</h3>
        </div>
        <div className="message-thread-content">
          <div className="error-state">
            <p>Failed to load messages</p>
            <button onClick={() => refetch()} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-thread">
      <div className="message-thread-header">
        <h3>{projectName || 'Project Messages'}</h3>
        <div className="header-actions">
          {isTeamOrAdmin && (
            <label className="internal-toggle">
              <input
                type="checkbox"
                checked={isInternalMode}
                onChange={(e) => setIsInternalMode(e.target.checked)}
              />
              <span>Internal</span>
            </label>
          )}
        </div>
      </div>

      <div className="message-thread-content">
        {messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">💬</div>
            <h4>No messages yet</h4>
            <p>Start a conversation about this project.</p>
          </div>
        ) : (
          <div className="messages-list">
            {hasMore && (
              <div className="load-more">
                <button className="load-more-btn">Load earlier messages</button>
              </div>
            )}
            {messages.map((message) => {
              const isOwn = message.senderId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`message ${isOwn ? 'own' : 'other'} ${message.isInternal ? 'internal' : ''}`}
                >
                  {!isOwn && (
                    <div className="message-avatar">
                      {message.sender.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="message-bubble">
                    {!isOwn && (
                      <div className="message-sender">
                        <span className="sender-name">{message.sender.name}</span>
                        <span className="sender-role">{getRoleLabel(message.sender.role)}</span>
                        {message.isInternal && <span className="internal-badge">Internal</span>}
                      </div>
                    )}
                    {isOwn && message.isInternal && (
                      <div className="message-sender">
                        <span className="internal-badge">Internal</span>
                      </div>
                    )}
                    <div className="message-text">{message.content}</div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="message-attachments">
                        {message.attachments.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="attachment-link">
                            Attachment {idx + 1}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="message-time">{formatTime(message.createdAt)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="message-input-area">
        {isInternalMode && isTeamOrAdmin && (
          <div className="internal-notice">
            This message will only be visible to team members
          </div>
        )}
        <div className="input-container">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isInternalMode ? 'Type an internal note...' : 'Type a message...'}
            className="message-input"
            rows={1}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="send-btn"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;
