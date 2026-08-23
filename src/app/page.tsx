'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Zap, Clock, GitCompare, Network, Trophy, Settings,
  Info, Mic, MicOff, Send, Volume2, VolumeX, RefreshCw, ExternalLink,
  ChevronRight, CheckCircle2, Shield, ArrowRight, Radio, Search, Database, Layers
} from 'lucide-react';
import { SessionsDrawer, ChatSession } from '@/components/sessions-drawer';
import { SettingsDrawer } from '@/components/settings-drawer';
import { AnswerReceiptModal } from '@/components/answer-receipt';
import { BeliefDiffViewer } from '@/components/belief-diff-viewer';
import { speakText, stopSpeaking, createSpeechRecognizer } from '@/lib/voice';

type NavTab = 'interview' | 'debate' | 'timeline' | 'memory-map' | 'challenge' | 'settings';
type Mode = 'now' | 'time' | 'diff';

interface SourceItem {
  id: string;
  type: 'Interview' | 'Podcast' | 'Speech' | 'Tweet' | 'Document';
  title: string;
  date: string;
  excerpt: string;
  url?: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('interview');
  const [mode, setMode] = useState<Mode>('now');
  const [asOfDate, setAsOfDate] = useState('2023-01-01');
  const [compareDates, setCompareDates] = useState<[string, string]>(['2021-02-01', '2021-06-01']);
  const [input, setInput] = useState('');
  
  // Active response state
  const [activeResponse, setActiveResponse] = useState<string>(
    "The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth and make humanity a spacefaring civilization. That is the long-term insurance for consciousness."
  );
  const [activeConfidence, setActiveConfidence] = useState<number>(91);
  const [activeSources, setActiveSources] = useState<SourceItem[]>([
    {
      id: '1',
      type: 'Interview',
      title: 'Elon Musk – Lex Fridman Podcast',
      date: 'Feb 27, 2023',
      excerpt: '...becoming a multiplanetary species is critical for the long-term future of consciousness...'
    },
    {
      id: '2',
      type: 'Podcast',
      title: 'Joe Rogan Experience #1470',
      date: 'Sep 7, 2020',
      excerpt: '...if there is a single point of failure on Earth, we are gone. Mars is insurance for civilization.'
    },
    {
      id: '3',
      type: 'Interview',
      title: '60 Minutes – Australia',
      date: 'May 15, 2017',
      excerpt: '...I think we want to become a spacefaring civilization and a multiplanet species.'
    }
  ]);

  // Workflow Pipeline active step (1 to 5)
  const [pipelineStep, setPipelineStep] = useState<number>(5);

  const [isLoading, setIsLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [diffData, setDiffData] = useState<any>(null);

  // Drawers
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Voice input
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Live Date
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState('May 13, 2025 • 10:42 AM');

  // Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('session-default');
  const [messages, setMessages] = useState<any[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setCurrentTimeFormatted(`${dateStr} • ${timeStr}`);
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setIsLoading(true);
    stopSpeaking();

    // Animate pipeline
    setPipelineStep(1);
    setTimeout(() => setPipelineStep(2), 300);
    setTimeout(() => setPipelineStep(3), 600);
    setTimeout(() => setPipelineStep(4), 900);

    const newMsgList = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgList);

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
        setActiveResponse(replyText);
        setActiveConfidence(89);
        setPipelineStep(5);
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
        setActiveResponse(data.message);
        setActiveReceipt(data.receipt);
        setActiveConfidence(Math.round((data.receipt?.groundingConfidence || 0.92) * 100));

        if (data.receipt?.sources && data.receipt.sources.length > 0) {
          const mappedSources: SourceItem[] = data.receipt.sources.map((s: any, idx: number) => ({
            id: String(idx + 1),
            type: s.sourceType === 'tweet' ? 'Tweet' : 'Interview',
            title: s.source || '@elonmusk public record',
            date: s.date || 'Verified Archive',
            excerpt: s.excerpt || s.content || 'Direct public statement from verified knowledge base.'
          }));
          setActiveSources(mappedSources);
        }

        setPipelineStep(5);
        if (voiceEnabled) speakText(data.message, true);
      }
    } catch (error) {
      console.error(error);
      setActiveResponse("I reason through first principles, but there was an error retrieving the grounded chunk for this request.");
      setPipelineStep(5);
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
    <div className="relative w-full min-h-screen bg-[#070b12] text-[#f1f5f9] font-sans overflow-x-hidden select-none flex flex-col justify-between">
      
      {/* ─── TOP APP BAR ─── */}
      <header className="relative z-30 flex items-center justify-between px-4 lg:px-6 py-2.5 bg-[#0a0f1a]/80 backdrop-blur-md border-b border-[#1b263b] shrink-0">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍉</span>
            <div>
              <div className="font-extrabold text-sm md:text-base tracking-wider text-white flex items-center gap-1.5">
                <span>MUSK MELON</span>
              </div>
              <div className="text-[9px] font-mono tracking-widest text-[#64748b] uppercase">
                KNOWLEDGE. CLONED.
              </div>
            </div>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="flex items-center gap-1 bg-[#0f172a] p-1 rounded-xl border border-[#1e293b] shadow-inner">
          <button
            onClick={() => setMode('now')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'now'
                ? 'bg-[#15803d] text-white shadow-md shadow-[#15803d]/40'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Zap size={12} />
            <span>Now Mode</span>
          </button>

          <button
            onClick={() => setMode('time')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'time'
                ? 'bg-[#f3951f] text-slate-950 shadow-md shadow-[#f3951f]/40 font-bold'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Clock size={12} />
            <span>Time Lens</span>
          </button>

          <button
            onClick={() => setMode('diff')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'diff'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/40'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <GitCompare size={12} />
            <span>Belief Diff</span>
          </button>
        </div>

        {/* Right Header Status Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0f291e] border border-[#15803d] rounded-full text-xs text-[#4ade80] font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
            <span>GROUNDED MODE</span>
          </div>

          <button
            onClick={() => setShowAboutModal(true)}
            className="flex items-center gap-1 px-3 py-1 bg-[#131d2e] hover:bg-[#1a273e] border border-[#1e293b] rounded-xl text-xs text-[#94a3b8] hover:text-white font-mono transition-colors"
          >
            <span>ABOUT PROJECT</span>
            <Info size={13} />
          </button>

          <Link
            href="/admin"
            className="hidden sm:flex items-center gap-1 px-3 py-1 bg-[#131d2e] hover:bg-[#1a273e] border border-[#1e293b] rounded-xl text-xs text-[#38bdf8] font-mono transition-colors"
          >
            <Database size={13} />
            <span>Swytchcode Admin</span>
          </Link>
        </div>
      </header>

      {/* ─── MAIN THREE-COLUMN WORKSPACE ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 p-3 lg:p-4 min-h-0">
        
        {/* ══════════════════════════════════════════════
            COLUMN 1: LEFT NAVIGATION & KNOWLEDGE COVERAGE (cols 1-2)
            ══════════════════════════════════════════════ */}
        <aside className="lg:col-span-2 flex flex-col justify-between bg-[#0b101b] border border-[#1b263b] rounded-2xl p-3 shadow-xl">
          
          {/* Navigation items */}
          <nav className="space-y-1.5">
            {[
              { key: 'interview' as NavTab, label: 'INTERVIEW', icon: MessageSquare },
              { key: 'debate' as NavTab, label: 'DEBATE', icon: Zap },
              { key: 'timeline' as NavTab, label: 'TIMELINE', icon: Clock },
              { key: 'memory-map' as NavTab, label: 'MEMORY MAP', icon: Network },
              { key: 'challenge' as NavTab, label: 'CHALLENGE', icon: Trophy },
              { key: 'settings' as NavTab, label: 'SETTINGS', icon: Settings }
            ].map(item => {
              const isActive = activeTab === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveTab(item.key);
                    if (item.key === 'settings') setIsSettingsOpen(true);
                    if (item.key === 'timeline') setMode('time');
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-mono text-xs tracking-wider transition-all ${
                    isActive
                      ? 'bg-[#0f291e] border border-[#15803d] text-[#4ade80] shadow-md shadow-[#15803d]/20 font-bold'
                      : 'text-[#94a3b8] hover:bg-[#131d2e] hover:text-[#f1f5f9]'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-[#4ade80]' : 'text-[#64748b]'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Knowledge Coverage Widget */}
          <div className="bg-[#0e1626] border border-[#1b263b] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] font-semibold text-[#cbd5e1] flex items-center gap-1">
                <span>KNOWLEDGE COVERAGE</span>
                <Info size={11} className="text-[#64748b]" />
              </span>
              <span className="font-mono text-xs font-bold text-[#4ade80]">87%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[#1b263b] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#15803d] to-[#4ade80] rounded-full w-[87%]" />
            </div>

            <p className="text-[10px] text-[#64748b] font-mono leading-tight">
              Based on 1,842 verified memories
            </p>

            <Link
              href="/admin"
              className="block w-full py-1.5 text-center bg-[#131d2e] hover:bg-[#1b2840] border border-[#1e293b] rounded-lg text-[11px] font-mono text-[#cbd5e1] hover:text-white transition-colors"
            >
              VIEW DATASET
            </Link>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════
            COLUMN 2: CENTER STAGE & PRESS NOTEBOOK (cols 3-8)
            ══════════════════════════════════════════════ */}
        <main className="lg:col-span-6 flex flex-col justify-between bg-[#0b101b] border border-[#1b263b] rounded-2xl overflow-hidden shadow-xl p-3 lg:p-4 relative">
          
          {/* Era / Time Lens Bar (Conditional) */}
          {mode === 'time' && (
            <div className="mb-2 p-2 px-3 bg-[#0e1626] border border-[#f3951f]/50 rounded-xl flex items-center justify-between text-xs z-20">
              <span className="text-[#f3951f] font-mono font-semibold flex items-center gap-1.5">
                <Clock size={13} /> Time Lens As Of:
              </span>
              <input
                type="date"
                value={asOfDate}
                min="2010-01-01"
                max="2025-12-31"
                onChange={e => setAsOfDate(e.target.value)}
                className="bg-[#1b263b] border border-[#334155] rounded-lg px-2 py-0.5 text-xs text-white font-mono"
              />
            </div>
          )}

          {mode === 'diff' && (
            <div className="mb-2 p-2 px-3 bg-[#0e1626] border border-purple-500/50 rounded-xl flex items-center justify-between text-xs z-20">
              <span className="text-purple-400 font-mono font-semibold flex items-center gap-1.5">
                <GitCompare size={13} /> Compare Eras:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={compareDates[0]}
                  onChange={e => setCompareDates([e.target.value, compareDates[1]])}
                  className="bg-[#1b263b] border border-[#334155] rounded px-1.5 py-0.5 text-xs text-white font-mono"
                />
                <span className="text-slate-400">vs</span>
                <input
                  type="date"
                  value={compareDates[1]}
                  onChange={e => setCompareDates([compareDates[0], e.target.value])}
                  className="bg-[#1b263b] border border-[#334155] rounded px-1.5 py-0.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Elon Desk Illustration Stage */}
          <div className="relative flex-1 min-h-[260px] md:min-h-[340px] rounded-xl overflow-hidden border border-[#1b263b] bg-black">
            <div
              className="absolute inset-0 bg-no-repeat bg-cover bg-center"
              style={{
                backgroundImage: "url('/scenes/elon-clean-stage.png')",
              }}
            />
            {/* Cinematic overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
          </div>

          {/* PRESS NOTEBOOK CLIPBOARD (PHYSICAL PROMPT INPUT) */}
          <div className="relative mt-3 z-20">
            {/* Clipboard clamp */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-gradient-to-b from-[#33312b] to-[#1e1c18] rounded-t-lg border-t border-x border-[#52504a] z-20 shadow-md flex items-center justify-center">
              <div className="w-12 h-1 rounded-full bg-[#0a0a09] border-b border-[#636058]" />
            </div>

            {/* Paper card */}
            <div className="relative bg-[#f6f2e9] text-[#1c1917] rounded-xl shadow-2xl border-4 border-[#33312b] pt-3.5 pb-2.5 px-4 md:px-5 transition-all focus-within:border-[#15803d]">
              {/* Lined paper texture */}
              <div
                className="pointer-events-none absolute inset-0 rounded-lg opacity-30"
                style={{
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 24px, #d6cdbc 25px)'
                }}
              />

              {/* Notebook Header */}
              <div className="relative flex items-center justify-between border-b border-[#b82a2a]/60 pb-1 mb-1.5">
                <span className="font-mono text-xs font-extrabold text-[#b82a2a] tracking-widest uppercase">
                  PRESS NOTEBOOK
                </span>
                <span className="font-serif italic text-[11px] text-[#78716c]">
                  {currentTimeFormatted}
                </span>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="relative z-10">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    mode === 'diff'
                      ? "Enter topic to compare beliefs (e.g. 'Bitcoin', 'AI')..."
                      : mode === 'time'
                      ? `Ask Elon as he knew on ${asOfDate}...`
                      : "What do you think about humanity's future?"
                  }
                  maxLength={2000}
                  rows={2}
                  className="w-full bg-transparent text-[#1c1917] placeholder:text-[#94a3b8] placeholder:italic font-serif text-sm focus:outline-none resize-none leading-relaxed min-h-[44px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />

                {voiceError && (
                  <div className="text-[11px] text-red-600 mb-1 font-sans">
                    {voiceError}
                  </div>
                )}

                {/* Footer bar */}
                <div className="flex items-center justify-between pt-1 border-t border-[#ded5c0] mt-1">
                  <span className="font-mono text-[10px] text-[#78716c]">
                    {input.length} / 2000
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMicToggle}
                      title={isListening ? "Listening..." : "Voice Input"}
                      className={`p-1.5 rounded-lg transition-all ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-[#e5dccb] hover:bg-[#d8cebb] text-[#44403c]'
                      }`}
                    >
                      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>

                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-[#4ade80] rounded-lg font-mono text-xs font-bold tracking-wider shadow transition-all disabled:opacity-40"
                    >
                      <span>ASK</span>
                      <Send size={12} className={isLoading ? 'animate-bounce' : ''} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* HOW MUSK MELON THINKS (5-STEP WORKFLOW PIPELINE) */}
          <div className="mt-3 bg-[#0e1626] border border-[#1b263b] rounded-xl p-2.5">
            <div className="text-[10px] font-mono font-bold text-[#4ade80] tracking-wider uppercase mb-2">
              HOW MUSK MELON THINKS
            </div>
            
            <div className="grid grid-cols-5 gap-1 text-center font-mono">
              {[
                { step: 1, label: 'Your Question', desc: 'Understanding your question' },
                { step: 2, label: 'Searching Memories', desc: 'Finding relevant information' },
                { step: 3, label: 'Evaluating Sources', desc: 'Ranking by relevance & credibility' },
                { step: 4, label: 'Generating Answer', desc: 'Synthesizing grounded response' },
                { step: 5, label: 'Delivering Answer', desc: 'Answer with sources & confidence' }
              ].map((item, idx) => {
                const isPassed = pipelineStep >= item.step;
                const isCurrent = pipelineStep === item.step;
                return (
                  <div key={item.step} className="relative flex flex-col items-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                      isCurrent && isLoading
                        ? 'bg-[#4ade80] text-black animate-spin'
                        : isPassed
                        ? 'bg-[#15803d] text-white'
                        : 'bg-[#1e293b] text-[#64748b]'
                    }`}>
                      {item.step}
                    </div>
                    <div className={`text-[10px] font-semibold leading-tight ${isPassed ? 'text-[#f1f5f9]' : 'text-[#64748b]'}`}>
                      {item.label}
                    </div>
                    <div className="text-[8px] text-[#64748b] leading-tight mt-0.5 hidden md:block">
                      {item.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </main>

        {/* ══════════════════════════════════════════════
            COLUMN 3: RIGHT PANEL (RESPONSE & SOURCE MEMORY) (cols 9-12)
            ══════════════════════════════════════════════ */}
        <aside className="lg:col-span-4 flex flex-col justify-between bg-[#0b101b] border border-[#1b263b] rounded-2xl p-4 shadow-xl space-y-4">
          
          {/* ELON MUSK RESPONSE CARD */}
          <div className="bg-[#0e1626] border border-[#1b263b] rounded-xl p-4 space-y-3 relative">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-2">
              <h2 className="text-base font-extrabold font-mono text-[#4ade80] tracking-wider">
                ELON MUSK
              </h2>
              <span className="font-serif italic text-xs text-[#4ade80]">
                Your Answer
              </span>
            </div>

            {/* Response Body */}
            <div className="min-h-[110px] max-h-[220px] overflow-y-auto text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
              {isLoading ? (
                <div className="flex items-center gap-2 text-[#38bdf8] font-mono py-8">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Synthesizing from first principles...</span>
                </div>
              ) : (
                activeResponse
              )}
            </div>

            {/* Response Footer / Audio Replay */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1b263b]/60">
              <button
                onClick={() => speakText(activeResponse, true)}
                className="text-[10px] font-mono text-[#94a3b8] hover:text-white flex items-center gap-1"
                title="Replay Voice Synthesizer"
              >
                <Volume2 size={12} className="text-[#f3951f]" />
                <span>Replay Voice</span>
              </button>
              <span className="text-xs">🍉</span>
            </div>
          </div>

          {/* SOURCES METADATA BAR */}
          <div className="flex items-center justify-between px-1 text-xs font-mono">
            <span className="text-[#94a3b8] flex items-center gap-1 text-[11px]">
              <Info size={12} />
              <span>{activeSources.length} SOURCES RETRIEVED</span>
            </span>
            <span className="font-bold text-[#4ade80] text-xs">
              {activeConfidence}% CONFIDENCE
            </span>
          </div>

          {/* SOURCE MEMORY LIST */}
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[320px] pr-1">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
              SOURCE MEMORY
            </div>

            {activeSources.map((src) => (
              <div
                key={src.id}
                className="p-3 bg-[#0e1626] border border-[#1b263b] rounded-xl hover:border-[#15803d]/60 transition-all text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#4ade80]">
                    <Radio size={12} />
                    <span>{src.type}</span>
                  </div>
                  <ExternalLink size={11} className="text-[#64748b]" />
                </div>

                <div className="text-slate-200 font-medium text-[11px]">
                  {src.title}
                </div>

                <div className="text-[10px] font-mono text-[#64748b]">
                  {src.date}
                </div>

                <p className="text-[11px] text-slate-400 italic leading-snug">
                  "{src.excerpt}"
                </p>
              </div>
            ))}
          </div>

          {/* Swytchcode Audit Badge */}
          <div className="p-2 bg-[#070d18] border border-[#1b263b] rounded-xl flex items-center justify-between text-[10px] font-mono text-[#64748b]">
            <span className="flex items-center gap-1 text-[#4ade80]">
              <CheckCircle2 size={11} /> Swytchcode Guarded
            </span>
            <span>Policy: Strict Grounding</span>
          </div>

        </aside>

      </div>

      {/* ─── MODALS & DRAWERS ─── */}
      <SessionsDrawer
        isOpen={isSessionsOpen}
        onClose={() => setIsSessionsOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => {
          setIsSessionsOpen(false);
        }}
        onNewSession={() => {}}
        onDeleteSession={() => {}}
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
        onClearCurrent={() => {}}
        onClearAll={() => {}}
      />

      {/* ABOUT PROJECT MODAL */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-[#334155] rounded-2xl shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍉</span>
                <h3 className="font-bold text-sm text-white">About Musk Melon (MindCommit)</h3>
              </div>
              <button onClick={() => setShowAboutModal(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              MuskMelon is a consent-based, version-controlled Knowledge Twin of Elon Musk built with Swytchcode middleware, Kaggle tweet dataset (2010–2025), and claim-level Answer Receipts.
            </p>

            <div className="p-3 bg-[#090d16] border border-[#1e293b] rounded-xl space-y-1.5 text-xs font-mono">
              <div className="text-[#4ade80] font-bold">Swytchcode 3-Integration Stack:</div>
              <div className="text-slate-300">• Google Drive (Approved knowledge ingestion)</div>
              <div className="text-slate-300">• Weaviate (Versioned semantic retrieval)</div>
              <div className="text-slate-300">• OpenAI / Gemini (Grounded generation)</div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-1.5 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold font-mono transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
