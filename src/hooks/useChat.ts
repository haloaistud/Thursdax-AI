import { useState, useCallback, useRef, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  isStreaming?: boolean;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;
}

interface UseChatOptions {
  initialMessages?: Message[];
  cacheKey?: string;
  maxRetries?: number;
  initialRetryDelay?: number;
}

const CACHE_PREFIX = 'useChat_';
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Enhanced useChat hook with streaming support, local storage caching,
 * exponential backoff retry, and incremental message updates
 */
export const useChat = (options: UseChatOptions = {}) => {
  const {
    initialMessages = [],
    cacheKey = 'default',
    maxRetries = DEFAULT_MAX_RETRIES,
    initialRetryDelay = DEFAULT_INITIAL_RETRY_DELAY,
  } = options;

  const [state, setState] = useState<ChatState>({
    messages: initialMessages,
    isLoading: false,
    error: null,
    isStreaming: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const fullCacheKey = `${CACHE_PREFIX}${cacheKey}`;

  /**
   * Load messages from local storage cache
   */
  const loadFromCache = useCallback((): Message[] => {
    try {
      if (typeof window === 'undefined') return [];
      const cached = localStorage.getItem(fullCacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.warn('Failed to load chat from cache:', error);
      return [];
    }
  }, [fullCacheKey]);

  /**
   * Save messages to local storage cache
   */
  const saveToCache = useCallback(
    (messages: Message[]): void => {
      try {
        if (typeof window === 'undefined') return;
        localStorage.setItem(fullCacheKey, JSON.stringify(messages));
      } catch (error) {
        console.warn('Failed to save chat to cache:', error);
      }
    },
    [fullCacheKey]
  );

  /**
   * Initialize messages from cache on mount
   */
  useEffect(() => {
    const cachedMessages = loadFromCache();
    if (cachedMessages.length > 0) {
      setState((prev) => ({
        ...prev,
        messages: cachedMessages,
      }));
    }
  }, [loadFromCache]);

  /**
   * Save messages to cache whenever they change
   */
  useEffect(() => {
    saveToCache(state.messages);
  }, [state.messages, saveToCache]);

  /**
   * Calculate exponential backoff delay
   */
  const getRetryDelay = useCallback(
    (retryCount: number): number => {
      return initialRetryDelay * Math.pow(2, retryCount) + Math.random() * 1000;
    },
    [initialRetryDelay]
  );

  /**
   * Send a message with streaming support and retry logic
   */
  const sendMessage = useCallback(
    async (
      content: string,
      endpoint: string = '/api/chat'
    ): Promise<void> => {
      if (!content.trim()) return;

      const userMessageId = `msg_${Date.now()}_${Math.random()}`;
      const assistantMessageId = `msg_${Date.now() + 1}_${Math.random()}`;

      // Add user message
      const userMessage: Message = {
        id: userMessageId,
        content: content.trim(),
        role: 'user',
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null,
      }));

      // Add empty assistant message for streaming
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isStreaming: true,
      }));

      // Retry logic with exponential backoff
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          retryCountRef.current = attempt;

          // Create new abort controller for this request
          abortControllerRef.current = new AbortController();

          // Send request with streaming
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: state.messages,
              userMessage: content,
            }),
            signal: abortControllerRef.current.signal,
          });

          // Handle 429 rate limit errors with retry
          if (response.status === 429) {
            if (attempt < maxRetries) {
              const retryDelay = getRetryDelay(attempt);
              console.warn(
                `Rate limited (429). Retrying in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries})`
              );
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              continue;
            }
          }

          if (!response.ok) {
            throw new Error(
              `API error: ${response.status} ${response.statusText}`
            );
          }

          // Handle streaming response
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body is not readable');
          }

          const decoder = new TextDecoder();
          let accumulatedContent = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;

            // Update assistant message with streamed content
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: accumulatedContent,
                      isStreaming: true,
                    }
                  : msg
              ),
            }));
          }

          // Mark streaming as complete
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    isStreaming: false,
                  }
                : msg
            ),
            isLoading: false,
            isStreaming: false,
            error: null,
          }));

          retryCountRef.current = 0;
          return;
        } catch (error) {
          lastError = error as Error;

          if (
            error instanceof Error &&
            error.name === 'AbortError'
          ) {
            console.log('Request was cancelled');
            return;
          }

          if (attempt < maxRetries) {
            const retryDelay = getRetryDelay(attempt);
            console.warn(
              `Request failed (attempt ${attempt + 1}/${maxRetries}). Retrying in ${retryDelay}ms:`,
              error
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      // All retries failed
      const errorMessage = lastError?.message || 'Failed to send message';
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isStreaming: false,
              }
            : msg
        ),
        isLoading: false,
        isStreaming: false,
        error: errorMessage,
      }));

      retryCountRef.current = 0;
    },
    [state.messages, maxRetries, getRetryDelay]
  );

  /**
   * Cancel ongoing request
   */
  const cancelRequest = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
      }));
    }
  }, []);

  /**
   * Clear all messages and cache
   */
  const clearMessages = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      messages: [],
      error: null,
    }));
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(fullCacheKey);
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }, [fullCacheKey]);

  /**
   * Delete a specific message
   */
  const deleteMessage = useCallback((messageId: string): void => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((msg) => msg.id !== messageId),
    }));
  }, []);

  /**
   * Edit a message
   */
  const editMessage = useCallback(
    (messageId: string, newContent: string): void => {
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: newContent,
                timestamp: Date.now(),
              }
            : msg
        ),
      }));
    },
    []
  );

  /**
   * Get the current retry count
   */
  const getRetryCount = useCallback((): number => {
    return retryCountRef.current;
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    error: state.error,
    sendMessage,
    cancelRequest,
    clearMessages,
    deleteMessage,
    editMessage,
    getRetryCount,
    loadFromCache,
    saveToCache,
  };
};

export type { Message, ChatState, UseChatOptions };