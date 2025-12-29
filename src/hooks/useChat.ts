import { useState, useCallback, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  retryCount: number;
}

interface UseChatsOptions {
  cacheKey?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
  enableLocalStorage?: boolean;
}

const DEFAULT_CACHE_KEY = 'chat_messages_cache';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_BACKOFF_MS = 1000;

/**
 * Calculate exponential backoff delay with jitter
 * @param retryCount - Current retry attempt number
 * @param initialBackoffMs - Initial backoff in milliseconds
 * @returns Delay in milliseconds
 */
const calculateBackoffDelay = (
  retryCount: number,
  initialBackoffMs: number = DEFAULT_INITIAL_BACKOFF_MS
): number => {
  const exponentialDelay = initialBackoffMs * Math.pow(2, retryCount);
  const jitter = Math.random() * exponentialDelay * 0.1; // 10% jitter
  return exponentialDelay + jitter;
};

/**
 * Custom hook for managing chat state with streaming, caching, and retry logic
 */
export const useChat = (options: UseChatsOptions = {}) => {
  const {
    cacheKey = DEFAULT_CACHE_KEY,
    maxRetries = DEFAULT_MAX_RETRIES,
    initialBackoffMs = DEFAULT_INITIAL_BACKOFF_MS,
    enableLocalStorage = true,
  } = options;

  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    retryCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamBufferRef = useRef<string>('');

  /**
   * Initialize state from local storage cache
   */
  useEffect(() => {
    if (enableLocalStorage) {
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData) as ChatMessage[];
          setState((prevState) => ({
            ...prevState,
            messages: parsedData,
          }));
        }
      } catch (error) {
        console.warn(`Failed to load chat cache from localStorage: ${error}`);
      }
    }
  }, [cacheKey, enableLocalStorage]);

  /**
   * Synchronize chat messages to local storage
   */
  const syncToLocalStorage = useCallback(
    (messages: ChatMessage[]) => {
      if (enableLocalStorage) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(messages));
        } catch (error) {
          console.warn(`Failed to sync chat to localStorage: ${error}`);
        }
      }
    },
    [cacheKey, enableLocalStorage]
  );

  /**
   * Update messages and sync to local storage
   */
  const updateMessages = useCallback(
    (messages: ChatMessage[]) => {
      setState((prevState) => ({
        ...prevState,
        messages,
      }));
      syncToLocalStorage(messages);
    },
    [syncToLocalStorage]
  );

  /**
   * Add a new message to the chat
   */
  const addMessage = useCallback(
    (role: 'user' | 'assistant', content: string): ChatMessage => {
      const newMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role,
        content,
        timestamp: Date.now(),
      };

      setState((prevState) => {
        const updatedMessages = [...prevState.messages, newMessage];
        syncToLocalStorage(updatedMessages);
        return {
          ...prevState,
          messages: updatedMessages,
        };
      });

      return newMessage;
    },
    [syncToLocalStorage]
  );

  /**
   * Send a message with streaming support and retry logic
   */
  const sendMessage = useCallback(
    async (
      content: string,
      endpoint: string = '/api/chat',
      onStreamChunk?: (chunk: string) => void
    ): Promise<void> => {
      // Add user message
      addMessage('user', content);

      setState((prevState) => ({
        ...prevState,
        isLoading: true,
        error: null,
      }));

      // Create abort controller for request cancellation
      abortControllerRef.current = new AbortController();
      streamBufferRef.current = '';

      const attemptRequest = async (currentRetry: number = 0): Promise<void> => {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream',
            },
            body: JSON.stringify({ message: content }),
            signal: abortControllerRef.current?.signal,
          });

          // Handle rate limiting with exponential backoff
          if (response.status === 429) {
            if (currentRetry < maxRetries) {
              const backoffDelay = calculateBackoffDelay(currentRetry, initialBackoffMs);
              console.warn(
                `Rate limited (429). Retrying in ${backoffDelay.toFixed(0)}ms (attempt ${currentRetry + 1}/${maxRetries})`
              );

              setState((prevState) => ({
                ...prevState,
                retryCount: currentRetry + 1,
              }));

              // Wait before retrying
              await new Promise((resolve) => {
                retryTimeoutRef.current = setTimeout(resolve, backoffDelay);
              });

              return attemptRequest(currentRetry + 1);
            } else {
              throw new Error(
                `Rate limited (429). Maximum retries (${maxRetries}) exceeded. Please try again later.`
              );
            }
          }

          if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
          }

          // Handle streaming response
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body is not readable');
          }

          const decoder = new TextDecoder();
          let assistantContent = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            streamBufferRef.current += chunk;

            // Process complete lines from the buffer
            const lines = streamBufferRef.current.split('\n');
            streamBufferRef.current = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    assistantContent += data.content;
                    onStreamChunk?.(data.content);
                  }
                } catch (error) {
                  console.warn(`Failed to parse stream chunk: ${error}`);
                }
              }
            }
          }

          // Process any remaining content in buffer
          if (streamBufferRef.current.trim()) {
            try {
              const data = JSON.parse(streamBufferRef.current.slice(6));
              if (data.content) {
                assistantContent += data.content;
                onStreamChunk?.(data.content);
              }
            } catch (error) {
              console.warn(`Failed to parse final stream chunk: ${error}`);
            }
          }

          // Add assistant message to chat
          if (assistantContent) {
            addMessage('assistant', assistantContent);
          }

          setState((prevState) => ({
            ...prevState,
            isLoading: false,
            retryCount: 0,
            error: null,
          }));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'An unexpected error occurred';

          // Don't set error if request was aborted
          if (error instanceof Error && error.name === 'AbortError') {
            setState((prevState) => ({
              ...prevState,
              isLoading: false,
            }));
            return;
          }

          setState((prevState) => ({
            ...prevState,
            isLoading: false,
            error: errorMessage,
            retryCount: 0,
          }));
        }
      };

      return attemptRequest();
    },
    [addMessage, maxRetries, initialBackoffMs]
  );

  /**
   * Cancel the current streaming request
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setState((prevState) => ({
      ...prevState,
      isLoading: false,
    }));
  }, []);

  /**
   * Clear all messages and reset state
   */
  const clearChat = useCallback(() => {
    updateMessages([]);
    setState({
      messages: [],
      isLoading: false,
      error: null,
      retryCount: 0,
    });
    streamBufferRef.current = '';
  }, [updateMessages]);

  /**
   * Clear local storage cache
   */
  const clearCache = useCallback(() => {
    if (enableLocalStorage) {
      try {
        localStorage.removeItem(cacheKey);
      } catch (error) {
        console.warn(`Failed to clear cache: ${error}`);
      }
    }
  }, [cacheKey, enableLocalStorage]);

  /**
   * Cleanup on component unmount
   */
  useEffect(() => {
    return () => {
      cancelRequest();
    };
  }, [cancelRequest]);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    retryCount: state.retryCount,
    sendMessage,
    addMessage,
    clearChat,
    cancelRequest,
    clearCache,
    updateMessages,
  };
};

export default useChat;
