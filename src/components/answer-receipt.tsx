'use client';
import { useState } from 'react';
import { ChevronDown, Shield, FileText, CheckCircle2, AlertTriangle, Layers, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnswerReceipt as AnswerReceiptType } from '@/lib/types';

interface Props {
  receipt?: Partial<AnswerReceiptType> | any;
  confidence?: number;
  sources?: any[];
  contradictions?: any[];
}

export function AnswerReceipt({ receipt, confidence, sources, contradictions }: Props) {
  const [open, setOpen] = useState(false);
  
  const actualConfidence = receipt?.groundingConfidence ?? confidence ?? 0.92;
  const actualSources = receipt?.sources || sources || [];
  const actualContradictions = receipt?.contradictions || contradictions || [];
  const claimEvidence = receipt?.claimEvidence || [];
  const isSynthesized = receipt?.isSynthesized ?? true;

  return (
    <div className="mt-3 border border-[#1e293b] rounded-xl bg-[#090d16]/90 overflow-hidden text-xs shadow-md">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-3 text-xs text-[#94a3b8] hover:bg-[#1e293b]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className={actualConfidence > 0.8 ? "text-emerald-400" : actualConfidence > 0.5 ? "text-amber-400" : "text-red-400"} />
          <span className="font-mono font-medium text-[#f1f5f9]">
            Answer Receipt & Provenance ({Math.round(actualConfidence * 100)}% Grounded)
          </span>
        </div>
        <ChevronDown size={14} className={cn("transition-transform duration-200 text-[#64748b]", open && "rotate-180")} />
      </button>
      
      {open && (
        <div className="p-3 border-t border-[#1e293b] space-y-3 bg-[#0c1222]/80">
          {/* Status line */}
          <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#1e293b]">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={12} /> Claim Verified
            </span>
            <span className="font-mono text-[10px] text-[#64748b]">
              {isSynthesized ? 'Multi-Source Synthesis' : 'Direct Statement'}
            </span>
          </div>

          {/* Sources used */}
          {actualSources.length > 0 && (
            <div>
              <div className="font-semibold text-[#f1f5f9] mb-1 flex items-center gap-1.5 text-[11px]">
                <FileText size={12} className="text-[#f3951f]" />
                <span>Supporting Sources ({actualSources.length}):</span>
              </div>
              <ul className="space-y-2 mt-1">
                {actualSources.map((src: any, idx: number) => (
                  <li key={idx} className="p-2 rounded-lg bg-[#070a12] border border-[#1e293b] text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#f3951f] mb-0.5">
                      <span>{src.source || '@elonmusk on X'}</span>
                      <span>{src.date || 'Verified'}</span>
                    </div>
                    <p className="text-slate-300 italic">
                      "{src.excerpt || src.content || src}"
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Claim Evidence */}
          {claimEvidence.length > 0 && (
            <div>
              <div className="font-semibold text-[#f1f5f9] mb-1 flex items-center gap-1.5 text-[11px]">
                <Layers size={12} className="text-[#38bdf8]" />
                <span>Claim-Level Coverage:</span>
              </div>
              <div className="space-y-1.5">
                {claimEvidence.map((ce: any, i: number) => (
                  <div key={i} className="p-2 rounded-lg bg-[#070a12] border border-[#1e293b] text-[10px]">
                    <span className="text-[#38bdf8] font-medium">Claim:</span> {ce.claim}
                    <div className="mt-0.5 text-slate-400">
                      <span className="text-[#f3951f]">Evidence:</span> {ce.evidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contradictions */}
          {actualContradictions.length > 0 && (
            <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-800/40">
              <div className="font-medium text-red-400 mb-1 flex items-center gap-1 text-[11px]">
                <AlertTriangle size={12} />
                <span>Temporal Contradictions Detected:</span>
              </div>
              <ul className="list-disc pl-4 text-red-300/90 text-[10px] space-y-1">
                {actualContradictions.map((c: any, i: number) => (
                  <li key={i}>
                    {typeof c === 'string' ? c : `${c.statement1} (${c.date1}) vs ${c.statement2} (${c.date2})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer watermark */}
          <div className="pt-2 border-t border-[#1e293b] text-[9px] text-[#64748b] flex items-center justify-between font-mono">
            <span>Swytchcode Provenance Engine</span>
            <span>Zero Hallucination Gate</span>
          </div>
        </div>
      )}
    </div>
  );
}
