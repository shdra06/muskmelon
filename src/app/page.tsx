'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Menu, Settings, Shield, Rocket, Clock, GitCompare,
  RefreshCw, X, Plus, Mic, MicOff, Send, Volume2, VolumeX,
  AlertCircle, CheckCircle2, ChevronRight, Sparkles, MessageSquare, ExternalLink
} from 'lucide-react';
import { SessionsDrawer, ChatSession } from '@/components/sessions-drawer';
import { SettingsDrawer } from '@/components/settings-drawer';
import { AnswerReceiptModal } from '@/components/answer-receipt';
import { BeliefDiffViewer } from '@/components/belief-diff-viewer';
import { speakText, stopSpeaking, createSpeechRecognizer } from '@/lib/voice';

type Mode = 'now' | 'time' | 'diff';
type CharacterState = 'idle' | 'thinking' | 'explaining' | 'vision';

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
      content: 'The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth. If consciousness is a tiny candle in a vast darkness, we must do everything possible to ensure that candle does not go out.',
      bulletPoints: [
        'Multi-planetary species',
        'Extend life beyond Earth',
        'Protect consciousness candle',
        'Sustainable energy on Earth'
      ],
      receipt: {
        groundingConfidence: 0.96,
        sources: [
          { source: 'SpaceX Starship Briefing', date: '2023-11-18' },
          { source: 'X / Twitter Post', date: '2024-03-12' }
        ]
      }
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [diffData, setDiffData] = useState<any>(null);
  const [characterState, setCharacterState] = useState<CharacterState>('idle');

  // UI state
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Voice Input state
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Date
  const [currentDate, setCurrentDate] = useState('Tuesday, August 23, 2026');

  // Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('session-default');

  // Refs
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }));
    } catch {}
  }, []);

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
      title: 'Civilization & Multiplanetary',
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: messages
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
    setCharacterState('idle');
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
    setCharacterState('idle');
  };

  const handleClearAll = () => {
    stopSpeaking();
    localStorage.removeItem('muskmelon_sessions');
    handleNewSession();
  };

  // Helper to extract key bullet points from text for the chalkboard
  const extractBulletPoints = (text: string): string[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const bullets: string[] = [];
    for (const line of lines) {
      const clean = line.replace(/^[-*•\d+.]\s*/, '').trim();
      if (clean.length > 3 && clean.length < 80 && !clean.toLowerCase().startsWith('ai identity') && !clean.toLowerCase().startsWith('from a')) {
        bullets.push(clean);
      }
      if (bullets.length >= 4) break;
    }
    if (bullets.length === 0) {
      // split by sentences
      const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10 && !s.toLowerCase().startsWith('ai identity'));
      return sentences.slice(0, 4);
    }
    return bullets;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    const newMsgList = [...messages, { role: 'user', content: userMsg }];
    saveSessionMessages(newMsgList);
    setIsLoading(true);
    setCharacterState('thinking');
    stopSpeaking();

    // Determine target character state based on prompt
    const lower = userMsg.toLowerCase();
    const isSpaceOrVision = lower.includes('space') || lower.includes('mars') || lower.includes('starship') || lower.includes('rocket') || lower.includes('future') || lower.includes('civilization');

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
        const finalMsgs = [...newMsgList, {
          role: 'assistant',
          content: replyText,
          bulletPoints: [
            `${compareDates[0]}: ${data.diff.period1?.position?.slice(0, 50) || 'Initial stance'}`,
            `${compareDates[1]}: ${data.diff.period2?.position?.slice(0, 50) || 'Updated stance'}`,
            'What changed: ' + (data.diff.whatChanged?.slice(0, 60) || 'Key evolution'),
            'Why: ' + (data.diff.whyChanged?.slice(0, 60) || 'Underlying reasons')
          ]
        }];
        saveSessionMessages(finalMsgs);
        setCharacterState(isSpaceOrVision ? 'vision' : 'explaining');
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
        const bullets = extractBulletPoints(data.message);
        const finalMsgs = [...newMsgList, {
          role: 'assistant',
          content: data.message,
          receipt: data.receipt,
          bulletPoints: bullets
        }];
        saveSessionMessages(finalMsgs);
        setCharacterState(isSpaceOrVision ? 'vision' : 'explaining');
        if (voiceEnabled) speakText(data.message, true);
      }
    } catch (error) {
      console.error(error);
      setCharacterState('idle');
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

  // Get latest assistant response
  const latestAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

  // Background scene switcher based on character state
  const getSceneBackground = () => {
    switch (characterState) {
      case 'thinking':
        return '/scenes/elon-smiling.jpg';
      case 'explaining':
        return '/scenes/elon-explaining.jpg';
      case 'vision':
        return '/scenes/elon-vision.jpg';
      case 'idle':
      default:
        return '/bg-elon-office.png';
    }
  };

  return (
    <div className="relative w-full h-screen min-h-screen bg-[#070a10] text-[#f1f5f9] overflow-hidden font-sans select-none flex flex-col">
      
      {/* ─── SCENE BACKGROUND IMAGE ─── */}
      <div 
        className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: `url('${getSceneBackground()}')`,
        }}
      >
        {/* Subtle cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* ─── TOP NAVIGATION BAR ─── */}
      <header className="relative z-30 flex items-center justify-between px-4 lg:px-6 py-2.5 bg-black/40 backdrop-blur-md border-b border-white/10 shrink-0">
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
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[#f3951f] shadow-md shadow-[#f3951f]/20 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/muskmelon-logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider text-white drop-shadow-md">MUSKMELON</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#f3951f]/25 text-[#f3951f] font-mono border border-[#f3951f]/40 font-bold">
                X-TWIN
              </span>
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1 bg-black/70 p-1 rounded-2xl border border-white/15 backdrop-blur-md shadow-inner">
          <button
            onClick={() => setMode('now')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'now'
                ? 'bg-[#38bdf8] text-slate-950 shadow-md shadow-[#38bdf8]/30'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Rocket size={12} />
            <span className="hidden sm:inline">Now Mode (2025+)</span>
            <span className="sm:hidden">Now</span>
          </button>

          <button
            onClick={() => setMode('time')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'time'
                ? 'bg-[#f3951f] text-slate-950 shadow-md shadow-[#f3951f]/30'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Clock size={12} />
            <span className="hidden sm:inline">Time Lens</span>
            <span className="sm:hidden">Time</span>
          </button>

          <button
            onClick={() => setMode('diff')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'diff'
                ? 'bg-purple-400 text-slate-950 shadow-md shadow-purple-400/30'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <GitCompare size={12} />
            <span className="hidden sm:inline">Belief Diff</span>
            <span className="sm:hidden">Diff</span>
          </button>
        </div>

        {/* Right Nav Icons */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 text-xs text-[#cbd5e1] font-medium transition-colors"
          >
            <Shield size={13} className="text-[#f3951f]" />
            <span>Dataset & Swytchcode</span>
          </Link>

          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className={`p-2 rounded-xl border transition-all text-xs flex items-center gap-1 ${
              showRightPanel 
                ? 'bg-[#38bdf8]/20 border-[#38bdf8]/50 text-[#38bdf8]' 
                : 'bg-black/60 border-white/15 text-[#94a3b8] hover:text-white'
            }`}
            title="Toggle Transcript Panel"
          >
            <MessageSquare size={14} />
            <span className="hidden lg:inline text-[11px] font-mono">Memory</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-[#94a3b8] hover:text-white border border-white/15 transition-all"
            title="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* ─── MAIN STAGE LAYOUT ─── */}
      <main className="relative z-10 flex-1 flex flex-row overflow-hidden">
        
        {/* LEFT & CENTER: SCENE + YOUR ANSWER STAND + PRESS NOTEBOOK */}
        <div className="flex-1 flex flex-col justify-between p-3 md:p-6 overflow-hidden relative">

          {/* TOP ERA/DATE CONTROLS (IF ACTIVE) */}
          <div className="z-20 w-full max-w-xl mx-auto">
            {mode === 'time' && (
              <div className="p-2.5 px-4 bg-black/80 border border-[#f3951f]/50 rounded-xl flex items-center justify-between text-xs backdrop-blur-md shadow-xl animate-fadeIn">
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
              <div className="p-2.5 px-4 bg-black/80 border border-purple-500/50 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md shadow-xl animate-fadeIn">
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
          </div>

          {/* MIDDLE: FLOATING "YOUR ANSWER" CHALKBOARD / TABLET CARD */}
          <div className="my-auto flex justify-end pr-0 md:pr-4 lg:pr-12 pointer-events-auto z-20">
            <div className="w-full max-w-[310px] md:max-w-[340px] bg-[#0f172a]/90 backdrop-blur-xl border-2 border-[#334155] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden transition-all">
              {/* Card Header (Chalkboard styling) */}
              <div className="px-4 py-2.5 border-b border-[#334155] bg-black/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span 
                    className="text-xs font-mono font-bold tracking-[0.2em] text-[#4ade80] uppercase"
                  >
                    YOUR ANSWER
                  </span>
                </div>
                {latestAssistantMsg?.receipt && (
                  <button
                    onClick={() => {
                      setSelectedReceipt(latestAssistantMsg.receipt);
                      setShowReceiptModal(true);
                    }}
                    className="text-[10px] font-mono text-[#38bdf8] hover:underline flex items-center gap-1 bg-[#38bdf8]/10 px-2 py-0.5 rounded border border-[#38bdf8]/30"
                  >
                    <span>Receipt</span>
                    <ExternalLink size={9} />
                  </button>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 min-h-[140px] max-h-[260px] overflow-y-auto space-y-2.5 text-xs">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-2 text-[#38bdf8]">
                    <RefreshCw size={22} className="animate-spin text-[#38bdf8]" />
                    <span className="font-mono text-xs animate-pulse">Reasoning from first principles...</span>
                  </div>
                ) : latestAssistantMsg ? (
                  <>
                    {/* Key structured bullet points (like in the illustration) */}
                    {latestAssistantMsg.bulletPoints && latestAssistantMsg.bulletPoints.length > 0 ? (
                      <div className="space-y-1.5">
                        {latestAssistantMsg.bulletPoints.map((bp: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-[#e2e8f0] font-mono text-[11px] leading-relaxed">
                            <span className="text-[#4ade80] font-bold">{i + 1}.</span>
                            <span>{bp}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-200 leading-relaxed font-sans text-xs whitespace-pre-wrap">
                        {latestAssistantMsg.content}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-slate-500 italic text-xs font-mono">
                    Ask Elon a question in the notebook below to view verified response.
                  </div>
                )}
              </div>

              {/* Card Footer (Grounding watermark) */}
              <div className="px-4 py-2 border-t border-[#334155] bg-black/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 size={11} /> Grounded AI
                </span>
                <span className="text-[#f3951f]">Swytchcode Protected</span>
              </div>
            </div>
          </div>

          {/* BOTTOM: PRESS NOTEBOOK CLIPBOARD INPUT */}
          <div className="w-full max-w-2xl mx-auto z-20 pb-2">
            <div className="relative w-full">
              {/* Clipboard clamp header */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-gradient-to-b from-[#33312b] to-[#1e1c18] rounded-t-lg border-t border-x border-[#52504a] z-20 shadow-lg flex items-center justify-center">
                <div className="w-14 h-1.5 rounded-full bg-[#0a0a09] border-b border-[#636058]" />
              </div>

              {/* Paper body */}
              <div className="relative bg-[#f7f4ec] text-[#1c1917] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] border-4 border-[#3a3731] pt-4 pb-3 px-4 md:px-6 transition-all focus-within:border-[#f3951f] focus-within:shadow-[0_25px_60px_rgba(243,149,31,0.25)]">
                {/* Lined paper texture background */}
                <div 
                  className="pointer-events-none absolute inset-0 rounded-xl opacity-35"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 26px, #d6cdbc 27px)'
                  }}
                />

                {/* Notebook Header Line */}
                <div className="relative flex items-center justify-between border-b-2 border-[#b82a2a]/70 pb-1.5 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs md:text-sm font-extrabold text-[#b82a2a] tracking-widest uppercase">
                      PRESS NOTEBOOK
                    </span>
                    <span className="text-[10px] bg-[#b82a2a]/15 text-[#b82a2a] px-1.5 py-0.2 rounded font-mono font-bold">
                      STARBASE BRIEFING
                    </span>
                  </div>
                  <span className="font-serif italic text-xs text-[#78716c]">
                    {currentDate}
                  </span>
                </div>

                {/* Textarea Form */}
                <form onSubmit={handleSubmit} className="relative z-10">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      mode === 'diff'
                        ? "Enter topic to compare beliefs (e.g. 'Bitcoin', 'AI', 'Politics')..."
                        : mode === 'time'
                        ? `Ask Elon as he knew on ${asOfDate} (e.g. 'Status of Falcon 9?')...`
                        : "Type your question to Elon..."
                    }
                    maxLength={2000}
                    rows={2}
                    className="w-full bg-transparent text-[#1c1917] placeholder:text-[#94a3b8] placeholder:italic font-serif text-sm md:text-base focus:outline-none resize-none leading-relaxed min-h-[50px]"
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

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#ded5c0] mt-1">
                    <span className="font-mono text-[11px] text-[#78716c]">
                      {input.length} / 2000
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Voice Mic Button */}
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

                      {/* Voice Output Speaker Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          if (voiceEnabled) stopSpeaking();
                          setVoiceEnabled(!voiceEnabled);
                        }}
                        title={voiceEnabled ? "Voice Output Active" : "Voice Output Muted"}
                        className={`p-2 rounded-xl transition-all ${
                          voiceEnabled 
                            ? 'bg-[#f3951f]/20 text-[#b45309] hover:bg-[#f3951f]/30' 
                            : 'bg-[#e5dccb] text-[#94a3b8] hover:bg-[#d8cebb]'
                        }`}
                      >
                        {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
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

        </div>

        {/* ─── RIGHT PANEL: "SETTINGS & MEMORY" (TRANSCRIPT & PROVENANCE) ─── */}
        {showRightPanel && (
          <aside className="w-full sm:w-96 lg:w-[390px] h-full bg-[#0c1322]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl z-30 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 shrink-0">
              <div className="flex items-center gap-2">
                <Settings size={15} className="text-[#38bdf8]" />
                <span className="font-bold text-xs text-white tracking-wider uppercase">
                  Settings & Memory
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  onClick={handleNewSession}
                  title="New Session"
                  className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Plus size={15} />
                </button>
                <button
                  onClick={handleClearCurrent}
                  title="Clear Messages"
                  className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Transcript Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {messages.length === 0 ? (
                <div className="text-center py-20 text-slate-500 italic text-xs font-mono space-y-2">
                  <MessageSquare size={24} className="mx-auto text-slate-600" />
                  <p>No messages in session.</p>
                  <p className="text-[10px]">Type your prompt in the Press Notebook.</p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className="space-y-1 group">
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                        m.role === 'user' ? 'text-[#4ade80]' : 'text-[#38bdf8]'
                      }`}>
                        {m.role === 'user' ? 'USER' : 'ELON'}
                      </span>
                      {m.role === 'assistant' && (
                        <button
                          onClick={() => speakText(m.content, true)}
                          title="Replay Voice"
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity p-0.5"
                        >
                          <Volume2 size={12} />
                        </button>
                      )}
                    </div>
                    <div className="text-slate-200 leading-relaxed whitespace-pre-wrap pl-2.5 border-l-2 border-white/15 text-xs font-sans">
                      {m.content}
                    </div>
                    {m.receipt && (
                      <div className="pl-2.5 pt-1">
                        <button
                          onClick={() => {
                            setSelectedReceipt(m.receipt);
                            setShowReceiptModal(true);
                          }}
                          className="text-[10px] font-mono text-[#f3951f] hover:underline flex items-center gap-1"
                        >
                          <span>Answer Receipt: {Math.round((m.receipt.groundingConfidence || 0.9) * 100)}% Grounded</span>
                          <ChevronRight size={10} />
                        </button>
                      </div>
                    )}
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
                  <span>Synthesizing verified knowledge...</span>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Footer Status */}
            <div className="p-3 border-t border-white/10 bg-black/60 text-[10px] text-slate-400 flex items-center justify-between font-mono shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>MuskMelon v4.2</span>
              </span>
              <span className="text-[#f3951f]">Swytchcode Guarded</span>
            </div>
          </aside>
        )}
      </main>

      {/* ─── MODALS & DRAWERS ─── */}
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
