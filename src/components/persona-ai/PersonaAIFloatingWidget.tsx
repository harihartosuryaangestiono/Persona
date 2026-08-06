'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { Sparkles, X, Send, RefreshCw, Trash2 } from 'lucide-react';
import { PersonaAIEngine, PersonaAIResponse } from '@/lib/services/persona-ai-engine';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  response?: PersonaAIResponse;
  timestamp: string;
}

export default function PersonaAIFloatingWidget() {
  const { worklogs, tasks, clients, budgets, attendances, leaveRequests } = useData();
  const { currentUser, allUsers } = useUser();

  const AI_ALLOWED_USERS = ['devi', 'anggi', 'gigie'];
  const isAllowed = currentUser && AI_ALLOWED_USERS.some((n) => (currentUser.name || '').toLowerCase().includes(n));

  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Halo! Saya **Persona AI**, asisten Business Intelligence Persona OS. Saya dapat menganalisis seluruh data operasional, budget, tim, dan konten dari database Supabase live. Ada yang ingin Anda tanyakan?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  if (!isAllowed) return null;

  const handleQuery = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsgId = Date.now().toString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: text.trim(),
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/persona-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      if (!res.ok) throw new Error('API Query Error');
      const data: PersonaAIResponse = await res.json();

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.answerText,
        response: data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (e) {
      const fallback = PersonaAIEngine.processQuery(
        text,
        worklogs,
        tasks || [],
        clients,
        allUsers,
        budgets || [],
        attendances || [],
        leaveRequests || []
      );

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: fallback.answerText,
        response: fallback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(prompt);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'assistant',
        text: 'Chat telah dibersihkan. Silakan tanyakan kueri database operasional baru!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const QUICK_CHIPS = [
    { label: '🎬 Total Reels Bulan Ini', query: 'Berapa total Reels bulan Agustus?' },
    { label: '📊 Carousel BEGS', query: 'Berapa Carousel Baking Empire Gading Serpong bulan Agustus?' },
    { label: '🏙️ Carousel BEKG', query: 'Berapa Carousel Baking Empire Kelapa Gading bulan Agustus?' },
    { label: '💰 Budget Karihome', query: 'Budget Karihome tinggal berapa?' },
    { label: '👨‍💻 Editor Paling Sibuk', query: 'Siapa editor paling sibuk bulan ini?' },
    { label: '📅 Agenda Hari Ini', query: 'Hari ini ada apa?' },
    { label: '⚠️ Overdue Tasks', query: 'Ada task yang overdue?' },
  ];

  return (
    <>
      {/* FLOATING TRIGGER BUTTON (Hidden when drawer is open) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-24 z-[9998] bg-neutral-900 text-white font-bold text-xs px-4 py-3.5 rounded-full shadow-2xl hover:bg-neutral-800 transition transform hover:scale-105 active:scale-95 flex items-center gap-2.5 border border-neutral-700/80 group"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span>Persona AI BI Chat</span>
        </button>
      )}

      {/* FLOATING DRAWER CHAT INTERFACE */}
      {isOpen && (
        <div className="fixed inset-0 z-[10005] bg-neutral-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-neutral-200 animate-in slide-in-from-right duration-300">
            {/* DRAWER HEADER */}
            <div className="bg-neutral-900 text-white p-4 flex items-center justify-between border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Persona AI BI Assistant</h3>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live Supabase Multi-Turn Chat</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  title="Reset Chat"
                  className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CHAT MESSAGES STREAM */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-neutral-50/50">
              {/* QUICK CHIPS SUGGESTIONS */}
              {messages.length <= 2 && (
                <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    💡 Quick BI Query Recommendations
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        onClick={() => handleQuery(chip.query)}
                        className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-900 hover:text-white rounded-xl text-[11px] font-semibold text-neutral-700 transition border border-neutral-200/70"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MESSAGES STREAM */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                >
                  {/* SENDER LABEL & TIMESTAMP */}
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 px-1 font-mono">
                    {msg.sender === 'user' ? (
                      <>
                        <span>{msg.timestamp}</span>
                        <span className="font-bold text-neutral-700">Anda ({currentUser.name})</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-emerald-600">Persona AI</span>
                        <span>{msg.timestamp}</span>
                      </>
                    )}
                  </div>

                  {/* MESSAGE BUBBLE */}
                  {msg.sender === 'user' ? (
                    <div className="bg-neutral-900 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[85%] text-xs shadow-md font-medium leading-relaxed">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="bg-white border border-neutral-200/90 rounded-2xl rounded-tl-xs p-4 max-w-[95%] space-y-3 shadow-sm">
                      {msg.response ? (
                        <>
                          <div className="border-b border-neutral-100 pb-2">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              Database Analysis
                            </span>
                            <h4 className="font-bold text-neutral-900 text-xs mt-1">{msg.response.answerTitle}</h4>
                          </div>

                          {/* SUMMARY CARDS IF ANY */}
                          {msg.response.summaryCards && msg.response.summaryCards.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5">
                              {msg.response.summaryCards.map((c, i) => (
                                <div key={i} className="bg-neutral-50 p-2 rounded-xl border border-neutral-200/60">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase">{c.label}</span>
                                  <p className="font-black text-neutral-900 text-xs">{c.value}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="text-neutral-800 whitespace-pre-line leading-relaxed text-xs">{msg.response.answerText}</p>

                          {msg.response.autoInsights && msg.response.autoInsights.length > 0 && (
                            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/60 space-y-1 text-emerald-900 text-[11px]">
                              <span className="font-bold block text-[10px]">Auto Insights:</span>
                              {msg.response.autoInsights.map((ins, i) => (
                                <p key={i} className="text-[10px] text-emerald-800">{ins}</p>
                              ))}
                            </div>
                          )}

                          <div className="bg-neutral-900 text-white p-2.5 rounded-xl font-mono text-[9px] space-y-0.5">
                            <p className="text-emerald-400 font-bold">Verified DB Source:</p>
                            <p>Records: <strong className="text-amber-400">{msg.response.reasoning.recordsFound} DB Rows</strong></p>
                            <p>Source: <strong className="text-white">{msg.response.reasoning.source}</strong></p>
                          </div>
                        </>
                      ) : (
                        <p className="text-neutral-800 whitespace-pre-line leading-relaxed text-xs">{msg.text}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* LOADING BUBBLE */}
              {loading && (
                <div className="flex flex-col items-start space-y-1">
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">Persona AI</span>
                  <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2 text-neutral-600">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                    <span className="text-xs font-medium">Menganalisis live database Supabase...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* DRAWER FOOTER INPUT */}
            <form onSubmit={handleSubmit} className="p-3.5 bg-white border-t border-neutral-200 shadow-xl flex gap-2 shrink-0 z-50">
              <input
                type="text"
                placeholder="Ketik pertanyaan lagi... (contoh: Berapa total Reels BEGS?)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 bg-white font-medium text-neutral-900 placeholder-neutral-400"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 disabled:opacity-50 transition active:scale-95 flex items-center justify-center shrink-0"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
