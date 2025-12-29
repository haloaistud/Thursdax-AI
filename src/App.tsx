import React, { useState, useEffect } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import FrequencyOrb from './components/FrequencyOrb';
import ChatInterface from './components/ChatInterface';
import MemoryPanel from './components/MemoryPanel';
import Onboarding from './components/Onboarding';
import PersonaPanel from './components/PersonaPanel';
import { 
  Mic, MicOff, Heart, Square, Loader2, MessageSquare, 
  Database, Activity, Terminal, X, Zap, RefreshCw
} from 'lucide-react';

const App: React.FC = () => {
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const { 
    connect, disconnect, status, isAiSpeaking, isUserSpeaking, volumeLevels, errorMsg, transcript,
    inputAnalyzer, outputAnalyzer, logs 
  } = useLiveSession(isMicMuted);

  useEffect(() => {
    const seen = localStorage.getItem('thursday_onboarding_seen');
    if (seen) setShowOnboarding(false);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('thursday_onboarding_seen', 'true');
    setShowOnboarding(false);
    setTimeout(() => {
      connect();
    }, 800);
  };

  if (showOnboarding) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans overflow-hidden selection:bg-indigo-500/30">
      <header className="p-4 md:p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 via-violet-600 to-rose-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Heart className="text-white" size={18} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-widest text-white uppercase italic">THURSDAY</h1>
            <p className="text-[8px] text-stone-500 tracking-[0.4em]">AI PROTOTYPE</p>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;