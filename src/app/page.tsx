'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Menu, Settings, Shield, Rocket, Clock, GitCompare,
  RefreshCw, X, Plus, Mic, MicOff, Send, Volume2, VolumeX, AlertCircle
} from 'lucide-react';
import { SessionsDrawer, ChatSession } from '@/components/sessions-drawer';
import { SettingsDrawer } from '@/components/settings-drawer';
import { BeliefDiffViewer } from '@/components/belief-diff-viewer';
import { speakText, stopSpeaking, createSpeechRecognizer } from '@/lib/voice';

type Mode = 'now' | 'time' | 'diff';

export default function Home() {
  const [mode, setMode] = useState<Mode>('now');
  const [asOfDate, setAsOfDate] = useState('2023-01-01');
  const [compareDates, setCompareDates] = useState<[string, string]>(['2021-02-01', '2021-06-01']);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [diffData, setDiffData] = useState<any>(null);

  // Panels & Settings state
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Date display
  const [currentDate, setCurrentDate] = useState('');

  // Sessions management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('session-default');

  // Refs
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      }));
    } catch { /* keep empty */ }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('muskmelon_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          if (parsed[0].messages?.length > 0) {
            setMessages(parsed[0].messages);
          }
          return;
        }
      }
    } catch {}

    const defaultSession: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'New Conversation',
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: []
    };
    setSessions([defaultSession]);
    setCurrentSessionId(defaultSession.id);
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
      try { localStorage.setItem('muskmelon_sessions', JSON.stringify(updated)); } catch {}
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
    try { localStorage.setItem('muskmelon_sessions', JSON.stringify(updated)); } catch {}
  };

  const handleSelectSession = (id: string) => {
    stopSpeaking();
    const target = sessions.find(s => s.id === id);
    if (target) {
      setCurrentSessionId(target.id);
      setMessages(target.messages || []);
      const lastAssis = [...(target.messages || [])].reverse().find(m => m.role === 'assistant');
      if (lastAssis?.receipt) setActiveReceipt(lastAssis.receipt);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    try { localStorage.setItem('muskmelon_sessions', JSON.stringify(updated)); } catch {}
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
          body: JSON.stringify({ topic: userMsg, date1: compareDates[0], date2: compareDates[1] })
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
            message: userMsg, mode,
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

  const handleMicToggle = () => {
    if (isListening) { setIsListening(false); return; }
    setVoiceError(null);
    const recognition = createSpeechRecognizer(
      (transcript) => { setInput(prev => prev ? `${prev} ${transcript}` : transcript); setIsListening(false); },
      () => { setIsListening(false); },
      (err) => { setVoiceError(err); setIsListening(false); }
    );
    if (recognition) {
      try { setIsListening(true); recognition.start(); }
      catch { setIsListening(false); }
    }
  };

  // Get the latest assistant response for the YOUR ANSWER card
  const latestAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

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
    <div className="relative h-screen w-screen bg-[#080b11] text-[#f1f5f9] overflow-hidden font-sans select-none">
      {/* ─── Full-bleed background scene (Elon at desk) ─── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/bg-elon-office.png"
          alt="Elon Musk Office Scene"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Top-edge dark fade */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        {/* Bottom-edge dark fade for notebook contrast */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
      </div>

      {/* ─── Top navigation bar (translucent) ─── */}
      <header className="relative z-30 flex items-center justify-between px-4 md:px-6 py-2.5 bg-black/30 backdrop-blur-sm border-b border-white/8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSessionsOpen(true)}
            className="p-2 rounded-xl bg-black/50 hover:bg-black/70 text-[#94a3b8] hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-mono"
            title="Chat Sessions"
          >
            <Menu size={15} />
            <span className="hidden sm:inline">Sessions</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[#f3951f] shadow-md shadow-[#f3951f]/20">
              <Image src="/muskmelon-logo.png" alt="MuskMelon Logo" fill className="object-cover" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider text-[#f1f5f9] drop-shadow-md">MUSKMELON</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f3951f]/20 text-[#f3951f] font-mono border border-[#f3951f]/40">
                X-TWIN
              </span>
            </div>
          </div>
        </div>

        {/* Center mode switcher */}
        <div className="flex items-center gap-0.5 bg-black/50 p-0.5 rounded-2xl border border-white/10 backdrop-blur-md">
          {([
            { key: 'now' as Mode, icon: Rocket, label: 'Now Mode (2025+)', short: 'Now', color: '#38bdf8' },
            { key: 'time' as Mode, icon: Clock, label: 'Time Lens', short: 'Time', color: '#f3951f' },
            { key: 'diff' as Mode, icon: GitCompare, label: 'Belief Diff', short: 'Diff', color: '#c084fc' },
          ]).map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                mode === m.key
                  ? 'text-slate-950 font-bold shadow-md'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
              style={mode === m.key ? { backgroundColor: m.color } : {}}
            >
              <m.icon size={12} />
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.short}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 border border-white/10 text-xs text-[#cbd5e1] font-medium transition-colors"
          >
            <Shield size={13} className="text-[#f3951f]" />
            <span>Admin</span>
          </Link>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-black/50 hover:bg-black/70 text-[#94a3b8] hover:text-white border border-white/10 transition-all"
            title="Settings & Memory"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* ─── Main Content Area ─── */}
      <main className="relative z-10 flex-1 h-[calc(100vh-52px)] flex">

        {/* ═══════════════════════════════════════════════
            LEFT HALF — Scene + "YOUR ANSWER" Card + Input
            ═══════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col justify-end relative">

          {/* ── "YOUR ANSWER" floating card ── */}
          <div className="absolute right-6 top-6 md:right-8 md:top-8 w-[280px] md:w-[320px] z-20">
            <div className="bg-[#1a1e2e]/85 backdrop-blur-md border border-white/12 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* Card header */}
              <div className="px-4 py-3 border-b border-white/10 bg-black/30">
                <h2
                  className="text-sm font-bold tracking-[0.2em] text-[#e2e8f0] uppercase"
                  style={{ fontFamily: "'Courier New', Courier, monospace" }}
                >
                  YOUR ANSWER
                </h2>
              </div>
              {/* Card body */}
              <div className="px-4 py-4 min-h-[120px] max-h-[320px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-[#38bdf8] text-xs font-mono animate-pulse">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Thinking through first principles...</span>
                  </div>
                ) : latestAssistantMsg ? (
                  <p
                    className="text-[13px] leading-relaxed text-[#cbd5e1] whitespace-pre-wrap"
                    style={{ fontFamily: "'Courier New', Georgia, serif" }}
                  >
                    {latestAssistantMsg.content}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Ask Elon a question below to see the response here...
                  </p>
                )}
              </div>
              {/* Confidence footer */}
              {latestAssistantMsg?.receipt && (
                <div className="px-4 py-2 border-t border-white/8 bg-black/20 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Grounding: {Math.round((latestAssistantMsg.receipt.groundingConfidence || 0.85) * 100)}%</span>
                  <span className="text-[#f3951f]">{latestAssistantMsg.receipt.sources?.length || 0} sources</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Mode-specific parameter bars ── */}
          <div className="px-4 md:px-8 mb-3">
            {mode === 'time' && (
              <div className="max-w-2xl mx-auto p-3 bg-black/70 border border-[#f3951f]/40 rounded-xl flex items-center justify-between text-xs backdrop-blur-md">
                <span className="text-[#f3951f] font-mono font-semibold flex items-center gap-1.5">
                  <Clock size={14} /> Knowledge As Of:
                </span>
                <input
                  type="date" value={asOfDate} min="2010-01-01" max="2025-12-31"
                  onChange={e => setAsOfDate(e.target.value)}
                  className="bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1 text-xs text-[#f1f5f9]"
                />
              </div>
            )}
            {mode === 'diff' && (
              <div className="max-w-2xl mx-auto p-3 bg-black/70 border border-purple-500/40 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md">
                <span className="text-purple-400 font-mono font-semibold flex items-center gap-1.5">
                  <GitCompare size={14} /> Compare Eras:
                </span>
                <div className="flex items-center gap-2">
                  <input type="date" value={compareDates[0]}
                    onChange={e => setCompareDates([e.target.value, compareDates[1]])}
                    className="bg-[#1e293b] border border-[#334155] rounded-lg px-2 py-1 text-xs text-[#f1f5f9]" />
                  <span className="text-slate-400 font-bold">vs</span>
                  <input type="date" value={compareDates[1]}
                    onChange={e => setCompareDates([compareDates[0], e.target.value])}
                    className="bg-[#1e293b] border border-[#334155] rounded-lg px-2 py-1 text-xs text-[#f1f5f9]" />
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════
              PRESS NOTEBOOK — Bottom center clipboard
              ═══════════════════════════════════════════ */}
          <div className="px-4 md:px-8 pb-5">
            <div className="relative max-w-2xl mx-auto">
              {/* Clipboard clip */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-gradient-to-b from-[#2a2926] to-[#1a1a18] rounded-t-lg border-t border-x border-[#403e39] z-20 shadow-md flex items-center justify-center">
                <div className="w-12 h-1.5 rounded-full bg-[#111110] border-b border-[#52504a]"></div>
              </div>

              {/* Paper card */}
              <div className="relative bg-[#f5f1e8] text-[#1c1917] rounded-xl shadow-[0_15px_35px_rgba(0,0,0,0.6)] border-4 border-[#33312b] pt-5 pb-3 px-5 transition-all focus-within:shadow-[0_20px_45px_rgba(243,149,31,0.2)] focus-within:border-[#4d483d]">
                {/* Lined paper */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-lg opacity-40"
                  style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #e3dac9 28px)' }}
                />

                {/* Header */}
                <div className="relative flex items-center justify-between border-b-2 border-[#b82a2a]/60 pb-2 mb-2">
                  <span className="font-mono text-xs md:text-sm font-bold text-[#b82a2a] tracking-widest uppercase">
                    PRESS NOTEBOOK
                  </span>
                  <span className="font-serif italic text-xs text-[#78716c]">{currentDate}</span>
                </div>

                {/* Text area + controls */}
                <form onSubmit={handleSubmit} className="relative z-10">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={
                      mode === 'diff' ? "Enter topic to compare beliefs (e.g. 'Bitcoin', 'AI')..."
                        : mode === 'time' ? `Ask Elon as he knew on ${asOfDate}...`
                        : "Type your question to Elon..."
                    }
                    maxLength={2000}
                    rows={2}
                    className="w-full bg-transparent text-[#1c1917] placeholder:text-[#a8a29e] placeholder:italic font-serif text-sm md:text-base focus:outline-none resize-none leading-7 min-h-[56px]"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
                    }}
                  />

                  {voiceError && (
                    <div className="flex items-center gap-1 text-xs text-red-600 mb-2 font-sans">
                      <AlertCircle size={13} /><span>{voiceError}</span>
                    </div>
                  )}

                  {/* Action bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#e2d8c3] mt-1">
                    <span className="font-mono text-[11px] text-[#78716c]">{input.length} / 2000</span>
                    <div className="flex items-center gap-2">
                      {/* Mic */}
                      <button
                        type="button" onClick={handleMicToggle}
                        title={isListening ? "Listening..." : "Voice Input"}
                        className={`p-2 rounded-lg transition-all ${
                          isListening
                            ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                            : 'bg-[#e7dfcf] hover:bg-[#dbd0bd] text-[#44403c]'
                        }`}
                      >
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                      {/* Ask button */}
                      <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#1e293b] hover:bg-[#0f172a] text-white rounded-lg font-mono text-xs md:text-sm font-semibold tracking-wide shadow transition-all disabled:opacity-40 disabled:pointer-events-none hover:shadow-md"
                      >
                        <span>Ask</span>
                        <Send size={14} className={isLoading ? 'animate-bounce' : ''} />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            RIGHT PANEL — Settings & Memory (Transcript)
            ═══════════════════════════════════════════════ */}
        <div className="hidden md:flex w-[340px] lg:w-[380px] flex-col bg-[#0c1322]/90 backdrop-blur-xl border-l border-white/10 shadow-2xl">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
            <div className="flex items-center gap-2">
              <Settings size={15} className="text-[#38bdf8]" />
              <span className="font-semibold text-xs text-[#f1f5f9] tracking-wider">
                Settings & Memory
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleNewSession} title="New Session" className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10">
                <Plus size={14} />
              </button>
              <button onClick={handleClearCurrent} title="Clear" className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Transcript stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-16 text-slate-500 italic text-xs">
                No messages yet. Ask Elon a question below.
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                    m.role === 'user' ? 'text-emerald-400' : 'text-[#38bdf8]'
                  }`}>
                    {m.role === 'user' ? 'USER' : 'ELON'}
                  </div>
                  <div className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-white/8">
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
            <div ref={transcriptEndRef} />
          </div>

          {/* Panel footer */}
          <div className="p-3 border-t border-white/10 bg-black/40 text-[10px] text-slate-500 flex items-center justify-between font-mono">
            <span>MuskMelon Twin v4.2</span>
            <span className="text-[#f3951f]">Swytchcode Guarded</span>
          </div>
        </div>
      </main>

      {/* ─── Drawers ─── */}
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
