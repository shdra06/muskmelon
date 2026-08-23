'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Menu, Settings, Shield, Rocket, Clock, GitCompare,
  RefreshCw, X, Plus, Mic, MicOff, Send, Volume2, VolumeX,
  AlertCircle, CheckCircle2, ChevronRight, MessageSquare
} from 'lucide-react';
import { SessionsDrawer, ChatSession } from '@/components/sessions-drawer';
import { SettingsDrawer } from '@/components/settings-drawer';
import { AnswerReceiptModal } from '@/components/answer-receipt';
import { BeliefDiffViewer } from '@/components/belief-diff-viewer';
import { speakText, stopSpeaking, createSpeechRecognizer } from '@/lib/voice';

type Mode = 'now' | 'time' | 'diff';

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
      content: 'The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth.'
    },
    {
      role: 'user',
      content: 'Best investment according to you?'
    },
    {
      role: 'assistant',
      content: 'I believe in solving real problems. Areas like energy, AI, and space tech will drive the most impact.'
    },
    {
      role: 'user',
      content: 'How do you stay productive?'
    },
    {
      role: 'assistant',
      content: 'I try to allocate my time to things that are mission critical and eliminate as much as possible.'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [diffData, setDiffData] = useState<any>(null);

  // Drawers
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Voice input
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Date
  const [currentDate, setCurrentDate] = useState('Tuesday, May 13, 2025');

  // Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('session-default');

  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('muskmelon_chat_sessions');
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
      title: 'Civilization & Productivity',
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: messages
    };
    setSessions([defaultSession]);
    setCurrentSessionId(defaultSession.id);
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const saveSessionMessages = (newMessages: any[]) => {
    setMessages(newMessages);
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          return {
            ...s,
            title: firstUserMsg ? firstUserMsg.content.slice(0, 32) + '...' : s.title,
            messages: newMessages
          };
        }
        return s;
      });
      try {
        localStorage.setItem('muskmelon_chat_sessions', JSON.stringify(updated));
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
      localStorage.setItem('muskmelon_chat_sessions', JSON.stringify(updated));
    } catch {}
  };

  const handleSelectSession = (id: string) => {
    stopSpeaking();
    const target = sessions.find(s => s.id === id);
    if (target) {
      setCurrentSessionId(target.id);
      setMessages(target.messages || []);
      const lastAssis = [...(target.messages || [])].reverse().find(m => m.role === 'assistant');
      if (lastAssis?.receipt) {
        setActiveReceipt(lastAssis.receipt);
      }
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    try {
      localStorage.setItem('muskmelon_chat_sessions', JSON.stringify(updated));
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
    localStorage.removeItem('muskmelon_chat_sessions');
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
        const finalMsgs = [...newMsgList, {
          role: 'assistant',
          content: data.message,
          receipt: data.receipt
        }];
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
    if (isListening) {
      setIsListening(false);
      return;
    }
    setVoiceError(null);
    const recognition = createSpeechRecognizer(
      (transcript) => {
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      },
      (err) => {
        setVoiceError(err);
        setIsListening(false);
      }
    );
    if (recognition) {
      try {
        setIsListening(true);
        recognition.start();
      } catch {
        setIsListening(false);
      }
    }
  };

  return (
    <div className="relative w-full h-screen min-h-screen bg-[#080c14] text-[#f1f5f9] overflow-hidden font-sans select-none flex flex-col">
      
      {/* ─── FULL BACKGROUND ARTWORK (Elon Office Scene) ─── */}
      <div 
        className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-center"
        style={{
          backgroundImage: "url('/bg-elon-office.png')",
        }}
      >
        <div className="absolute inset-0 bg-black/25 pointer-events-none" />
      </div>

      {/* ─── TOP HEADER BAR ─── */}
      <header className="relative z-30 flex items-center justify-between px-4 md:px-6 py-2 bg-black/50 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSessionsOpen(true)}
            className="p-1.5 px-2.5 rounded-xl bg-black/60 hover:bg-black/90 text-[#94a3b8] hover:text-white border border-white/15 transition-all flex items-center gap-1.5 text-xs font-mono"
            title="Chat Sessions"
          >
            <Menu size={14} />
            <span className="hidden sm:inline">Sessions</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f3951f] shadow-md shadow-[#f3951f]/50" />
            <span className="font-mono font-bold text-sm tracking-wider text-white">
              ELON MUSK <span className="text-[#f3951f] text-xs font-semibold px-1.5 py-0.2 rounded bg-[#f3951f]/20 border border-[#f3951f]/30">TWIN</span>
            </span>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="flex items-center gap-1 bg-black/70 p-1 rounded-2xl border border-white/15 backdrop-blur-md">
          <button
            onClick={() => setMode('now')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'now'
                ? 'bg-[#38bdf8] text-slate-950 shadow-md shadow-[#38bdf8]/40'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Rocket size={12} />
            <span>Now Mode</span>
          </button>

          <button
            onClick={() => setMode('time')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'time'
                ? 'bg-[#f3951f] text-slate-950 shadow-md shadow-[#f3951f]/40'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Clock size={12} />
            <span>Time Lens</span>
          </button>

          <button
            onClick={() => setMode('diff')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'diff'
                ? 'bg-purple-400 text-slate-950 shadow-md shadow-purple-400/40'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <GitCompare size={12} />
            <span>Belief Diff</span>
          </button>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 text-xs text-[#cbd5e1] font-medium transition-colors"
          >
            <Shield size={13} className="text-[#f3951f]" />
            <span>Dataset & Swytchcode</span>
          </Link>

          <button
            onClick={() => {
              if (voiceEnabled) stopSpeaking();
              setVoiceEnabled(!voiceEnabled);
            }}
            className={`p-2 rounded-xl border transition-all ${
              voiceEnabled
                ? 'bg-[#f3951f]/20 border-[#f3951f]/50 text-[#f3951f]'
                : 'bg-black/60 border-white/15 text-slate-400 hover:text-white'
            }`}
            title={voiceEnabled ? "Voice Output Active" : "Voice Output Muted"}
          >
            {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-[#94a3b8] hover:text-white border border-white/15 transition-all"
            title="Settings & Tools"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* ─── MAIN STAGE (TWO COLUMNS: DESK INTERFACE ON LEFT, CHAT ON RIGHT) ─── */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-stretch justify-between p-3 md:p-6 gap-4 overflow-hidden">

        {/* ═══════════════════════════════════════════════════════════
            LEFT / CENTER COLUMN: DESK STAGE & PRESS NOTEBOOK PROMPT BOX
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col justify-end items-center relative z-20">

          {/* Mode-specific Era Selector Banner */}
          {mode === 'time' && (
            <div className="w-full max-w-xl mb-3 p-2.5 px-4 bg-black/85 border border-[#f3951f]/60 rounded-xl flex items-center justify-between text-xs backdrop-blur-md shadow-2xl">
              <span className="text-[#f3951f] font-mono font-semibold flex items-center gap-1.5">
                <Clock size={14} /> Knowledge As Of Date:
              </span>
              <input
                type="date"
                value={asOfDate}
                min="2010-01-01"
                max="2025-12-31"
                onChange={e => setAsOfDate(e.target.value)}
                className="bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1 text-xs text-white font-mono"
              />
            </div>
          )}

          {mode === 'diff' && (
            <div className="w-full max-w-xl mb-3 p-2.5 px-4 bg-black/85 border border-purple-500/60 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md shadow-2xl">
              <span className="text-purple-400 font-mono font-semibold flex items-center gap-1.5">
                <GitCompare size={14} /> Compare Two Eras:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={compareDates[0]}
                  onChange={e => setCompareDates([e.target.value, compareDates[1]])}
                  className="bg-[#1e293b] border border-[#334155] rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
                <span className="text-slate-400 font-bold">vs</span>
                <input
                  type="date"
                  value={compareDates[1]}
                  onChange={e => setCompareDates([compareDates[0], e.target.value])}
                  className="bg-[#1e293b] border border-[#334155] rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* PRESS NOTEBOOK CLIPBOARD (PHYSICAL PROMPT INPUT) */}
          <div className="w-full max-w-2xl relative">
            {/* Clamp header on top of clipboard */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-gradient-to-b from-[#33312b] to-[#1e1c18] rounded-t-lg border-t border-x border-[#52504a] z-20 shadow-lg flex items-center justify-center">
              <div className="w-14 h-1.5 rounded-full bg-[#0a0a09] border-b border-[#636058]" />
            </div>

            {/* Notepad Paper Box */}
            <div className="relative bg-[#f8f5ee] text-[#1c1917] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border-4 border-[#3a3731] pt-4 pb-3 px-5 transition-all focus-within:border-[#f3951f] focus-within:shadow-[0_30px_70px_rgba(243,149,31,0.25)]">
              {/* Lined paper texture */}
              <div 
                className="pointer-events-none absolute inset-0 rounded-xl opacity-30"
                style={{
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 26px, #d6cdbc 27px)'
                }}
              />

              {/* Notepad Header */}
              <div className="relative flex items-center justify-between border-b-2 border-[#b82a2a]/70 pb-1.5 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs md:text-sm font-extrabold text-[#b82a2a] tracking-widest uppercase">
                    PRESS NOTEBOOK
                  </span>
                </div>
                <span className="font-serif italic text-xs text-[#78716c]">
                  {currentDate}
                </span>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSubmit} className="relative z-10">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    mode === 'diff'
                      ? "Enter topic to compare beliefs (e.g. 'Bitcoin', 'AI', 'Twitter')..."
                      : mode === 'time'
                      ? `Ask Elon as he knew on ${asOfDate} (e.g. 'Status of Falcon 9?')...`
                      : "Type your question to Elon..."
                  }
                  maxLength={2000}
                  rows={2}
                  className="w-full bg-transparent text-[#1c1917] placeholder:text-[#94a3b8] placeholder:italic font-serif text-sm md:text-base focus:outline-none resize-none leading-relaxed min-h-[52px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />

                {voiceError && (
                  <div className="flex items-center gap-1 text-xs text-red-600 mb-1 font-sans">
                    <AlertCircle size={12} />
                    <span>{voiceError}</span>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-1.5 border-t border-[#ded5c0] mt-1">
                  <span className="font-mono text-[11px] text-[#78716c]">
                    {input.length} / 2000
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Microphone button */}
                    <button
                      type="button"
                      onClick={handleMicToggle}
                      title={isListening ? "Listening... Click to stop" : "Voice Input (Speech-to-Text)"}
                      className={`p-2 rounded-xl transition-all ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/40' 
                          : 'bg-[#e5dccb] hover:bg-[#d8cebb] text-[#44403c]'
                      }`}
                    >
                      {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>

                    {/* Ask Button */}
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="flex items-center gap-1.5 px-5 py-2 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-xl font-mono text-xs md:text-sm font-bold tracking-wider shadow-md transition-all disabled:opacity-40 disabled:pointer-events-none hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>Ask</span>
                      <Send size={13} className={isLoading ? 'animate-bounce' : ''} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            RIGHT COLUMN: "SETTINGS & MEMORY" CHAT INTERFACE WINDOW
            ═══════════════════════════════════════════════════════════ */}
        <aside className="w-full lg:w-[410px] h-[480px] lg:h-[calc(100vh-80px)] bg-[#0d1424]/95 backdrop-blur-2xl border border-white/15 rounded-2xl flex flex-col shadow-2xl overflow-hidden z-20 shrink-0">
          
          {/* Chat Window Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50 shrink-0">
            <div className="flex items-center gap-2">
              <Settings size={15} className="text-[#38bdf8]" />
              <h2 className="font-bold text-xs text-white tracking-wider">
                Settings & Memory
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <button
                onClick={handleNewSession}
                title="New Chat Session"
                className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <Plus size={15} />
              </button>
              <button
                onClick={handleClearCurrent}
                title="Clear Current Messages"
                className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div 
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans"
          >
            {messages.length === 0 ? (
              <div className="text-center py-24 text-slate-500 italic text-xs font-mono space-y-2">
                <MessageSquare size={26} className="mx-auto text-slate-600" />
                <p className="text-slate-400">No active messages in this session.</p>
                <p className="text-[11px] text-slate-500">Ask Elon a question in the Press Notebook.</p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className="space-y-1 group animate-fadeIn">
                  {/* Sender Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-[11px] font-bold tracking-wider ${
                      m.role === 'user' ? 'text-[#4ade80]' : 'text-[#38bdf8]'
                    }`}>
                      {m.role === 'user' ? 'USER' : 'ELON'}
                    </span>
                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => speakText(m.content, true)}
                          title="Replay Voice"
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Message Bubble Content */}
                  <div className="text-slate-200 leading-relaxed whitespace-pre-wrap pl-2.5 border-l-2 border-white/10 text-xs">
                    {m.content}
                  </div>

                  {/* Answer Receipt provenance pill */}
                  {m.receipt && (
                    <div className="pl-2.5 pt-1">
                      <button
                        onClick={() => {
                          setSelectedReceipt(m.receipt);
                          setShowReceiptModal(true);
                        }}
                        className="text-[10px] font-mono text-[#f3951f] hover:underline flex items-center gap-1 bg-[#f3951f]/10 px-2 py-0.5 rounded border border-[#f3951f]/20"
                      >
                        <CheckCircle2 size={10} className="text-emerald-400" />
                        <span>Answer Receipt: {Math.round((m.receipt.groundingConfidence || 0.94) * 100)}% Grounded</span>
                        <ChevronRight size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Belief Diff Viewer card if in diff mode */}
            {diffData && (
              <div className="pt-2">
                <BeliefDiffViewer diff={diffData} />
              </div>
            )}

            {/* Thinking / Reasoning state */}
            {isLoading && (
              <div className="flex items-center gap-2 text-[#38bdf8] text-xs font-mono animate-pulse pt-2 pl-2">
                <RefreshCw size={13} className="animate-spin text-[#38bdf8]" />
                <span>Reasoning from first principles...</span>
              </div>
            )}
          </div>

          {/* Chat Window Footer */}
          <div className="p-3 border-t border-white/10 bg-black/60 text-[10px] text-slate-400 flex items-center justify-between font-mono shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>MuskMelon v4.2</span>
            </span>
            <span className="text-[#f3951f]">Swytchcode Guarded</span>
          </div>
        </aside>

      </main>

      {/* ─── MODALS & SLIDEOUT DRAWERS ─── */}
      <SessionsDrawer
        isOpen={isSessionsOpen}
        onClose={() => setIsSessionsOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => {
          handleSelectSession(id);
          setIsSessionsOpen(false);
        }}
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
        topics={['Tesla', 'SpaceX', 'xAI', 'Neuralink', 'Mars', 'Crypto', 'First Principles']}
        activeReceipt={activeReceipt}
        onClearCurrent={handleClearCurrent}
        onClearAll={handleClearAll}
      />

      {showReceiptModal && selectedReceipt && (
        <AnswerReceiptModal
          receipt={selectedReceipt}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}
