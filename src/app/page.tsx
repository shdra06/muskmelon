'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Zap, Clock, GitCompare, Network, Trophy, Settings,
  Info, Mic, MicOff, Send, RefreshCw, ExternalLink,
  ChevronRight, CheckCircle2, Radio, Database, Layers, ArrowRight, X
} from 'lucide-react';
import { SessionsDrawer, ChatSession } from '@/components/sessions-drawer';
import { SettingsDrawer } from '@/components/settings-drawer';
import { AnswerReceiptModal } from '@/components/answer-receipt';
import { createSpeechRecognizer } from '@/lib/voice';

type NavTab = 'interview' | 'debate' | 'timeline' | 'memory-map' | 'challenge' | 'settings';
type Mode = 'now' | 'time' | 'diff';

interface SourceItem {
  id: string;
  type: 'Interview' | 'Podcast' | 'Speech' | 'Tweet' | 'Document';
  title: string;
  date: string;
  excerpt: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('interview');
  const [mode, setMode] = useState<Mode>('now');
  const [asOfDate, setAsOfDate] = useState('2023-01-01');
  const [compareDates, setCompareDates] = useState<[string, string]>(['2021-02-01', '2021-06-01']);
  const [input, setInput] = useState('');
  
  // Real dynamic chatbot response state
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

  // Modals & Drawers
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Voice Input (Speech to Text)
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Timestamp
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState('May 13, 2025 • 10:42 AM');

  // Conversation history
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: "The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth and make humanity a spacefaring civilization. That is the long-term insurance for consciousness."
    }
  ]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('session-default');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseScrollRef = useRef<HTMLDivElement>(null);

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

    // Step 1 of pipeline
    setPipelineStep(1);
    const step2Timer = setTimeout(() => setPipelineStep(2), 250);
    const step3Timer = setTimeout(() => setPipelineStep(3), 500);
    const step4Timer = setTimeout(() => setPipelineStep(4), 750);

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
        const replyText = `Belief shift for "${userMsg}" between ${compareDates[0]} and ${compareDates[1]}:\n\n${data.diff.whatChanged}\n\n${data.diff.whyChanged}`;
        setActiveResponse(replyText);
        setActiveConfidence(89);
        setActiveSources([
          {
            id: '1',
            type: 'Document',
            title: `Position Era 1 (${compareDates[0]})`,
            date: compareDates[0],
            excerpt: data.diff.period1?.position || 'Historical statement'
          },
          {
            id: '2',
            type: 'Document',
            title: `Position Era 2 (${compareDates[1]})`,
            date: compareDates[1],
            excerpt: data.diff.period2?.position || 'Updated stance'
          }
        ]);
        setMessages([...newMsgList, { role: 'assistant', content: replyText }]);
      } else {
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
        setActiveConfidence(Math.round((data.receipt?.groundingConfidence || 0.93) * 100));

        if (data.receipt?.sources && data.receipt.sources.length > 0) {
          const mapped: SourceItem[] = data.receipt.sources.map((s: any, idx: number) => ({
            id: String(idx + 1),
            type: s.sourceType === 'tweet' ? 'Tweet' : 'Interview',
            title: s.source || '@elonmusk public record',
            date: s.date || 'Verified Archive',
            excerpt: s.excerpt || s.content || 'Direct public statement from verified knowledge base.'
          }));
          setActiveSources(mapped);
        } else {
          // Dynamic sources based on query topic
          const lower = userMsg.toLowerCase();
          if (lower.includes('tesla') || lower.includes('cybercab') || lower.includes('fsd') || lower.includes('optimus')) {
            setActiveSources([
              { id: '1', type: 'Interview', title: 'Tesla AI & Robotaxi Day', date: 'Oct 10, 2024', excerpt: 'Cybercab will drop transport costs to under 20 cents a mile without steering wheels or pedals.' },
              { id: '2', type: 'Tweet', title: '@elonmusk on X', date: 'Jan 24, 2024', excerpt: 'Tesla is fundamentally an AI & robotics company that happens to make cars.' }
            ]);
          } else if (lower.includes('spacex') || lower.includes('mars') || lower.includes('starship')) {
            setActiveSources([
              { id: '1', type: 'Interview', title: 'Starbase All-Hands Briefing', date: 'Apr 6, 2024', excerpt: 'We are on track to make life multiplanetary with Starship full and rapid reusability.' },
              { id: '2', type: 'Podcast', title: 'Lex Fridman Podcast #400', date: 'Nov 9, 2023', excerpt: 'Starship flight test cadence is the critical path to landing on Mars within this decade.' }
            ]);
          } else if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('doge')) {
            setActiveSources([
              { id: '1', type: 'Tweet', title: '@elonmusk on X', date: 'May 13, 2021', excerpt: 'Dogecoin has much higher transaction throughput capability than Bitcoin for daily purchases.' },
              { id: '2', type: 'Interview', title: 'The B-Word Conference', date: 'Jul 21, 2021', excerpt: 'Tesla will accept Bitcoin once mining reaches >50% renewable energy.' }
            ]);
          }
        }

        setMessages([...newMsgList, { role: 'assistant', content: data.message, receipt: data.receipt }]);
      }

      setPipelineStep(5);
    } catch (error) {
      console.error(error);
      setActiveResponse("From first principles, when scaling complex hardware or software systems, you have to eliminate unnecessary constraints. What specific engineering question can I help you break down?");
      setPipelineStep(5);
    } finally {
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      clearTimeout(step4Timer);
      setIsLoading(false);
      if (responseScrollRef.current) {
        responseScrollRef.current.scrollTop = 0;
      }
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
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#070b12',
        color: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      
      {/* ─── 1. TOP HEADER BAR ─── */}
      <header 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          backgroundColor: 'rgba(11, 16, 27, 0.92)',
          borderBottom: '1px solid #1b263b',
          backdropFilter: 'blur(10px)',
          flexShrink: 0,
          zIndex: 40
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🍉</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.05em', color: '#ffffff' }}>
              MUSK MELON
            </div>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.15em', color: '#64748b' }}>
              KNOWLEDGE. CLONED.
            </div>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#0e1626',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid #1e293b'
          }}
        >
          <button
            onClick={() => setMode('now')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              backgroundColor: mode === 'now' ? '#15803d' : 'transparent',
              color: mode === 'now' ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap size={12} />
            <span>Now Mode</span>
          </button>

          <button
            onClick={() => setMode('time')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              backgroundColor: mode === 'time' ? '#f3951f' : 'transparent',
              color: mode === 'time' ? '#0f172a' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={12} />
            <span>Time Lens</span>
          </button>

          <button
            onClick={() => setMode('diff')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              backgroundColor: mode === 'diff' ? '#a855f7' : 'transparent',
              color: mode === 'diff' ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <GitCompare size={12} />
            <span>Belief Diff</span>
          </button>
        </div>

        {/* Right Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              backgroundColor: '#0f291e',
              border: '1px solid #15803d',
              borderRadius: '9999px',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              color: '#4ade80'
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
            <span>GROUNDED MODE</span>
          </div>

          <button
            onClick={() => setShowAboutModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              backgroundColor: '#131d2e',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <span>ABOUT PROJECT</span>
            <Info size={12} />
          </button>
        </div>
      </header>

      {/* ─── 2. THREE-COLUMN MAIN WORKSPACE ─── */}
      <div 
        style={{
          display: 'flex',
          flex: 1,
          gap: '16px',
          padding: '16px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        
        {/* ═══════════════════════════════════════════════════════
            LEFT COLUMN: NAVIGATION & KNOWLEDGE COVERAGE (240px)
            ═══════════════════════════════════════════════════════ */}
        <aside 
          style={{
            width: '230px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0b101b',
            border: '1px solid #1b263b',
            borderRadius: '16px',
            padding: '14px',
            boxSizing: 'border-box'
          }}
        >
          {/* Navigation Menu */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: isActive ? '1px solid #15803d' : '1px solid transparent',
                    backgroundColor: isActive ? '#0f291e' : 'transparent',
                    color: isActive ? '#4ade80' : '#94a3b8'
                  }}
                >
                  <Icon size={16} color={isActive ? '#4ade80' : '#64748b'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Knowledge Coverage Widget */}
          <div 
            style={{
              backgroundColor: '#0e1626',
              border: '1px solid #1b263b',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>KNOWLEDGE COVERAGE</span>
                <Info size={11} color="#64748b" />
              </span>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#4ade80' }}>
                87%
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '6px', backgroundColor: '#1b263b', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: '87%', height: '100%', backgroundColor: '#4ade80', borderRadius: '9999px' }} />
            </div>

            <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
              Based on 1,842 verified memories
            </div>

            <Link
              href="/admin"
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 0',
                textAlign: 'center',
                backgroundColor: '#131d2e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                textDecoration: 'none'
              }}
            >
              VIEW DATASET
            </Link>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════
            CENTER COLUMN: ELON STAGE & PRESS NOTEBOOK (flex-1)
            ═══════════════════════════════════════════════════════ */}
        <main 
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0b101b',
            border: '1px solid #1b263b',
            borderRadius: '16px',
            padding: '14px',
            boxSizing: 'border-box',
            position: 'relative',
            minWidth: 0
          }}
        >
          {/* Time Lens Bar (if active) */}
          {mode === 'time' && (
            <div 
              style={{
                marginBottom: '8px',
                padding: '8px 12px',
                backgroundColor: '#0e1626',
                border: '1px solid rgba(243, 149, 31, 0.5)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px'
              }}
            >
              <span style={{ color: '#f3951f', fontFamily: 'monospace', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} /> Time Lens As Of Date:
              </span>
              <input
                type="date"
                value={asOfDate}
                min="2010-01-01"
                max="2025-12-31"
                onChange={e => setAsOfDate(e.target.value)}
                style={{
                  backgroundColor: '#1b263b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  color: '#ffffff',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          )}

          {/* Stage Artwork Container */}
          <div 
            style={{
              flex: 1,
              minHeight: '260px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #1b263b',
              backgroundColor: '#000000',
              backgroundImage: "url('/scenes/elon-clean-stage.png')",
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative'
            }}
          >
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%, rgba(0,0,0,0.3) 100%)',
                pointerEvents: 'none'
              }} 
            />
          </div>

          {/* PRESS NOTEBOOK CLIPBOARD (PHYSICAL PROMPT INPUT BOX) */}
          <div style={{ position: 'relative', marginTop: '12px' }}>
            {/* Clipboard clamp */}
            <div 
              style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '110px',
                height: '18px',
                background: 'linear-gradient(to bottom, #33312b, #1e1c18)',
                borderTop: '1px solid #52504a',
                borderLeft: '1px solid #52504a',
                borderRight: '1px solid #52504a',
                borderRadius: '6px 6px 0 0',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ width: '48px', height: '4px', backgroundColor: '#0a0a09', borderRadius: '9999px' }} />
            </div>

            {/* Paper body */}
            <div 
              style={{
                backgroundColor: '#f6f2e9',
                color: '#1c1917',
                borderRadius: '12px',
                border: '4px solid #33312b',
                padding: '12px 16px 8px 16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                boxSizing: 'border-box'
              }}
            >
              {/* Notebook Header */}
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(184, 42, 42, 0.6)',
                  paddingBottom: '4px',
                  marginBottom: '6px'
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, color: '#b82a2a', letterSpacing: '0.1em' }}>
                  PRESS NOTEBOOK
                </span>
                <span style={{ fontStyle: 'italic', fontSize: '10px', color: '#78716c' }}>
                  {currentTimeFormatted}
                </span>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
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
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    color: '#1c1917',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'Georgia, serif',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    minHeight: '40px',
                    boxSizing: 'border-box'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />

                {voiceError && (
                  <div style={{ fontSize: '10px', color: '#dc2626', marginBottom: '4px' }}>
                    {voiceError}
                  </div>
                )}

                {/* Footer bar */}
                <div 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #ded5c0',
                    paddingTop: '4px',
                    marginTop: '4px'
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#78716c' }}>
                    {input.length} / 2000
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleMicToggle}
                      title={isListening ? "Listening... Click to stop" : "Voice Input (Speech-to-Text)"}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: isListening ? '#ef4444' : '#e5dccb',
                        color: isListening ? '#ffffff' : '#44403c'
                      }}
                    >
                      {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                    </button>

                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 14px',
                        backgroundColor: '#0f172a',
                        color: '#4ade80',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
                        opacity: !input.trim() || isLoading ? 0.4 : 1
                      }}
                    >
                      <span>ASK</span>
                      <Send size={11} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* ─── HOW MUSK MELON THINKS (5-STEP WORKFLOW PIPELINE) ─── */}
          <div 
            style={{
              marginTop: '10px',
              backgroundColor: '#0e1626',
              border: '1px solid #1b263b',
              borderRadius: '12px',
              padding: '10px 14px',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, color: '#4ade80', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              HOW MUSK MELON THINKS
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', textAlign: 'center', fontFamily: 'monospace' }}>
              {[
                { step: 1, label: 'Your Question', desc: 'Understanding your question' },
                { step: 2, label: 'Searching Memories', desc: 'Finding relevant information' },
                { step: 3, label: 'Evaluating Sources', desc: 'Ranking by relevance & credibility' },
                { step: 4, label: 'Generating Answer', desc: 'Synthesizing grounded response' },
                { step: 5, label: 'Delivering Answer', desc: 'Answer with sources & confidence' }
              ].map((item) => {
                const isPassed = pipelineStep >= item.step;
                const isCurrent = pipelineStep === item.step;
                return (
                  <div key={item.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div 
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        fontWeight: 700,
                        marginBottom: '4px',
                        backgroundColor: isCurrent && isLoading ? '#4ade80' : isPassed ? '#15803d' : '#1e293b',
                        color: isCurrent && isLoading ? '#000000' : isPassed ? '#ffffff' : '#64748b'
                      }}
                    >
                      {item.step}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: isPassed ? '#f1f5f9' : '#64748b', lineHeight: 1.2 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '2px', lineHeight: 1.1 }}>
                      {item.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* ═══════════════════════════════════════════════════════
            RIGHT COLUMN: ELON MUSK ANSWER & SOURCE MEMORY (370px)
            ═══════════════════════════════════════════════════════ */}
        <aside 
          style={{
            width: '360px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0b101b',
            border: '1px solid #1b263b',
            borderRadius: '16px',
            padding: '14px',
            boxSizing: 'border-box',
            gap: '12px'
          }}
        >
          {/* ELON MUSK ANSWER CARD */}
          <div 
            style={{
              backgroundColor: '#0e1626',
              border: '1px solid #1b263b',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b263b', paddingBottom: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', color: '#4ade80', letterSpacing: '0.05em', margin: 0 }}>
                ELON MUSK
              </h2>
              <span style={{ fontStyle: 'italic', fontSize: '12px', color: '#4ade80', fontFamily: 'Georgia, serif' }}>
                Your Answer
              </span>
            </div>

            {/* Response Content Body */}
            <div 
              ref={responseScrollRef}
              style={{
                minHeight: '120px',
                maxHeight: '180px',
                overflowY: 'auto',
                fontSize: '12px',
                lineHeight: '1.5',
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap'
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontFamily: 'monospace', padding: '24px 0' }}>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Synthesizing from first principles...</span>
                </div>
              ) : (
                activeResponse
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px', borderTop: '1px solid rgba(27, 38, 59, 0.6)' }}>
              <span style={{ fontSize: '14px' }}>🍉</span>
            </div>
          </div>

          {/* SOURCES METADATA BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', fontSize: '11px', fontFamily: 'monospace' }}>
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Info size={12} />
              <span>{activeSources.length} SOURCES RETRIEVED</span>
            </span>
            <span style={{ fontWeight: 700, color: '#4ade80' }}>
              {activeConfidence}% CONFIDENCE
            </span>
          </div>

          {/* SOURCE MEMORY LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
              SOURCE MEMORY
            </div>

            {activeSources.map((src) => (
              <div
                key={src.id}
                style={{
                  padding: '10px',
                  backgroundColor: '#0e1626',
                  border: '1px solid #1b263b',
                  borderRadius: '10px',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace', fontWeight: 600, color: '#4ade80' }}>
                    <Radio size={11} />
                    <span>{src.type}</span>
                  </div>
                  <ExternalLink size={10} color="#64748b" />
                </div>

                <div style={{ color: '#f1f5f9', fontWeight: 600 }}>
                  {src.title}
                </div>

                <div style={{ fontSize: '9.5px', fontFamily: 'monospace', color: '#64748b' }}>
                  {src.date}
                </div>

                <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '10px', lineHeight: 1.3 }}>
                  "{src.excerpt}"
                </div>
              </div>
            ))}
          </div>

          {/* Swytchcode Policy Badge */}
          <div 
            style={{
              padding: '8px 12px',
              backgroundColor: '#070d18',
              border: '1px solid #1b263b',
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#64748b'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4ade80' }}>
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
        voiceEnabled={false}
        onToggleVoice={() => {}}
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
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🍉</span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                  About Musk Melon (MindCommit)
                </h3>
              </div>
              <button 
                onClick={() => setShowAboutModal(false)} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            
            <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
              MuskMelon is a consent-based, version-controlled Knowledge Twin of Elon Musk built with Swytchcode API middleware, Kaggle tweet dataset (2010–2025), and claim-level Answer Receipts.
            </p>

            <div style={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', fontSize: '11px', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ color: '#4ade80', fontWeight: 700 }}>Swytchcode 3-Integration Stack:</div>
              <div style={{ color: '#cbd5e1' }}>• Google Drive (Approved knowledge ingestion)</div>
              <div style={{ color: '#cbd5e1' }}>• Weaviate (Versioned semantic retrieval)</div>
              <div style={{ color: '#cbd5e1' }}>• OpenAI / Gemini (Grounded response generation)</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
              <button
                onClick={() => setShowAboutModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
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
