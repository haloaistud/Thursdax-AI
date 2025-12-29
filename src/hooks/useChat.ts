import { useCallback, useEffect, useRef, useState } from 'react';

export type ChatMessage = {
  id: number;
  role: 'user' | 'model';
  text: string;
  created_at?: string;
  isStreaming?: boolean;
  sources?: { uri: string; title: string }[];
};

export function useChat(pollInterval = 1000) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'smart' | 'fast' | 'search'>('smart');
  const lastMessageIdRef = useRef<number>(0);
  const pollRef = useRef<number | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data);
      if (Array.isArray(data) && data.length > 0) {
        lastMessageIdRef.current = data[data.length - 1].id;
      }
    } catch (err) {
      console.warn('Could not load messages', err);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    pollRef.current = window.setInterval(loadMessages, pollInterval);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [loadMessages, pollInterval]);

  const sendMessage = useCallback(async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'user', text }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      const saved = await res.json();
      setMessages(prev => [...prev, saved]);
      lastMessageIdRef.current = saved.id;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const speakMessage = useCallback((text: string) => {
    if (!text) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const utter = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferred = voices.find(v => /female|zira|samantha|alloy/i.test(v.name)) || voices[0];
        if (preferred) utter.voice = preferred;
      }
      utter.rate = 1;
      utter.pitch = 1;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('speech synthesis failed', e);
    }
  }, []);

  return {
    messages,
    sendMessage,
    speakMessage,
    isLoading,
    currentMode,
    setCurrentMode,
    reload: loadMessages,
  };
}