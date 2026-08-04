'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { Sparkles, X, Send, Database, ShieldCheck, Copy, Check } from 'lucide-react';
import { PersonaAIEngine, PersonaAIResponse } from '@/lib/services/persona-ai-engine';

export default function PersonaAIFloatingWidget() {
  const { worklogs, tasks, clients, budgets, attendances, leaveRequests } = useData();
  const { currentUser, allUsers } = useUser();

  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [activeResponse, setActiveResponse] = useState<PersonaAIResponse | null>(null);

  const handleQuery = (text: string) => {
    if (!text.trim()) return;
    setPrompt(text);

    try {
      const res = PersonaAIEngine.processQuery(
        text,
        worklogs,
        tasks || [],
        clients,
        allUsers,
        budgets || [],
        attendances || [],
        leaveRequests || []
      );
      setActiveResponse(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(prompt);
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 z-[9998] bg-neutral-900 text-white font-bold text-xs px-4 py-3.5 rounded-full shadow-2xl hover:bg-neutral-800 transition transform hover:scale-105 active:scale-95 flex items-center gap-2.5 border border-neutral-700/80 group"
      >
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
        </div>
        <span>Persona AI BI</span>
      </button>

      {/* FLOATING DRAWER */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-neutral-200 animate-in slide-in-from-right duration-300">
            {/* DRAWER HEADER */}
            <div className="bg-neutral-900 text-white p-4 flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Persona AI BI Assistant</h3>
                  <p className="text-[10px] text-neutral-400">Live Supabase Database Query</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DRAWER BODY */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {activeResponse ? (
                <div className="space-y-4">
                  <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 space-y-2">
                    <h4 className="font-bold text-neutral-900 text-sm">{activeResponse.answerTitle}</h4>
                    <p className="text-neutral-700 whitespace-pre-line leading-relaxed">{activeResponse.answerText}</p>
                  </div>

                  {activeResponse.autoInsights && activeResponse.autoInsights.length > 0 && (
                    <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/60 space-y-1 text-emerald-900">
                      <span className="font-bold block text-[11px]">Auto Insights:</span>
                      {activeResponse.autoInsights.map((ins, i) => (
                        <p key={i} className="text-[11px] text-emerald-800">{ins}</p>
                      ))}
                    </div>
                  )}

                  <div className="bg-neutral-900 text-white p-3.5 rounded-xl space-y-2 font-mono text-[10px]">
                    <span className="text-emerald-400 font-bold block">Analysis Based On:</span>
                    <p>Records: <strong className="text-amber-400">{activeResponse.reasoning.recordsFound} DB Rows</strong></p>
                    <p>Source: <strong className="text-white">{activeResponse.reasoning.source}</strong></p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-400 space-y-2">
                  <Database className="w-8 h-8 mx-auto text-neutral-300" />
                  <p className="font-semibold text-neutral-600">Tanyakan kueri operasional</p>
                  <p className="text-[11px]">Contoh: "Berapa total Reels bulan Agustus?" atau "Budget Karihome tinggal berapa?"</p>
                </div>
              )}
            </div>

            {/* DRAWER FOOTER INPUT */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-neutral-200 bg-neutral-50 flex gap-2">
              <input
                type="text"
                placeholder="Tanyakan ke Persona AI..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 bg-white font-medium"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
