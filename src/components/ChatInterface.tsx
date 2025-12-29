import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import './ChatInterface.css';

type ChatMode = 'smart' | 'fast' | 'search';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatInterfaceProps {
  apiEndpoint?: string;
  onModeChange?: (mode: ChatMode) => void;
  initialMode?: ChatMode;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  apiEndpoint = '/api/chat',
  onModeChange,
  initialMode = 'smart',
}) => {
  const [chatMode, setChatMode] = useState<ChatMode>(initialMode);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Integration with useChat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: chatIsLoading,
    error,
    setMessages,
  } = useChat({
    api: apiEndpoint,
  });

  // Update loading state
  useEffect(() => {
    setIsLoading(chatIsLoading);
  }, [chatIsLoading]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle mode change
  const handleModeChange = (newMode: ChatMode) => {
    setChatMode(newMode);
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim()) {
      return;
    }

    // Submit with mode parameter
    handleSubmit(e, {
      options: {
        headers: {
          'X-Chat-Mode': chatMode,
        },
      },
    });

    setInputValue('');
  };

  // Get mode-specific styling and description
  const getModeConfig = (mode: ChatMode) => {
    const configs = {
      smart: {
        label: 'Smart',
        description: 'Advanced reasoning and context understanding',
        color: 'bg-blue-500',
        icon: '🧠',
      },
      fast: {
        label: 'Fast',
        description: 'Quick responses with optimized speed',
        color: 'bg-green-500',
        icon: '⚡',
      },
      search: {
        label: 'Search',
        description: 'Web search and information retrieval',
        color: 'bg-purple-500',
        icon: '🔍',
      },
    };
    return configs[mode];
  };

  const modeConfig = getModeConfig(chatMode);

  return (
    <div className="chat-interface-container">
      {/* Header with Mode Selector */}
      <div className="chat-header">
        <div className="header-title">
          <h1>Thursdax AI Chat</h1>
          <p className="header-subtitle">Powered by AI</p>
        </div>

        <div className="mode-selector">
          <div className="mode-label">Chat Mode:</div>
          <div className="mode-buttons">
            {(['smart', 'fast', 'search'] as ChatMode[]).map((mode) => {
              const config = getModeConfig(mode);
              return (
                <button
                  key={mode}
                  className={`mode-button ${
                    chatMode === mode ? 'active' : ''
                  } ${config.color}`}
                  onClick={() => handleModeChange(mode)}
                  title={config.description}
                  disabled={isLoading}
                >
                  <span className="mode-icon">{config.icon}</span>
                  <span className="mode-name">{config.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mode-description">{modeConfig.description}</div>
        </div>
      </div>

      {/* Messages Display Area */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h2>Welcome to Thursdax AI</h2>
            <p>Start a conversation by typing a message below.</p>
            <p className="mode-hint">
              Current mode: <strong>{modeConfig.label}</strong> - {modeConfig.description}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-role">
                  {message.role === 'user' ? 'You' : 'Thursdax AI'}
                </div>
                <div className="message-text">{message.content}</div>
                <div className="message-timestamp">
                  {new Date(message.createdAt || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="message assistant loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="loading-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <div className="error-title">Error</div>
              <div className="error-text">
                {error.message || 'An error occurred while processing your message.'}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleFormSubmit} className="input-form">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message here... (Shift+Enter for new line, Enter to send)"
            className="message-input"
            disabled={isLoading}
            rows={1}
            onKeyDown={(e) => {
              // Allow new line with Shift+Enter
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFormSubmit(
                  e as unknown as React.FormEvent<HTMLFormElement>
                );
              }
            }}
          />
          <button
            type="submit"
            className="send-button"
            disabled={isLoading || !input.trim()}
            title="Send message"
          >
            <span className="send-icon">📤</span>
            <span className="send-text">Send</span>
          </button>
        </div>

        <div className="input-footer">
          <div className="input-info">
            <span className="mode-indicator">
              Mode: <strong>{modeConfig.label}</strong>
            </span>
            <span className="char-count">{input.length} characters</span>
          </div>
          <div className="input-hints">
            <small>💡 Tip: Press Shift+Enter for a new line</small>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
