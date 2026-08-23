'use client';
import { UploadZone } from '@/components/upload-zone';
import { CommitTimeline } from '@/components/commit-timeline';
import { Shield, Zap, Database, Link as LinkIcon } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e6e1]">MindCommit Admin</h1>
          <p className="text-sm text-[#7a7974]">Manage Knowledge Twin Data & Tools</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-[#1a1a18] border border-[#2a2926] rounded-lg text-xs text-[#e8e6e1] flex items-center gap-2">
            <Database size={12} className="text-green-500" /> 12,450 Commits
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-[#141413] border border-[#1e1e1c] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[#e8e6e1] mb-4">Ingest Data</h2>
            <UploadZone />
          </section>

          <section className="bg-[#141413] border border-[#1e1e1c] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[#e8e6e1] mb-4">Cognitive Signature (Persona)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#1a1a18] border border-[#2a2926] rounded-xl">
                <div className="text-xs text-[#7a7974] mb-1">Communication Style</div>
                <div className="text-sm text-[#e8e6e1]">Direct, ambitious, dry humor, technical depth.</div>
              </div>
              <div className="p-4 bg-[#1a1a18] border border-[#2a2926] rounded-xl">
                <div className="text-xs text-[#7a7974] mb-1">Core Topics</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Tesla', 'SpaceX', 'X', 'xAI', 'Mars', 'Doge'].map(t => (
                    <span key={t} className="px-2 py-0.5 bg-[#2a2926] rounded text-xs text-[#e8e6e1]">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#141413] border border-[#1e1e1c] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[#e8e6e1] mb-4">Swytchcode Tools Integration</h2>
            <div className="space-y-3">
              {[1,2,3,4,5,6,7,8,9,10].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#1a1a18] border border-[#2a2926] rounded-xl">
                  <div className="flex items-center gap-3">
                    <LinkIcon size={16} className="text-[#f3951f]" />
                    <span className="text-sm text-[#e8e6e1]">Tool Integration {i}</span>
                  </div>
                  <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">Active</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-[#141413] border border-[#1e1e1c] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[#e8e6e1] mb-4">Consent Ledger</h2>
            <div className="p-4 bg-[#1a1a18] border border-[#2a2926] rounded-xl mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-green-500" />
                <span className="text-sm font-medium text-[#e8e6e1]">Public Figure License</span>
              </div>
              <p className="text-xs text-[#7a7974]">Data sourced from public verifiable records, tweets, and interviews.</p>
            </div>
          </section>

          <section className="bg-[#141413] border border-[#1e1e1c] rounded-2xl p-6 h-[500px] overflow-hidden flex flex-col">
            <h2 className="text-lg font-semibold text-[#e8e6e1] mb-4">Knowledge Timeline</h2>
            <div className="flex-1 overflow-y-auto pr-4">
              <CommitTimeline />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
