'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Settings, Shield, Rocket, Clock, GitCompare, RefreshCw, X, Plus } from 'lucide-react';
import { ModeSelector, Mode } from '@/components/mode-selector';
import { PressNotebook } from '@/components/press-notebook';
import { SessionsDrawer, ChatSession } from '@/components/sessions-drawer';
import { SettingsDrawer } from '@/components/settings-drawer';
import { ChatMessage } from '@/components/chat-message';
import { BeliefDiffViewer } from '@/components/belief-diff-viewer';
import { speakText, stopSpeaking } from '@/lib/voice';

export default function Home() {
  const [mode, setMode] = useState<Mode>('now');
  const [asOfDate, setAsOfDate] = useState('2023-01-01');
  const [compareDates, setCompareDates] = useState<[string, string]>(['2021-02-01', '2021-06-01']);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'user',
      content: 'What do you think about the future of human civilization?'
    },
    {
      role: 'assistant',
      content: 'The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth and make consciousness sustainable across the solar system.'
    },
    {
      role: 'user',
      content: 'Best investment according to you?'
    },
    {
      role: 'assistant',
      content: 'I believe in solving real engineering problems. Areas like sustainable energy, AI, and space transport will drive the most civilizational impact.'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [diffData, setDiffData] = useState<any>(null);
  
  // Panels & Settings state
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Sessions management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('session-default');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('muskmelon_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          if (parsed[0].messages && parsed[0].messages.length > 0) {
            setMessages(parsed[0].messages);
          }
          return;
        }
      }
    } catch {}

    const defaultSession: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'Starbase Briefing',
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: messages
    };
    setSessions([defaultSession]);
    setCurrentSessionId(defaultSession.id);
  }, []);

  const saveSessionMessages = (newMessages: any[]) => {
    setMessages(newMessages);
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          return {
            ...s,
            title: firstUserMsg ? firstUserMsg.content.slice(0, 30) + '...' : s.title,
            messages: newMessages
          };
        }
        return s;
      });
      try {
        localStorage.setItem('muskmelon_sessions', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleNewSession = () => {
    stopSpeaking();
    const newSession: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'New Conversation',
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: []
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setActiveReceipt(null);
    setDiffData(null);
    try {
      localStorage.setItem('muskmelon_sessions', JSON.stringify(updated));
    } catch {}
  };

  const handleSelectSession = (id: string) => {
    stopSpeaking();
    const target = sessions.find(s => s.id === id);
    if (target) {
      setCurrentSessionId(target.id);
      setMessages(target.messages || []);
      const lastAssis = [...(target.messages || [])].reverse().find(m => m.role === 'assistant');
      if (lastAssis && lastAssis.receipt) {
        setActiveReceipt(lastAssis.receipt);
      }
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    try {
      localStorage.setItem('muskmelon_sessions', JSON.stringify(updated));
    } catch {}
    if (currentSessionId === id && updated.length > 0) {
      handleSelectSession(updated[0].id);
    } else if (updated.length === 0) {
      handleNewSession();
    }
  };

  const handleClearCurrent = () => {
    stopSpeaking();
    saveSessionMessages([]);
    setActiveReceipt(null);
    setDiffData(null);
  };

  const handleClearAll = () => {
    stopSpeaking();
    localStorage.removeItem('muskmelon_sessions');
    handleNewSession();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    const newMsgList = [...messages, { role: 'user', content: userMsg }];
    saveSessionMessages(newMsgList);
    setIsLoading(true);
    stopSpeaking();

    try {
      if (mode === 'diff') {
        const res = await fetch('/api/diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            topic: userMsg, 
            date1: compareDates[0], 
            date2: compareDates[1] 
          })
        });
        const data = await res.json();
        setDiffData(data.diff);
        const replyText = `Belief shift for "${userMsg}" between ${compareDates[0]} and ${compareDates[1]}:\n\n${data.diff.whatChanged}\n\n${data.diff.whyChanged}`;
        const finalMsgs = [...newMsgList, { role: 'assistant', content: replyText }];
        saveSessionMessages(finalMsgs);
        if (voiceEnabled) speakText(replyText, true);
      } else {
        setDiffData(null);
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userMsg, 
            mode, 
            asOfDate: mode === 'time' ? asOfDate : undefined,
            history: messages 
          })
        });
        const data = await res.json();
        setActiveReceipt(data.receipt);
        const finalMsgs = [...newMsgList, { role: 'assistant', content: data.message, receipt: data.receipt }];
        saveSessionMessages(finalMsgs);
        if (voiceEnabled) speakText(data.message, true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive discussed topics
  const topicsSet = new Set<string>();
  messages.forEach(m => {
    const text = m.content.toLowerCase();
    if (text.includes('tesla')) topicsSet.add('Tesla');
    if (text.includes('spacex') || text.includes('starship')) topicsSet.add('SpaceX');
    if (text.includes('ai') || text.includes('grok')) topicsSet.add('xAI');
    if (text.includes('crypto') || text.includes('bitcoin') || text.includes('doge')) topicsSet.add('Crypto');
    if (text.includes('neuralink')) topicsSet.add('Neuralink');
    if (text.includes('mars')) topicsSet.add('Mars');
    if (text.includes('civilization')) topicsSet.add('Civilization');
  });

  return (
    <div className="relative h-screen w-screen bg-[#080b11] text-[#f1f5f9] overflow-hidden font-sans select-none flex flex-col">
      {/* Background Illustrated Scene */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/bg-elon-office.png"
          alt="Elon Musk Office Background"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Subtle dark vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
      </div>

      {/* Top Header */}
      <header className="relative z-30 flex items-center justify-between px-4 md:px-6 py-3 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSessionsOpen(true)}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-[#94a3b8] hover:text-white border border-white/15 transition-all flex items-center gap-1.5 text-xs font-mono"
            title="Chat Sessions"
          >
            <Menu size={16} />
            <span className="hidden sm:inline">Sessions</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[#f3951f] shadow-md shadow-[#f3951f]/30">
              <Image
                src="/muskmelon-logo.png"
                alt="MuskMelon Logo"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-wider text-[#f1f5f9]">MUSKMELON</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f3951f]/20 text-[#f3951f] font-mono border border-[#f3951f]/40">
                  X-TWIN
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Mode Switcher */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-2xl border border-white/15 backdrop-blur-md">
          <button
            onClick={() => setMode('now')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              mode === 'now' 
                ? 'bg-[#38bdf8] text-slate-950 font-bold shadow-md' 
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Rocket size={12} />
            <span className="hidden sm:inline">Now Mode (2025+)</span>
            <span className="sm:hidden">Now</span>
          </button>

          <button
            onClick={() => setMode('time')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              mode === 'time' 
                ? 'bg-[#f3951f] text-slate-950 font-bold shadow-md' 
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Clock size={12} />
            <span className="hidden sm:inline">Time Lens</span>
            <span className="sm:hidden">Time</span>
          </button>

          <button
            onClick={() => setMode('diff')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              mode === 'diff' 
                ? 'bg-purple-400 text-slate-950 font-bold shadow-md' 
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <GitCompare size={12} />
            <span className="hidden sm:inline">Belief Diff</span>
            <span className="sm:hidden">Diff</span>
          </button>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 text-xs text-[#cbd5e1] font-medium transition-colors"
          >
            <Shield size={13} className="text-[#f3951f]" />
            <span>Dataset & Commits</span>
          </Link>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-[#94a3b8] hover:text-white border border-white/15 transition-all"
            title="Settings & Memory"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Main Screen Layout (matching the uploaded image with right-side transcript) */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row items-end justify-between p-4 md:p-6 gap-4 overflow-hidden">
        {/* Left / Center Area: Time Lens controls + Press Notebook at bottom */}
        <div className="flex-1 flex flex-col justify-end w-full max-w-2xl mx-auto md:mx-0">
          {/* Mode specific parameters */}
          {mode === 'time' && (
            <div className="mb-3 p-3 bg-black/80 border border-[#f3951f]/50 rounded-xl flex items-center justify-between text-xs backdrop-blur-md shadow-lg">
              <span className="text-[#f3951f] font-mono font-semibold flex items-center gap-1.5">
                <Clock size={14} /> Knowledge Version As Of:
              </span>
              <input
                type="date"
                value={asOfDate}
                min="2010-01-01"
                max="2025-12-31"
                onChange={e => setAsOfDate(e.target.value)}
                className="bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1 text-xs text-[#f1f5f9]"
              />
            </div>
          )}

          {mode === 'diff' && (
            <div className="mb-3 p-3 bg-black/80 border border-purple-500/50 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md shadow-lg">
              <span className="text-purple-400 font-mono font-semibold flex items-center gap-1.5">
                <GitCompare size={14} /> Compare Two Eras:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={compareDates[0]}
                  onChange={e => setCompareDates([e.target.value, compareDates[1]])}
                  className="bg-[#1e293b] border border-[#334155] rounded-lg px-2 py-1 text-xs text-[#f1f5f9]"
                />
                <span className="text-slate-400">vs</span>
                <input
                  type="date"
                  value={compareDates[1]}
                  onChange={e => setCompareDates([compareDates[0], e.target.value])}
                  className="bg-[#1e293b] border border-[#334155] rounded-lg px-2 py-1 text-xs text-[#f1f5f9]"
                />
              </div>
            </div>
          )}

          {/* Press Notebook Input Box */}
          <PressNotebook
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            isSpeaking={false}
            voiceEnabled={voiceEnabled}
            onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
            placeholder={
              mode === 'diff'
                ? "Enter topic to compare beliefs (e.g. 'Bitcoin', 'AI', 'Politics')..."
                : mode === 'time'
                ? `Ask Elon as he knew on ${asOfDate} (e.g. 'What is the status of Model 3?')...`
                : "Type your question to Elon..."
            }
          />
        </div>

        {/* Right Side Transcript Card (Matching the reference UI with Settings & Memory style) */}
        <div className="w-full md:w-96 max-h-[500px] md:max-h-[620px] bg-[#0c1322]/90 backdrop-blur-xl border border-white/15 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
          {/* Transcript Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-2">
              <Settings size={15} className="text-[#38bdf8]" />
              <span className="font-semibold text-xs text-[#f1f5f9] tracking-wider">
                Settings & Memory
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <button onClick={handleNewSession} title="New Session" className="p-1 hover:text-white rounded hover:bg-white/10">
                <Plus size={14} />
              </button>
              <button onClick={handleClearCurrent} title="Clear Messages" className="p-1 hover:text-white rounded hover:bg-white/10">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
            {messages.length === 0 ? (
              <div className="text-center py-16 text-slate-500 italic text-xs">
                No active messages. Type a question in the Press Notebook below.
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                    m.role === 'user' ? 'text-emerald-400' : 'text-[#38bdf8]'
                  }`}>
                    {m.role === 'user' ? 'USER' : 'ELON'}
                  </div>
                  <div className="text-slate-200 leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-white/10">
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {diffData && (
              <div className="pt-2">
                <BeliefDiffViewer diff={diffData} />
              </div>
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-[#38bdf8] text-xs font-mono animate-pulse pt-2">
                <RefreshCw size={12} className="animate-spin" />
                <span>Thinking through first principles...</span>
              </div>
            )}
          </div>

          {/* Transcript Footer Info */}
          <div className="p-3 border-t border-white/10 bg-black/50 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>MuskMelon Twin v4.2</span>
            <span className="text-[#f3951f]">Swytchcode Guarded</span>
          </div>
        </div>
      </main>

      {/* Drawers */}
      <SessionsDrawer
        isOpen={isSessionsOpen}
        onClose={() => setIsSessionsOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => { handleSelectSession(id); setIsSessionsOpen(false); }}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        immersiveMode={true}
        onToggleImmersive={() => {}}
        messageCount={messages.length}
        topics={Array.from(topicsSet)}
        activeReceipt={activeReceipt}
        onClearCurrent={handleClearCurrent}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
