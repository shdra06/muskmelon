'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Settings, Zap, Clock, GitCompare, Mic, MicOff, Send, RefreshCw,
  Plus, X, CheckCircle2, ChevronRight, Volume2, Database, Shield,
  Layers, Sparkles, AlertCircle
} from 'lucide-react';
import { AnswerReceiptModal } from '@/components/answer-receipt';
import { createSpeechRecognizer } from '@/lib/voice';

type Mode = 'now' | 'time' | 'diff';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  receipt?: any;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('now');
  const [asOfDate, setAsOfDate] = useState('2023-01-01');
  const [compareDates, setCompareDates] = useState<[string, string]>(['2021-02-01', '2021-06-01']);
  const [input, setInput] = useState('');
  
  // Real conversation stream
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'user',
      content: 'What do you think about the future of human civilization?'
    },
    {
      role: 'assistant',
      content: 'The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth and make humanity a spacefaring civilization.'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setIsLoading(true);

    const newMsgList: Message[] = [...messages, { role: 'user', content: userMsg }];
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
        setActiveReceipt(data.receipt);
        streamAssistantResponse(newMsgList, data.message, data.receipt);
      }
    } catch (error) {
      console.error(error);
      const fallback = "From first principles, when scaling complex hardware or software systems, you have to eliminate unnecessary constraints. What specific engineering question can I help you break down?";
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

    const interval = setInterval(() => {
      idx += step;
      if (idx >= fullText.length) {
        setStreamingText('');
        setIsStreaming(false);
        setMessages([...baseMsgs, { role: 'assistant', content: fullText, receipt }]);
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
        backgroundColor: '#070b14',
        color: '#f1f5f9',
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

      {/* ─── 2. TOP NAV BAR ─── */}
      <header 
        style={{
          position: 'relative',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 24px',
          backgroundColor: 'rgba(9, 14, 26, 0.75)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🍉</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.08em', color: '#ffffff' }}>
              MUSKMELON
            </div>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.12em', color: '#4ade80' }}>
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
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
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
            <span>Now Mode</span>
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

        {/* Right Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <span>Admin</span>
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
          padding: '16px 32px 24px 32px',
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
                padding: '6px 14px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(243, 149, 31, 0.6)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                backdropFilter: 'blur(12px)'
              }}
            >
              <span style={{ color: '#f3951f', fontFamily: 'monospace', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} /> Knowledge As Of Date:
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
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
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
                marginBottom: '10px',
                padding: '6px 14px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(168, 85, 247, 0.6)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                backdropFilter: 'blur(12px)'
              }}
            >
              <span style={{ color: '#c084fc', fontFamily: 'monospace', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GitCompare size={13} /> Compare Belief Eras:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="date"
                  value={compareDates[0]}
                  onChange={e => setCompareDates([e.target.value, compareDates[1]])}
                  style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '2px 6px', fontSize: '10.5px', color: '#fff', fontFamily: 'monospace' }}
                />
                <span style={{ color: '#94a3b8', fontWeight: 700 }}>vs</span>
                <input
                  type="date"
                  value={compareDates[1]}
                  onChange={e => setCompareDates([compareDates[0], e.target.value])}
                  style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '2px 6px', fontSize: '10.5px', color: '#fff', fontFamily: 'monospace' }}
                />
              </div>
            </div>
          )}

          {/* PHYSICAL PRESS NOTEBOOK CLIPBOARD (100% OPAQUE, ZERO GHOSTING) */}
          <div style={{ position: 'relative', width: '100%' }}>
            {/* Clipboard clamp on top */}
            <div 
              style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '120px',
                height: '20px',
                background: 'linear-gradient(to bottom, #33312b, #1e1c18)',
                borderTop: '1px solid #52504a',
                borderLeft: '1px solid #52504a',
                borderRight: '1px solid #52504a',
                borderRadius: '6px 6px 0 0',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ width: '54px', height: '4px', backgroundColor: '#0a0a09', borderRadius: '9999px' }} />
            </div>

            {/* Paper body */}
            <div 
              style={{
                backgroundColor: '#f8f5ee',
                color: '#1c1917',
                borderRadius: '14px',
                border: '4px solid #33312b',
                padding: '16px 20px 10px 20px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,0,0,0.4)',
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              {/* Lined paper texture */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '10px',
                  opacity: 0.35,
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 26px, #d6cdbc 27px)',
                  pointerEvents: 'none'
                }}
              />

              {/* Notebook Header */}
              <div 
                style={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(184, 42, 42, 0.65)',
                  paddingBottom: '6px',
                  marginBottom: '8px'
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 800, color: '#b82a2a', letterSpacing: '0.12em' }}>
                  PRESS NOTEBOOK
                </span>
                <span style={{ fontStyle: 'italic', fontSize: '11px', color: '#78716c', fontFamily: 'Georgia, serif' }}>
                  {currentDateFormatted}
                </span>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 10 }}>
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
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    color: '#1c1917',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'Georgia, serif',
                    fontSize: '14.5px',
                    lineHeight: '1.5',
                    minHeight: '48px',
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
            RIGHT SIDE: "SETTINGS & MEMORY" CHAT INTERFACE WINDOW
            (100% SOLID BACKGROUND, ZERO GHOSTING)
            ═══════════════════════════════════════════════════════ */}
        <aside 
          style={{
            width: '380px',
            height: 'calc(100vh - 100px)',
            maxHeight: '620px',
            backgroundColor: '#0c1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30,
            flexShrink: 0,
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: '#080d18',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} color="#38bdf8" />
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em', margin: 0 }}>
                Settings & Memory
              </h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button 
                onClick={handleNewSession}
                title="New Session"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Plus size={15} />
              </button>
              <button 
                onClick={handleClearMessages}
                title="Clear Messages"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div 
            ref={chatScrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '12.5px',
              lineHeight: '1.55',
              boxSizing: 'border-box'
            }}
          >
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div 
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: m.role === 'user' ? '#4ade80' : '#38bdf8'
                  }}
                >
                  {m.role === 'user' ? 'USER' : 'ELON'}
                </div>
                <div 
                  style={{
                    color: '#e2e8f0',
                    paddingLeft: '6px',
                    borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Live streaming bubble if currently typing */}
            {isStreaming && streamingText && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '10.5px', fontWeight: 800, color: '#38bdf8' }}>
                  ELON
                </div>
                <div 
                  style={{
                    color: '#f1f5f9',
                    paddingLeft: '6px',
                    borderLeft: '2px solid #38bdf8',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {streamingText}
                  <span 
                    style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '14px',
                      backgroundColor: '#38bdf8',
                      marginLeft: '3px',
                      verticalAlign: 'middle',
                      animation: 'pulse 1s infinite'
                    }} 
                  />
                </div>
              </div>
            )}

            {isLoading && !isStreaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '11px', paddingTop: '8px' }}>
                <RefreshCw size={12} className="animate-spin" />
                <span>Reasoning from first principles...</span>
              </div>
            )}
          </div>

          {/* Footer watermark */}
          <div 
            style={{
              padding: '10px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: '#080d18',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '9.5px',
              fontFamily: 'monospace',
              color: '#64748b',
              flexShrink: 0
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80' }}>
              <CheckCircle2 size={10} /> Grounded v4.2
            </span>
            <span style={{ color: '#f3951f' }}>Swytchcode Protected</span>
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
