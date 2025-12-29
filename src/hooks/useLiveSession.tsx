import { useCallback, useEffect, useRef, useState } from 'react';

type Status = 'disconnected' | 'connecting' | 'connected' | 'error' | 'initializing';

export function useLiveSession(isMicMuted?: boolean) {
  const [status, setStatus] = useState<Status>('disconnected');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [volumeLevels, setVolumeLevels] = useState({ user: 0, ai: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState({ user: '', ai: '' });
  const [logs] = useState<any[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const lastModelMessageId = useRef<number>(0);
  const pollRef = useRef<number | null>(null);
  const isMutedRef = useRef(!!isMicMuted);

  useEffect(() => { isMutedRef.current = !!isMicMuted; }, [isMicMuted]);

  const startAnalyser = async () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
    } catch (e: any) {
      console.warn('Microphone access failed', e);
      setErrorMsg('Microphone access denied or unavailable.');
    }
  };

  const stopAnalyser = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    sourceRef.current = null;
    setIsUserSpeaking(false);
  };

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      const res = await fetch('/api/session/connect', { method: 'POST' });
      if (!res.ok) throw new Error('connect failed');
      await startAnalyser();
      setStatus('connected');

      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        try {
          const r = await fetch('/api/messages');
          if (!r.ok) return;
          const data = await r.json();
          if (Array.isArray(data) && data.length > 0) {
            const last = data[data.length - 1];
            if (last.role === 'model' && last.id !== lastModelMessageId.current) {
              lastModelMessageId.current = last.id;
              setTranscript(prev => ({ ...prev, ai: last.text }));
              setIsAiSpeaking(true);
              const approxMs = Math.max(800, last.text.split(/\s+/).length * 150);
              setTimeout(() => setIsAiSpeaking(false), approxMs);
            }
          }
        } catch (e) {
          console.warn('message poll failed', e);
        }
      }, 900);
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
      setStatus('error');
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await fetch('/api/session/disconnect', { method: 'POST' });
    } catch (e) {
      console.warn('disconnect failed', e);
    } finally {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      stopAnalyser();
      setStatus('disconnected');
      setIsAiSpeaking(false);
    }
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (status === 'connected' && analyserRef.current) {
      interval = window.setInterval(() => {
        const analyzer = analyserRef.current!;
        const data = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolumeLevels(prev => ({ ...prev, user: Math.round(avg) }));
        setIsUserSpeaking(!isMutedRef.current && avg > 20);
      }, 120);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      stopAnalyser();
    };
  }, []);

  return {
    connect,
    disconnect,
    status,
    isAiSpeaking,
    isUserSpeaking,
    volumeLevels,
    errorMsg,
    transcript,
    inputAnalyzer: analyserRef.current,
    outputAnalyzer: null,
    logs,
  };
}