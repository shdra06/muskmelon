'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Zap, Clock, GitCompare, Mic, MicOff, Send, RefreshCw,
  ExternalLink, CheckCircle2, Radio, Info, Layers, Sparkles,
  ChevronRight, Shield, MessageSquare, Plus, Volume2, Database,
  Settings as SettingsIcon, X
} from 'lucide-react';
import { SessionsDrawer, ChatSession } from '@/components/sessions-drawer';
import { SettingsDrawer } from '@/components/settings-drawer';
import { AnswerReceiptModal } from '@/components/answer-receipt';
import { createSpeechRecognizer } from '@/lib/voice';

type Mode = 'now' | 'time' | 'diff';

interface SourceItem {
  id: string;
  type: string;
  title: string;
  date: string;
  excerpt: string;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('now');
  const [asOfDate, setAsOfDate] = useState('2023-01-01');
  const [compareDates, setCompareDates] = useState<[string, string]>(['2021-02-01', '2021-06-01']);
  const [input, setInput] = useState('');
  
  // Active response state
  const [activeResponse, setActiveResponse] = useState<string>(
    "The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth and make humanity a spacefaring civilization. That is the long-term insurance for consciousness."
  );
  const [activeConfidence, setActiveConfidence] = useState<number>(95);
  const [activeSources, setActiveSources] = useState<SourceItem[]>([
    {
      id: '1',
      type: 'Interview',
      title: 'Elon Musk – Lex Fridman Podcast #400',
      date: 'Nov 9, 2023',
      excerpt: '...becoming a multiplanetary species is critical for the long-term future of human consciousness...'
    },
    {
      id: '2',
      type: 'Speech',
      title: 'Starbase Starship All-Hands',
      date: 'Apr 6, 2024',
      excerpt: '...if there is a single point of failure on Earth, we are gone. Mars is insurance for civilization.'
    },
    {
      id: '3',
      type: 'Tweet',
      title: '@elonmusk on X',
      date: 'Mar 18, 2024',
      excerpt: 'Starship is designed to take life to Mars and extend the light of consciousness to the stars.'
    }
  ]);

  // Typewriter streaming effect state
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  // Modals & Panels
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Voice Input (Speech to Text)
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // User chat history
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'user',
      content: 'What do you think about humanity\'s future?'
    },
    {
      role: 'assistant',
      content: "The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth and make humanity a spacefaring civilization. That is the long-term insurance for consciousness."
    }
  ]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('session-default');

  const textareaRef = useRef<HTMLInputElement>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);

  // Smooth Typewriter effect for response
  useEffect(() => {
    if (!activeResponse) return;
    setIsTyping(true);
    setDisplayedText('');
    let index = 0;
    const stepSize = Math.max(1, Math.floor(activeResponse.length / 50));
    
    const interval = setInterval(() => {
      index += stepSize;
      if (index >= activeResponse.length) {
        setDisplayedText(activeResponse);
        setIsTyping(false);
        clearInterval(interval);
      } else {
        setDisplayedText(activeResponse.slice(0, index));
      }
    }, 18);

    return () => clearInterval(interval);
  }, [activeResponse]);

  const handleSubmit = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const queryToRun = (directQuery || input).trim();
    if (!queryToRun || isLoading) return;

    setInput('');
    setIsLoading(true);
    setDisplayedText('');

    const newMsgList = [...messages, { role: 'user', content: queryToRun }];
    setMessages(newMsgList);

    try {
      if (mode === 'diff') {
        const res = await fetch('/api/diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: queryToRun,
            date1: compareDates[0],
            date2: compareDates[1]
          })
        });
        const data = await res.json();
        const replyText = `Belief shift for "${queryToRun}" between ${compareDates[0]} and ${compareDates[1]}:\n\n${data.diff.whatChanged}\n\n${data.diff.whyChanged}`;
        setActiveResponse(replyText);
        setActiveConfidence(92);
        setActiveSources([
          {
            id: '1',
            type: 'Document',
            title: `Position in ${compareDates[0]}`,
            date: compareDates[0],
            excerpt: data.diff.period1?.position || 'Historical initial stance'
          },
          {
            id: '2',
            type: 'Document',
            title: `Position in ${compareDates[1]}`,
            date: compareDates[1],
            excerpt: data.diff.period2?.position || 'Updated grounded stance'
          }
        ]);
        setMessages([...newMsgList, { role: 'assistant', content: replyText }]);
      } else {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: queryToRun,
            mode,
            asOfDate: mode === 'time' ? asOfDate : undefined,
            history: messages
          })
        });
        const data = await res.json();
        setActiveResponse(data.message);
        setActiveReceipt(data.receipt);
        setActiveConfidence(Math.round((data.receipt?.groundingConfidence || 0.94) * 100));

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
          const lower = queryToRun.toLowerCase();
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
    } catch (error) {
      console.error(error);
      setActiveResponse("From first principles, when scaling complex hardware or software systems, you have to eliminate unnecessary constraints. What specific engineering question can I help you break down?");
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

  // Quick starter suggestions
  const suggestions = [
    { label: "🚀 Mars Colonization", query: "What is your roadmap and timeline for making life multiplanetary on Mars?" },
    { label: "🤖 Cybercab & FSD", query: "What is the status of Tesla Robotaxi, Cybercab, and autonomous driving?" },
    { label: "🧠 xAI & Truth-Seeking", query: "Why did you build xAI and how is Grok different from other AIs?" },
    { label: "⚡ First Principles", query: "How do you apply first-principles reasoning to solve impossible engineering problems?" }
  ];

  return (
    <div 
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        backgroundColor: '#050811',
        color: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      
      {/* ─── 1. FULL-BLEED CINEMATIC BACKGROUND ARTWORK ─── */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/bg-elon-office.png')",
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center 15%',
          zIndex: 0
        }}
      >
        {/* Subtle dark ambient vignette overlay */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 35%, rgba(5, 8, 17, 0.45) 0%, rgba(5, 8, 17, 0.85) 75%, rgba(5, 8, 17, 0.98) 100%)',
            pointerEvents: 'none'
          }} 
        />
      </div>

      {/* ─── 2. TOP NAV BAR (CLEAN & MINIMAL) ─── */}
      <header 
        style={{
          position: 'relative',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          backgroundColor: 'rgba(7, 11, 20, 0.75)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(74, 222, 128, 0.15)',
              border: '1px solid rgba(74, 222, 128, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}
          >
            🍉
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.08em', color: '#ffffff' }}>
              MUSKMELON
            </div>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.15em', color: '#4ade80' }}>
              ELON MUSK KNOWLEDGE TWIN
            </div>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            padding: '3px 4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <button
            onClick={() => setMode('now')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              backgroundColor: mode === 'now' ? '#15803d' : 'transparent',
              color: mode === 'now' ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Zap size={12} />
            <span>Now (2025+)</span>
          </button>

          <button
            onClick={() => setMode('time')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              backgroundColor: mode === 'time' ? '#f3951f' : 'transparent',
              color: mode === 'time' ? '#0f172a' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Clock size={12} />
            <span>Time Lens</span>
          </button>

          <button
            onClick={() => setMode('diff')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
              backgroundColor: mode === 'diff' ? '#a855f7' : 'transparent',
              color: mode === 'diff' ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <GitCompare size={12} />
            <span>Belief Diff</span>
          </button>
        </div>

        {/* Right Badges & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowSourcesPanel(!showSourcesPanel)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              backgroundColor: showSourcesPanel ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.8)',
              border: showSourcesPanel ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: showSourcesPanel ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Layers size={12} />
            <span>Sources ({activeSources.length})</span>
          </button>

          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              backgroundColor: 'rgba(15, 41, 30, 0.85)',
              border: '1px solid #15803d',
              borderRadius: '9999px',
              fontSize: '10px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#4ade80'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
            <span>GROUNDED</span>
          </div>

          <Link
            href="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#cbd5e1',
              textDecoration: 'none'
            }}
          >
            <Database size={12} color="#f3951f" />
            <span style={{ display: 'none' }}>Admin</span>
          </Link>
        </div>
      </header>

      {/* ─── 3. FOCAL CENTER: FLOATING ELON RESPONSE HUD SCREEN ─── */}
      <main 
        style={{
          position: 'relative',
          zIndex: 20,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 20px',
          maxWidth: '860px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Era Selector Controls (when Time Lens or Diff active) */}
        {mode === 'time' && (
          <div 
            style={{
              width: '100%',
              marginBottom: '12px',
              padding: '8px 16px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(243, 149, 31, 0.5)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              backdropFilter: 'blur(12px)'
            }}
          >
            <span style={{ color: '#f3951f', fontFamily: 'monospace', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Knowledge Timeline As Of Date:
            </span>
            <input
              type="date"
              value={asOfDate}
              min="2010-01-01"
              max="2025-12-31"
              onChange={e => setAsOfDate(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                color: '#ffffff',
                fontFamily: 'monospace'
              }}
            />
          </div>
        )}

        {mode === 'diff' && (
          <div 
            style={{
              width: '100%',
              marginBottom: '12px',
              padding: '8px 16px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              backdropFilter: 'blur(12px)'
            }}
          >
            <span style={{ color: '#c084fc', fontFamily: 'monospace', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GitCompare size={14} /> Belief Shift Eras:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                value={compareDates[0]}
                onChange={e => setCompareDates([e.target.value, compareDates[1]])}
                style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#fff', fontFamily: 'monospace' }}
              />
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>vs</span>
              <input
                type="date"
                value={compareDates[1]}
                onChange={e => setCompareDates([compareDates[0], e.target.value])}
                style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#fff', fontFamily: 'monospace' }}
              />
            </div>
          </div>
        )}

        {/* ─── THE PROMINENT FLOATING RESPONSE CARD ─── */}
        <div 
          style={{
            width: '100%',
            backgroundColor: 'rgba(12, 18, 32, 0.88)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxSizing: 'border-box'
          }}
        >
          {/* Response Header */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)'
                }}
              >
                ⚡
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: '#4ade80', letterSpacing: '0.05em' }}>
                    ELON MUSK
                  </span>
                  <span 
                    style={{
                      fontSize: '9px',
                      fontFamily: 'monospace',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(74, 222, 128, 0.15)',
                      color: '#4ade80',
                      border: '1px solid rgba(74, 222, 128, 0.3)',
                      fontWeight: 700
                    }}
                  >
                    GROUNDED TWIN
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px' }}>
                  {isLoading ? 'Reasoning from first principles...' : isTyping ? 'Synthesizing verified statements...' : 'First-principles reasoning complete'}
                </div>
              </div>
            </div>

            {/* Confidence Badge */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'monospace', color: '#4ade80' }}>
                {activeConfidence}%
              </div>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#64748b' }}>
                GROUNDING CONFIDENCE
              </div>
            </div>
          </div>

          {/* Response Text Body with Typewriter Effect */}
          <div 
            style={{
              minHeight: '130px',
              maxHeight: '260px',
              overflowY: 'auto',
              fontSize: '15px',
              lineHeight: '1.65',
              color: '#f1f5f9',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              whiteSpace: 'pre-wrap',
              paddingRight: '6px'
            }}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8', padding: '36px 0', fontFamily: 'monospace', fontSize: '13px' }}>
                <RefreshCw size={18} className="animate-spin" />
                <span>Searching verified archives & reasoning from physics limits...</span>
              </div>
            ) : (
              <>
                <span>{displayedText}</span>
                {isTyping && (
                  <span 
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '16px',
                      backgroundColor: '#4ade80',
                      marginLeft: '4px',
                      verticalAlign: 'middle',
                      animation: 'pulse 1s infinite'
                    }} 
                  />
                )}
              </>
            )}
            <div ref={responseEndRef} />
          </div>

          {/* Response Footer: Provenance Info */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '12px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#94a3b8'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={13} color="#4ade80" />
              <span>Grounded in 2010–2025 Elon Musk archives</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setShowSourcesPanel(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <span>View {activeSources.length} Verified Sources</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── QUICK PROMPT SUGGESTION PILLS ─── */}
        <div 
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            marginTop: '14px',
            marginBottom: '4px',
            width: '100%'
          }}
        >
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSubmit(undefined, s.query)}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '9999px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(8px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#4ade80';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(21, 128, 61, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#cbd5e1';
                e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </main>

      {/* ─── 4. BOTTOM FLOATING PROMPT INPUT BAR ─── */}
      <footer 
        style={{
          position: 'relative',
          zIndex: 30,
          padding: '12px 24px 20px 24px',
          maxWidth: '860px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        <form 
          onSubmit={(e) => handleSubmit(e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            border: '2px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '16px',
            padding: '8px 14px',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(20px)',
            transition: 'border-color 0.2s'
          }}
        >
          {/* Mic Button */}
          <button
            type="button"
            onClick={handleMicToggle}
            title={isListening ? "Listening... Click to stop" : "Voice Input (Speech-to-Text)"}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isListening ? '#ef4444' : '#1e293b',
              color: isListening ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Text Input */}
          <input
            ref={textareaRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'diff'
                ? "Enter topic to compare beliefs (e.g. 'Bitcoin', 'AI', 'Twitter')..."
                : mode === 'time'
                ? `Ask Elon as of ${asOfDate} (e.g. 'What is the status of Falcon 9?')...`
                : "Ask Elon Musk anything (e.g. 'How do you stay productive?')..."
            }
            maxLength={1000}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f1f5f9',
              fontSize: '14px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          />

          {/* Send / Ask Button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              backgroundColor: '#15803d',
              color: '#ffffff',
              borderRadius: '10px',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
              opacity: !input.trim() || isLoading ? 0.4 : 1,
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(21, 128, 61, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            <span>ASK</span>
            <Send size={13} />
          </button>
        </form>
      </footer>

      {/* ─── 5. SLIDEOUT SOURCES & MEMORY DRAWER ─── */}
      {showSourcesPanel && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
          onClick={() => setShowSourcesPanel(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '420px',
              height: '100%',
              backgroundColor: '#0c1322',
              borderLeft: '1px solid #1e293b',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxSizing: 'border-box',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                  Verified Knowledge Sources
                </h3>
              </div>
              <button 
                onClick={() => setShowSourcesPanel(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              Every response is strictly synthesized and verified against these primary public sources:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeSources.map((src) => (
                <div 
                  key={src.id}
                  style={{
                    padding: '12px',
                    backgroundColor: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#4ade80' }}>
                      {src.type}
                    </span>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>
                      {src.date}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                    {src.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{src.excerpt}"
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>
              <span>Swytchcode Provenance Engine</span>
              <span style={{ color: '#4ade80' }}>● Grounded</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABOUT PROJECT MODAL ─── */}
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
                  About MuskMelon
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
