'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Settings, Sparkles, Shield, Rocket, Clock, GitCompare, RefreshCw, Volume2 } from 'lucide-react';
import { ModeSelector, Mode } from '@/components/mode-selector';
import { CRTScreen } from '@/components/crt-screen';
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
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latestAssistantText, setLatestAssistantText] = useState('Welcome to Starbase. Ask MuskMelon anything about Tesla, SpaceX, Neuralink, AI, or our verified 2010–2025 timeline.');
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [diffData, setDiffData] = useState<any>(null);
  
  // Drawers state
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [immersiveMode, setImmersiveMode] = useState(true);

  // Sessions management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('session-default');

  // Load sessions on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('muskmelon_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages || []);
          return;
        }
      }
    } catch {
      // fallback
    }

    const defaultSession: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'Starbase Briefing',
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: []
    };
    setSessions([defaultSession]);
    setCurrentSessionId(defaultSession.id);
  }, []);

  // Save sessions to localStorage
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
    setLatestAssistantText('New session initialized. System standing by for your question.');
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
      if (lastAssis) {
        setLatestAssistantText(lastAssis.content);
        if (lastAssis.receipt) setActiveReceipt(lastAssis.receipt);
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
    setLatestAssistantText('Conversation cleared.');
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
        const replyText = `Here is the belief evolution diff for "${userMsg}" between ${compareDates[0]} and ${compareDates[1]}:\n\n${data.diff.whatChanged}\n\n${data.diff.whyChanged}`;
        setLatestAssistantText(replyText);
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
        setLatestAssistantText(data.message);
        setActiveReceipt(data.receipt);
        const finalMsgs = [...newMsgList, { role: 'assistant', content: data.message, receipt: data.receipt }];
        saveSessionMessages(finalMsgs);
        if (voiceEnabled) speakText(data.message, true);
      }
    } catch (error) {
      console.error(error);
      setLatestAssistantText('Connection failure with Starbase knowledge index.');
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
    if (text.includes('robotaxi') || text.includes('cybercab')) topicsSet.add('Cybercab');
  });

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] text-[#f1f5f9] overflow-x-hidden font-sans select-none flex flex-col">
      {/* Background Command Center Scene */}
      {immersiveMode && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Image
            src="/bg-command-center.jpg"
            alt="Starbase Command Center"
            fill
            priority
            className="object-cover object-center opacity-30 filter saturate-125 contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]/90 backdrop-blur-[2px]" />
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="relative z-30 flex items-center justify-between px-4 md:px-8 py-3.5 bg-[#090d16]/90 backdrop-blur-xl border-b border-[#1e293b]">
        {/* Left Side: Menu + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSessionsOpen(true)}
            className="p-2 rounded-xl bg-[#1e293b]/70 hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#334155] transition-all flex items-center gap-1.5 text-xs font-mono"
            title="Chat Sessions"
          >
            <Menu size={16} />
            <span className="hidden sm:inline">Sessions</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#f3951f] shadow-md shadow-[#f3951f]/20">
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
              <p className="text-[10px] text-[#64748b] hidden md:block">
                Version-Controlled Knowledge Twin of Elon Musk (2010–2025)
              </p>
            </div>
          </div>
        </div>

        {/* Center: Mode Selector Pills */}
        <div className="hidden lg:flex items-center gap-1 bg-[#141b2d]/80 p-1 rounded-2xl border border-[#1e293b]">
          <button
            onClick={() => setMode('now')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              mode === 'now' 
                ? 'bg-[#38bdf8] text-slate-950 font-bold shadow-md shadow-[#38bdf8]/20' 
                : 'text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
          >
            <Rocket size={13} />
            <span>Now Mode (2025+)</span>
          </button>

          <button
            onClick={() => setMode('time')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              mode === 'time' 
                ? 'bg-[#f3951f] text-slate-950 font-bold shadow-md shadow-[#f3951f]/20' 
                : 'text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
          >
            <Clock size={13} />
            <span>Time Lens</span>
          </button>

          <button
            onClick={() => setMode('diff')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              mode === 'diff' 
                ? 'bg-purple-400 text-slate-950 font-bold shadow-md shadow-purple-400/20' 
                : 'text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
          >
            <GitCompare size={13} />
            <span>Belief Diff</span>
          </button>
        </div>

        {/* Right Side: Swytchcode + Admin + Settings */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e293b]/70 hover:bg-[#1e293b] border border-[#334155] text-xs text-[#cbd5e1] font-medium transition-colors"
          >
            <Shield size={13} className="text-[#f3951f]" />
            <span>Dataset & Commits</span>
          </Link>

          <div className="px-2.5 py-1 rounded-full bg-[#f3951f]/10 border border-[#f3951f]/30 text-[11px] font-mono text-[#f3951f] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f3951f] animate-ping"></span>
            <span className="hidden sm:inline">Swytchcode</span> 10 APIs
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-[#1e293b]/70 hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#334155] transition-all"
            title="Settings & Memory"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 py-4 md:py-6 overflow-y-auto">
        {/* Mobile Mode Selector */}
        <div className="lg:hidden mb-4">
          <ModeSelector 
            mode={mode} 
            onModeChange={setMode}
            asOfDate={asOfDate}
            onDateChange={setAsOfDate}
            compareDates={compareDates}
            onCompareDatesChange={setCompareDates}
          />
        </div>

        {/* Top Visual Interactive Stage (Musk Avatar + CRT Terminal Screen) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-6">
          {/* Avatar Card */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0f172a]/80 border border-[#1e293b] backdrop-blur-md shadow-xl relative group">
            <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden border-2 border-[#f3951f]/60 shadow-lg shadow-[#f3951f]/20">
              <Image
                src="/elon-avatar.jpg"
                alt="Elon Musk Cartoon Character"
                fill
                priority
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-white/20 text-[9px] font-mono text-[#f3951f] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                ACTIVE
              </div>
            </div>
            <div className="text-center mt-2.5">
              <h3 className="font-bold text-sm text-[#f1f5f9]">Elon Musk</h3>
              <p className="text-[11px] text-[#94a3b8] font-mono">Cognitive Twin @ Starbase</p>
            </div>
          </div>

          {/* CRT Monitor Screen */}
          <div className="md:col-span-8 flex flex-col">
            <CRTScreen 
              text={latestAssistantText} 
              isStreaming={isLoading}
              mode={mode}
              asOfDate={asOfDate}
            />

            {/* Time Lens Slider / Diff Settings if active */}
            {mode === 'time' && (
              <div className="mt-3 p-3 bg-[#0f172a]/90 border border-[#f3951f]/40 rounded-xl flex items-center justify-between text-xs backdrop-blur-md">
                <span className="text-[#f3951f] font-mono font-semibold flex items-center gap-1.5">
                  <Clock size={14} /> Time Lens Date:
                </span>
                <input
                  type="date"
                  value={asOfDate}
                  min="2010-01-01"
                  max="2025-12-31"
                  onChange={e => setAsOfDate(e.target.value)}
                  className="bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1 text-xs text-[#f1f5f9] focus:outline-none focus:border-[#f3951f]"
                />
              </div>
            )}

            {mode === 'diff' && (
              <div className="mt-3 p-3 bg-[#0f172a]/90 border border-purple-500/40 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md">
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
                  <span className="text-[#64748b]">vs</span>
                  <input
                    type="date"
                    value={compareDates[1]}
                    onChange={e => setCompareDates([compareDates[0], e.target.value])}
                    className="bg-[#1e293b] border border-[#334155] rounded-lg px-2 py-1 text-xs text-[#f1f5f9]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Stream (Scrollable) */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-6 p-4 rounded-2xl bg-[#090d16]/70 border border-[#1e293b]/70 backdrop-blur-md max-h-[300px] space-y-3">
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} receipt={m.receipt} />
            ))}
            {diffData && <BeliefDiffViewer diff={diffData} />}
            {isLoading && (
              <div className="flex items-center gap-2 text-[#38bdf8] text-xs font-mono animate-pulse p-2">
                <RefreshCw size={12} className="animate-spin" />
                <span>Computing grounded first-principles response via Swytchcode...</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom Center: Press Notebook Clipboard Input */}
        <div className="mt-auto pb-4">
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
                ? "Enter topic to compare beliefs (e.g. 'Bitcoin', 'Artificial Intelligence', 'Politics')..."
                : mode === 'time'
                ? `Ask Elon as he knew on ${asOfDate} (e.g. 'What is the status of Model 3?')...`
                : "Type your question to Elon Musk / MuskMelon..."
            }
          />
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
        immersiveMode={immersiveMode}
        onToggleImmersive={() => setImmersiveMode(!immersiveMode)}
        messageCount={messages.length}
        topics={Array.from(topicsSet)}
        activeReceipt={activeReceipt}
        onClearCurrent={handleClearCurrent}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
