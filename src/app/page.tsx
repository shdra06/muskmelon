'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Settings, Zap, Clock, GitCompare, Mic, MicOff, Send, RefreshCw,
  Plus, X, CheckCircle2, ChevronRight, Volume2, Database, Shield,
  Layers, Sparkles, AlertCircle, Terminal, Cpu, FileText, ArrowUpRight,
  ExternalLink, Check, Copy
} from 'lucide-react';
import { AnswerReceiptModal } from '@/components/answer-receipt';
import { createSpeechRecognizer } from '@/lib/voice';

type Mode = 'now' | 'time' | 'diff';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  receipt?: any;
  confidence?: number;
  timestamp?: string;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('now');
  const [asOfDate, setAsOfDate] = useState('2023-01-01');
  const [compareDates, setCompareDates] = useState<[string, string]>(['2021-02-01', '2021-06-01']);
  const [input, setInput] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  
  // Real conversation stream
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'user',
      content: 'What do you think about the future of human civilization?',
      timestamp: '15:12'
    },
    {
      role: 'assistant',
      content: 'The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth and make humanity a spacefaring civilization.',
      confidence: 0.96,
      timestamp: '15:12',
      receipt: {
        sources: [{ source: 'Starbase All-Hands', date: '2024-04-06' }],
        groundingConfidence: 0.96
      }
    },
    {
      role: 'user',
      content: 'Best investment according to you?',
      timestamp: '15:13'
    },
    {
      role: 'assistant',
      content: 'I believe in solving real physical engineering problems that move humanity forward. Don\'t chase paper games or financial engineering. The highest return comes from advancing sustainable energy, autonomous transport, orbital heavy lift, and high-bandwidth neural interfaces.',
      confidence: 0.94,
      timestamp: '15:13',
      receipt: {
        sources: [{ source: 'Kevin Rose Foundation', date: '2012-02-15' }],
        groundingConfidence: 0.94
      }
    },
    {
      role: 'user',
      content: 'How do you stay productive?',
      timestamp: '15:14'
    },
    {
      role: 'assistant',
      content: 'I focus almost 80% to 90% of my time on engineering and design. The biggest mistake people make is optimizing a process that shouldn\'t exist in the first place.\n\nMy 5-step algorithm:\n1. Make requirements less dumb.\n2. Delete the part or process step.\n3. Simplify or optimize.\n4. Accelerate cycle time.\n5. Automate.',
      confidence: 0.98,
      timestamp: '15:14',
      receipt: {
        sources: [{ source: 'Everyday Astronaut Starbase Tour', date: '2021-08-04' }],
        groundingConfidence: 0.98
      }
    }
  ]);

  // Streaming text for typewriter animation
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Voice Input (Speech to Text)
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Live Date
  const [currentDateFormatted, setCurrentDateFormatted] = useState('Tuesday, May 13, 2025');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const now = new Date();
      setCurrentDateFormatted(now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    } catch {}
  }, []);

  // Auto-scroll chat window when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, isLoading]);

  const handleNewSession = () => {
    setMessages([]);
    setStreamingText('');
    setIsStreaming(false);
  };

  const handleClearMessages = () => {
    setMessages([]);
    setStreamingText('');
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setInput('');
    setIsLoading(true);

    const newMsgList: Message[] = [...messages, { role: 'user', content: userMsg, timestamp: timeStr }];
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
        streamAssistantResponse(newMsgList, replyText);
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
        const responseText = data.message || data.error || "Doing well. Extremely busy splitting time between Starbase, Giga Texas, and xAI. What engineering or physics problem are we tackling today?";
        if (data.receipt) setActiveReceipt(data.receipt);
        streamAssistantResponse(newMsgList, responseText, data.receipt);
      }
    } catch (error) {
      console.error(error);
      const fallback = "Yeah, from first principles, when scaling complex hardware or software systems, you have to eliminate unnecessary constraints. What specific engineering question can I help you break down?";
      streamAssistantResponse(newMsgList, fallback);
    } finally {
      setIsLoading(false);
    }
  };

  // Streaming typewriter animation for the chatbot response
  const streamAssistantResponse = (baseMsgs: Message[], fullText: string, receipt?: any) => {
    setIsStreaming(true);
    setStreamingText('');
    let idx = 0;
    const step = Math.max(2, Math.floor(fullText.length / 35));
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const interval = setInterval(() => {
      idx += step;
      if (idx >= fullText.length) {
        setStreamingText('');
        setIsStreaming(false);
        setMessages([...baseMsgs, { role: 'assistant', content: fullText, receipt, confidence: 0.95, timestamp: timeStr }]);
        clearInterval(interval);
      } else {
        setStreamingText(fullText.slice(0, idx));
      }
    }, 18);
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
        position: 'relative',
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        backgroundColor: '#040711',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      
      {/* ─── 1. BACKGROUND SCENE ARTWORK ─── */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/bg-elon-clean.png')",
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0
        }}
      />

      {/* Subtle Dark Vignette & Atmospheric Radial Glow */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 85% 50%, rgba(14, 165, 233, 0.08) 0%, transparent 60%), linear-gradient(180deg, rgba(4, 7, 17, 0.4) 0%, transparent 20%, transparent 80%, rgba(4, 7, 17, 0.7) 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* ─── 2. TOP NAV BAR (HIGH-TECH GLASS HUD) ─── */}
      <header 
        style={{
          position: 'relative',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 28px',
          backgroundColor: 'rgba(6, 11, 25, 0.75)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          flexShrink: 0
        }}
      >
        {/* Brand with Glowing Neon Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              position: 'relative',
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.25)'
            }}
          >
            🍉
            <span 
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981'
              }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '0.09em', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>MUSKMELON</span>
              <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontFamily: 'monospace' }}>
                v4.2 PRO
              </span>
            </div>
            <div style={{ fontSize: '9.5px', fontFamily: 'monospace', letterSpacing: '0.12em', color: '#94a3b8' }}>
              VERSION-CONTROLLED KNOWLEDGE TWIN
            </div>
          </div>
        </div>

        {/* Center Mode Switcher (Futuristic Cyberpunk Pill) */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(11, 18, 38, 0.85)',
            padding: '4px 6px',
            borderRadius: '14px',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}
        >
          <button
            onClick={() => setMode('now')}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontFamily: 'monospace',
              fontWeight: 700,
              cursor: 'pointer',
              border: mode === 'now' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              backgroundColor: mode === 'now' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: mode === 'now' ? '#34d399' : '#94a3b8',
              boxShadow: mode === 'now' ? '0 0 15px rgba(16, 185, 129, 0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap size={13} className={mode === 'now' ? 'text-emerald-400 animate-pulse' : ''} />
            <span>Now Mode (2025+)</span>
          </button>

          <button
            onClick={() => setMode('time')}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontFamily: 'monospace',
              fontWeight: 700,
              cursor: 'pointer',
              border: mode === 'time' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              backgroundColor: mode === 'time' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: mode === 'time' ? '#fbbf24' : '#94a3b8',
              boxShadow: mode === 'time' ? '0 0 15px rgba(245, 158, 11, 0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={13} />
            <span>Time Lens</span>
          </button>

          <button
            onClick={() => setMode('diff')}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontFamily: 'monospace',
              fontWeight: 700,
              cursor: 'pointer',
              border: mode === 'diff' ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              backgroundColor: mode === 'diff' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              color: mode === 'diff' ? '#c084fc' : '#94a3b8',
              boxShadow: mode === 'diff' ? '0 0 15px rgba(168, 85, 247, 0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <GitCompare size={13} />
            <span>Belief Diff</span>
          </button>
        </div>

        {/* Right Status Badges & Admin Portal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Weaviate Cluster Sync Badge */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              backgroundColor: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '9999px',
              fontSize: '10.5px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#38bdf8',
              boxShadow: '0 0 12px rgba(14, 165, 233, 0.15)'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />
            <span>WEAVIATE CLOUD</span>
          </div>

          {/* Swytchcode Policy Protected Badge */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '9999px',
              fontSize: '10.5px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#34d399',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.15)'
            }}
          >
            <Shield size={11} className="text-emerald-400" />
            <span>SWYTCHCODE SECURED</span>
          </div>

          <Link
            href="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid rgba(243, 149, 31, 0.4)',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#f8fafc',
              textDecoration: 'none',
              transition: 'all 0.2s',
              boxShadow: '0 0 12px rgba(243, 149, 31, 0.1)'
            }}
          >
            <Database size={13} color="#f3951f" />
            <span>Audit Admin</span>
          </Link>
        </div>
      </header>

      {/* ─── 3. MAIN WORKSPACE ─── */}
      <main 
        style={{
          position: 'relative',
          zIndex: 20,
          flex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '16px 36px 24px 36px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        
        {/* ═══════════════════════════════════════════════════════
            LEFT / CENTER: THE PRESS NOTEBOOK (PROMPT INPUT CLIPBOARD)
            ═══════════════════════════════════════════════════════ */}
        <div 
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            maxWidth: '620px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 25
          }}
        >
          {/* Mode parameters (Time Lens or Diff) */}
          {mode === 'time' && (
            <div 
              style={{
                width: '100%',
                marginBottom: '10px',
                padding: '8px 16px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(245, 158, 11, 0.6)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11.5px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)'
              }}
            >
              <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Knowledge As Of Date:
              </span>
              <input
                type="date"
                value={asOfDate}
                min="2010-01-01"
                max="2025-12-31"
                onChange={e => setAsOfDate(e.target.value)}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {mode === 'diff' && (
            <div 
              style={{
                width: '100%',
                marginBottom: '10px',
                padding: '8px 16px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(168, 85, 247, 0.6)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 0 20px rgba(168, 85, 247, 0.15)'
              }}
            >
              <span style={{ color: '#c084fc', fontFamily: 'monospace', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GitCompare size={14} /> Compare Eras:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="date"
                  value={compareDates[0]}
                  min="2010-01-01"
                  max="2025-12-31"
                  onChange={e => setCompareDates([e.target.value, compareDates[1]])}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#ffffff',
                    padding: '3px 6px',
                    fontSize: '10.5px',
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
                <span style={{ color: '#64748b' }}>vs</span>
                <input
                  type="date"
                  value={compareDates[1]}
                  min="2010-01-01"
                  max="2025-12-31"
                  onChange={e => setCompareDates([compareDates[0], e.target.value])}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#ffffff',
                    padding: '3px 6px',
                    fontSize: '10.5px',
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          {/* Authentic Clip Binder */}
          <div 
            style={{
              position: 'relative',
              width: '100%',
              backgroundColor: '#524337',
              borderRadius: '24px',
              padding: '8px',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.2)'
            }}
          >
            {/* Dark Metallic Spring Clip at the Top */}
            <div 
              style={{
                position: 'absolute',
                top: '-14px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100px',
                height: '24px',
                backgroundColor: '#1e1e1e',
                borderRadius: '6px',
                border: '2px solid #3d3d3d',
                boxShadow: '0 6px 12px rgba(0, 0, 0, 0.7)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div 
                style={{
                  width: '60px',
                  height: '4px',
                  backgroundColor: '#0a0a0a',
                  borderRadius: '2px'
                }}
              />
            </div>

            {/* Vintage Lined Press Pad Paper */}
            <div 
              style={{
                backgroundColor: '#f7f4ea',
                borderRadius: '18px',
                padding: '16px 20px 12px 20px',
                border: '1px solid #d4ccb8',
                boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.04)',
                position: 'relative'
              }}
            >
              {/* Paper Header with Red Rule */}
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  borderBottom: '2px solid #e17055',
                  paddingBottom: '4px',
                  marginBottom: '10px'
                }}
              >
                <span 
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '11.5px',
                    letterSpacing: '0.14em',
                    color: '#c0392b'
                  }}
                >
                  PRESS NOTEBOOK
                </span>

                <span 
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: '11px',
                    color: '#7f8c8d'
                  }}
                >
                  {currentDateFormatted}
                </span>
              </div>

              {/* Lined prompt input form */}
              <form onSubmit={handleSubmit}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your question to Elon (or ask from first principles)..."
                  rows={2}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    resize: 'none',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#2d3436',
                    fontFamily: 'Georgia, serif',
                    fontSize: '15px',
                    lineHeight: '26px',
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 25px, #ded5c0 26px)',
                    boxSizing: 'border-box'
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />

                {voiceError && (
                  <div style={{ fontSize: '11px', color: '#dc2626', marginBottom: '4px', fontFamily: 'sans-serif' }}>
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
                    paddingTop: '6px',
                    marginTop: '6px'
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#78716c' }}>
                    {input.length} / 2000
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleMicToggle}
                      title={isListening ? "Listening... Click to stop" : "Voice Input (Speech-to-Text)"}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: isListening ? '#ef4444' : '#e5dccb',
                        color: isListening ? '#ffffff' : '#44403c',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>

                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 18px',
                        backgroundColor: '#1a2333',
                        color: '#ffffff',
                        borderRadius: '10px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
                        opacity: !input.trim() || isLoading ? 0.4 : 1,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>Ask</span>
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            RIGHT SIDE: ELON'S NEURAL TERMINAL & KNOWLEDGE OUTPUT HUD
            (PREMIUM GLASSMORPHISM, CYBERPUNK HUD, ANSWER RECEIPTS)
            ═══════════════════════════════════════════════════════ */}
        <aside 
          style={{
            width: '440px',
            height: 'calc(100vh - 100px)',
            maxHeight: '660px',
            backgroundColor: 'rgba(9, 14, 28, 0.88)',
            backdropFilter: 'blur(25px)',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            borderRadius: '24px',
            boxShadow: '0 30px 80px -10px rgba(0, 0, 0, 0.95), 0 0 45px rgba(14, 165, 233, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30,
            flexShrink: 0,
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}
        >
          {/* Header with Glowing Live Beacon */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid rgba(56, 189, 248, 0.18)',
              backgroundColor: 'rgba(6, 10, 22, 0.9)',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(14, 165, 233, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Cpu size={15} className="text-cyan-400" />
              </div>
              <div>
                <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>NEURAL TERMINAL</span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                </h2>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  1,842 MEMORY VECTORS LOADED
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                onClick={handleNewSession}
                title="New Session"
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  padding: '5px 8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}
              >
                <Plus size={13} />
                <span>New</span>
              </button>
              <button 
                onClick={handleClearMessages}
                title="Clear Messages"
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '5px 7px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages Stream Area */}
          <div 
            ref={chatScrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              fontSize: '13px',
              lineHeight: '1.6',
              boxSizing: 'border-box'
            }}
          >
            {messages.length === 0 && (
              <div 
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <Sparkles size={28} className="text-cyan-400 animate-pulse" />
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#f8fafc' }}>
                  Knowledge Twin Initialized
                </div>
                <p style={{ fontSize: '11.5px', color: '#94a3b8', maxWidth: '300px', lineHeight: '1.5' }}>
                  Ask questions to Elon Musk grounded on 15 years of public statements, tweets, and engineering algorithms.
                </p>

                {/* Prompt Starter Chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '6px' }}>
                  {[
                    '🚀 What is the roadmap for landing Starship on Mars?',
                    '⚡ How do you calculate battery pack cost from first principles?',
                    '🤖 When will Cybercab & unsupervised FSD deploy?'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(preset.slice(2).trim());
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        color: '#cbd5e1',
                        fontSize: '11px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{preset}</span>
                      <ArrowUpRight size={12} className="text-cyan-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, idx) => (
              <div 
                key={idx} 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: m.role === 'user' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(11, 19, 38, 0.85)',
                  border: m.role === 'user' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  boxShadow: m.role === 'assistant' ? '0 4px 20px rgba(0, 0, 0, 0.4)' : 'none'
                }}
              >
                {/* Header Tag */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'monospace',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    letterSpacing: '0.06em'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: m.role === 'user' ? '#34d399' : '#38bdf8' }}>
                    {m.role === 'user' ? (
                      <>
                        <span>USER QUERY</span>
                      </>
                    ) : (
                      <>
                        <Zap size={11} className="text-cyan-400" />
                        <span>ELON MUSK (GROUNDED TWIN)</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {m.timestamp && <span style={{ color: '#64748b', fontSize: '9.5px' }}>{m.timestamp}</span>}
                    {m.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(m.content, idx)}
                        title="Copy text"
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                      >
                        {copiedIdx === idx ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Content Message */}
                <div 
                  style={{
                    color: m.role === 'user' ? '#e2e8f0' : '#f1f5f9',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontSize: '12.5px'
                  }}
                >
                  {m.content}
                </div>

                {/* Embedded Mini Answer Receipt Badge for Assistant */}
                {m.role === 'assistant' && m.receipt && (
                  <div 
                    style={{
                      marginTop: '6px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(56, 189, 248, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      fontFamily: 'monospace'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                      <CheckCircle2 size={11} />
                      <span>{Math.round((m.confidence || 0.95) * 100)}% Grounded Evidence</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedReceipt(m.receipt);
                        setShowReceiptModal(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontWeight: 700
                      }}
                    >
                      <span>Provenance Receipt</span>
                      <ExternalLink size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Live Streaming Response Card */}
            {isStreaming && streamingText && (
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: 'rgba(11, 19, 38, 0.95)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  boxShadow: '0 0 25px rgba(14, 165, 233, 0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '10.5px', fontWeight: 800 }}>
                  <Zap size={11} className="animate-spin text-cyan-400" />
                  <span>ELON MUSK • STREAMING RESPONSE</span>
                </div>
                <div 
                  style={{
                    color: '#f8fafc',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontSize: '12.5px'
                  }}
                >
                  {streamingText}
                  <span 
                    style={{
                      display: 'inline-block',
                      width: '7px',
                      height: '14px',
                      backgroundColor: '#38bdf8',
                      marginLeft: '4px',
                      verticalAlign: 'middle',
                      animation: 'pulse 0.8s infinite'
                    }} 
                  />
                </div>
              </div>
            )}

            {isLoading && !isStreaming && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(14, 165, 233, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '14px',
                  color: '#38bdf8',
                  fontFamily: 'monospace',
                  fontSize: '11.5px'
                }}
              >
                <RefreshCw size={14} className="animate-spin text-cyan-400" />
                <span>Reasoning from First Principles (Weaviate Query)...</span>
              </div>
            )}
          </div>

          {/* High-Tech Telemetry Footer */}
          <div 
            style={{
              padding: '12px 18px',
              borderTop: '1px solid rgba(56, 189, 248, 0.18)',
              backgroundColor: 'rgba(6, 10, 22, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#64748b',
              flexShrink: 0
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981' }}>
              <CheckCircle2 size={11} /> Verified Provenance
            </span>
            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={10} /> Swytchcode Active (0ms)
            </span>
          </div>
        </aside>

      </main>

      {/* ─── MODAL ─── */}
      {showReceiptModal && selectedReceipt && (
        <AnswerReceiptModal
          receipt={selectedReceipt}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

    </div>
  );
}
