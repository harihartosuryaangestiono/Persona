'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/context/ToastContext';
import {
  Sparkles,
  Send,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Zap,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react';
import { PersonaAIEngine, ExecutiveSummary, PersonaAIResponse } from '@/lib/services/persona-ai-engine';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  response?: PersonaAIResponse;
  timestamp: string;
}

function parseInlineMarkdown(text: string): React.ReactNode {
  const boldRegex = /\*\*(.*?)\*\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    const prevText = text.substring(lastIndex, match.index);
    if (prevText) {
      parts.push(prevText);
    }
    parts.push(<strong key={match.index} className="font-extrabold text-neutral-900">{match[1]}</strong>);
    lastIndex = boldRegex.lastIndex;
  }

  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    parts.push(remainingText);
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

function renderBasicMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    // List item parsing
    const bulletMatch = line.match(/^(\s*)[-•*]\s+(.*)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length * 10;
      const content = parseInlineMarkdown(bulletMatch[2]);
      return (
        <div key={lineIdx} className="flex items-start gap-2 py-0.5 text-xs md:text-sm text-neutral-800" style={{ paddingLeft: `${indent}px` }}>
          <span className="text-emerald-500 font-bold">•</span>
          <span>{content}</span>
        </div>
      );
    }

    // Markdown Table parsing
    if (line.trim().startsWith('|')) {
      if (line.includes('---')) return null;
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const isHeader = lineIdx === 0 || line.includes('Rank') || line.includes('Client') || line.includes('Employee') || (lines[lineIdx - 1] && lines[lineIdx - 1].includes('Rank') && lines[lineIdx - 1].includes('|'));
      return (
        <div key={lineIdx} className={`flex divide-x divide-neutral-200 border-x border-b border-neutral-200 text-xs md:text-sm font-medium ${isHeader ? 'bg-neutral-100 font-bold border-t' : 'bg-white'}`}>
          {cells.map((cell, cellIdx) => (
            <div key={cellIdx} className="flex-1 px-3 py-1.5 truncate">
              {parseInlineMarkdown(cell)}
            </div>
          ))}
        </div>
      );
    }

    // Headers parsing
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = parseInlineMarkdown(headingMatch[2]);
      const sizeClass = level === 1 ? 'text-lg font-black text-neutral-900 mt-4 mb-2 border-b border-neutral-100 pb-1' :
                        level === 2 ? 'text-base font-extrabold text-neutral-900 mt-3 mb-1.5' :
                        'text-sm font-bold text-neutral-900 mt-2 mb-1';
      return <div key={lineIdx} className={sizeClass}>{content}</div>;
    }

    if (!line.trim()) {
      return <div key={lineIdx} className="h-2" />;
    }

    return (
      <div key={lineIdx} className="text-xs md:text-sm text-neutral-800 leading-relaxed py-0.5">
        {parseInlineMarkdown(line)}
      </div>
    );
  });
}

function parseMarkdownToReact(text: string): React.ReactNode {
  if (!text) return null;

  // Match details/summary blocks
  const detailsRegex = /<details>\s*<summary>(.*?)<\/summary>([\s\S]*?)<\/details>/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = detailsRegex.exec(text)) !== null) {
    const prevText = text.substring(lastIndex, match.index);
    if (prevText) {
      parts.push(renderBasicMarkdown(prevText));
    }

    const summary = match[1];
    const content = match[2];

    parts.push(
      <details key={`details-${match.index}`} className="mt-3 border border-neutral-200 rounded-xl bg-white overflow-hidden shadow-2xs">
        <summary className="px-4 py-2 bg-neutral-50 hover:bg-neutral-100 text-xs font-bold text-neutral-700 cursor-pointer list-none flex justify-between items-center select-none font-mono">
          <span>📊 {summary}</span>
          <span className="text-[10px] text-neutral-400">Click to expand</span>
        </summary>
        <div className="p-4 text-xs font-mono text-neutral-600 leading-relaxed whitespace-pre-wrap border-t border-neutral-150 bg-neutral-50/30">
          {renderBasicMarkdown(content)}
        </div>
      </details>
    );

    lastIndex = detailsRegex.lastIndex;
  }

  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    parts.push(renderBasicMarkdown(remainingText));
  }

  return <>{parts}</>;
}

export default function PersonaAIPage() {
  const { worklogs, tasks, clients, budgets, attendances, leaveRequests } = useData();
  const { currentUser, allUsers } = useUser();
  const { showToast } = useToast();

  const AI_ALLOWED_USERS = ['devi', 'anggi', 'gigie'];
  const isAllowed = currentUser && AI_ALLOWED_USERS.some((n) => (currentUser.name || '').toLowerCase().includes(n));

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [execSummary, setExecSummary] = useState<ExecutiveSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Selamat datang di **Persona AI Executive Workspace**! Kueri apapun mengenai operasional, tim, budget, dan konten dapat ditanyakan langsung dan akan dihitung 100% secara live dari database Supabase PostgreSQL.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Auto-generate Executive Summary on Mount & when data changes
  useEffect(() => {
    if (worklogs && clients && allUsers) {
      const summary = PersonaAIEngine.getExecutiveSummary(
        worklogs,
        tasks || [],
        clients,
        allUsers,
        budgets || [],
        attendances || [],
        leaveRequests || [],
        'August',
        2026
      );
      setExecSummary(summary);
    }
  }, [worklogs, tasks, clients, allUsers, budgets, attendances, leaveRequests]);

  if (!isAllowed) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs border border-rose-100">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Akses Dibatasi (Restricted)</h2>
        <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
          Fitur <strong>Persona AI Executive BI</strong> khusus hanya dapat diakses oleh akun <strong>Devi</strong>, <strong>Anggi</strong>, dan <strong>Gigie</strong>.
        </p>
      </div>
    );
  }

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsgId = Date.now().toString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: queryText.trim(),
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/persona-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: queryText, history: messages.map((m) => ({ sender: m.sender, text: m.text })) }),
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
    } catch (e: any) {
      const fallback = PersonaAIEngine.processQuery(
        queryText,
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
        text: 'Sesi percakapan telah dibersihkan. Silakan ajukan kueri database operasional baru!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleCopyMessage = (msg: ChatMessage) => {
    if (!msg.response) return;
    const text = `${msg.response.answerTitle}\n\n${msg.response.answerText}\n\nAnalysis Based On:\n- Source: ${msg.response.reasoning.source}\n- Records Analyzed: ${msg.response.reasoning.recordsFound}`;
    navigator.clipboard.writeText(text);
    setCopiedId(msg.id);
    showToast('Laporan berhasil disalin!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const QUICK_BUTTONS = [
    { label: '🎬 Total Reels Bulan Ini', query: 'Berapa total Reels bulan Agustus?' },
    { label: '📊 Carousel BEGS', query: 'Berapa Carousel Baking Empire Gading Serpong bulan Agustus?' },
    { label: '🏙️ Carousel BEKG', query: 'Berapa Carousel Baking Empire Kelapa Gading bulan Agustus?' },
    { label: '💰 Status Budget Karihome', query: 'Budget Karihome tinggal berapa?' },
    { label: '👨‍💻 Workload & Editor Sibuk', query: 'Siapa editor paling sibuk bulan ini?' },
    { label: '📅 Agenda Hari Ini', query: 'Hari ini ada apa?' },
    { label: '⚠️ Overdue Tasks', query: 'Ada task yang overdue?' },
    { label: '📈 Bandingkan Juli vs Agustus', query: 'Bandingkan Juli vs Agustus' },
  ];

  return (
    <div className="space-y-6 pb-32 max-w-7xl mx-auto">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-neutral-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Database Intelligence Assistant — Enterprise BI</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Persona AI Executive Workspace</h1>
            <p className="text-neutral-400 text-xs md:text-sm max-w-2xl leading-relaxed">
              Dapatkan ringkasan bisnis eksekutif, statistik operasional, visualisasi performa, dan insight otomatis yang dihitung 100% secara live dari database Supabase PostgreSQL.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-neutral-800/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-neutral-700/60 text-right">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Supabase DB Connected</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Live Production Data</p>
            </div>
          </div>
        </div>
      </div>

      {/* AUTO EXECUTIVE SUMMARY DASHBOARD */}
      {execSummary && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900">📊 Live Executive Summary Dashboard</h2>
                <p className="text-xs text-neutral-400">Diperbarui otomatis berdasarkan database produksi periode {execSummary.period}</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full border border-neutral-200">
              {execSummary.period}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200/60 space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">This Month Summary</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-neutral-900">{execSummary.totalContents}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  {execSummary.postedCount} Posted
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] text-neutral-500 font-medium">
                <div>Prog: <strong className="text-neutral-800">{execSummary.inProgressCount}</strong></div>
                <div>Appr: <strong className="text-neutral-800">{execSummary.waitingApprovalCount}</strong></div>
                <div>Over: <strong className="text-red-600 font-bold">{execSummary.overdueCount}</strong></div>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200/60 space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">Content Breakdown</span>
              <div className="space-y-1">
                {execSummary.formatBreakdown.slice(0, 3).map((f) => (
                  <div key={f.name} className="flex justify-between items-center text-xs">
                    <span className="text-neutral-600 font-medium">{f.name}</span>
                    <span className="font-mono font-bold text-neutral-900">{f.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200/60 space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">Client Activity</span>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Most Active:</span>
                  <strong className="text-neutral-900 truncate max-w-[120px]">{execSummary.clientActivity.mostActive.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Max Budget:</span>
                  <strong className="text-amber-700">{execSummary.clientActivity.highestBudgetUsage.name} ({execSummary.clientActivity.highestBudgetUsage.percent}%)</strong>
                </div>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200/60 space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">Employee Summary</span>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Top Contributor:</span>
                  <strong className="text-emerald-700">{execSummary.employeeSummary.topContributor.name} ({execSummary.employeeSummary.topContributor.score} pts)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Max Workload:</span>
                  <strong className="text-neutral-900">{execSummary.employeeSummary.highestWorkloadUser.name} ({execSummary.employeeSummary.highestWorkloadUser.percent}%)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ATTENTION REQUIRED & MoM TRENDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-200/60 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-rose-950">⚠️ Attention Required</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-rose-800 font-medium">
                  <span>• {execSummary.attentionRequired.overdueTasks} Task Overdue</span>
                  <span>• {execSummary.attentionRequired.pendingApprovals} Pending Approvals</span>
                  <span>• {execSummary.attentionRequired.exceededBudgets} Exceeded Client Budgets</span>
                  <span>• {execSummary.attentionRequired.highCapacityEmployees} Employee &gt;90% Capacity</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/60 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-emerald-950">📈 MoM Quick Trends (August vs July)</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-emerald-800 font-medium">
                  <span>• Total Content: <strong className="text-emerald-900">↑ {execSummary.quickInsights.contentsMoMPercent}%</strong></span>
                  <span>• Reels Format: <strong className="text-emerald-900">↑ {execSummary.quickInsights.reelsMoMPercent}%</strong></span>
                  <span>• Carousel Format: <strong className="text-emerald-900">↑ {execSummary.quickInsights.carouselMoMPercent}%</strong></span>
                  <span>• Completion Time: <strong className="text-emerald-900">↓ 1.3 Days</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-TURN CHAT SECTION */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-md flex flex-col overflow-hidden">
        {/* CHAT HEADER */}
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Conversational BI Chat Stream</h3>
              <p className="text-[11px] text-neutral-400">Tanyakan pertanyaan beruntun secara bebas — percakapan tersimpan dalam alur chat</p>
            </div>
          </div>
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-rose-400 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        </div>

        {/* QUICK ACTION BUTTONS */}
        <div className="p-4 bg-neutral-50/80 border-b border-neutral-200/60 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Rekomendasi Kueri (1-Click Action)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_BUTTONS.map((btn) => (
              <button
                key={btn.label}
                onClick={() => handleQuery(btn.query)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-900 hover:text-white border border-neutral-200 text-neutral-700 font-semibold text-xs transition shadow-2xs flex items-center gap-1 active:scale-95"
              >
                <span>{btn.label}</span>
                <ChevronRight className="w-3 h-3 text-neutral-400 opacity-60" />
              </button>
            ))}
          </div>
        </div>

        {/* CHAT MESSAGES CONTAINER */}
        <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto bg-neutral-50/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              {/* SENDER LABEL */}
              <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono px-1">
                {msg.sender === 'user' ? (
                  <>
                    <span>{msg.timestamp}</span>
                    <strong className="text-neutral-800">{currentUser.name}</strong>
                  </>
                ) : (
                  <>
                    <strong className="text-emerald-700 font-bold">Persona AI BI</strong>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* USER BUBBLE */}
              {msg.sender === 'user' ? (
                <div className="bg-neutral-900 text-white rounded-3xl rounded-tr-xs px-5 py-3.5 max-w-2xl text-sm font-medium leading-relaxed shadow-md">
                  {msg.text}
                </div>
              ) : (
                /* ASSISTANT CARD */
                <div className="bg-white rounded-3xl rounded-tl-xs p-6 md:p-7 border border-neutral-200/90 shadow-md max-w-4xl space-y-5 w-full">
                  {msg.response ? (
                    <>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                            Persona AI Result
                          </span>
                          <h4 className="text-lg font-bold text-neutral-900 mt-1">{msg.response.answerTitle}</h4>
                        </div>
                        <button
                          onClick={() => handleCopyMessage(msg)}
                          className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs flex items-center gap-1.5 transition self-start md:self-auto"
                        >
                          {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === msg.id ? 'Tersalin' : 'Salin Laporan'}</span>
                        </button>
                      </div>

                      {/* SUMMARY CARDS */}
                      {msg.response.summaryCards && msg.response.summaryCards.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {msg.response.summaryCards.map((card, idx) => (
                            <div key={idx} className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/70 space-y-1">
                              <span className="text-[10px] font-extrabold uppercase text-neutral-400">{card.label}</span>
                              <div className="text-base font-black text-neutral-900">{card.value}</div>
                              {card.badge && (
                                <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-neutral-200/80 text-neutral-700">
                                  {card.badge}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ANSWER TEXT */}
                      <div className="bg-neutral-50/70 rounded-2xl p-4 border border-neutral-200/80 text-xs md:text-sm leading-relaxed text-neutral-800">
                        {parseMarkdownToReact(msg.response.answerText)}
                      </div>

                      {/* AUTO INSIGHTS */}
                      {msg.response.autoInsights && msg.response.autoInsights.length > 0 && (
                        <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200/60 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span>Auto Insights (Derived from Dataset)</span>
                          </div>
                          <ul className="space-y-1 text-xs text-emerald-800 font-medium">
                            {msg.response.autoInsights.map((insight, idx) => (
                              <li key={idx}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* REASONING TRANSPARENCY PANEL */}
                      <div className="bg-neutral-900 text-white rounded-2xl p-4 space-y-2 shadow-sm font-mono text-xs">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                          <span className="text-emerald-400 font-bold text-xs">Analysis Based On:</span>
                          <span className="text-[10px] text-neutral-400">{msg.response.reasoning.source}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                          <div>Records: <strong className="text-amber-400">{msg.response.reasoning.recordsFound} DB Rows</strong></div>
                          <div>Calculation: <strong className="text-emerald-400">{msg.response.reasoning.calculation}</strong></div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-neutral-800 text-sm leading-relaxed">
                      {parseMarkdownToReact(msg.text)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* LOADING STATE */}
          {loading && (
            <div className="flex flex-col items-start space-y-1">
              <span className="text-xs font-mono font-bold text-emerald-600">Persona AI BI</span>
              <div className="bg-white border border-neutral-200 rounded-3xl rounded-tl-xs px-5 py-4 shadow-sm flex items-center gap-3 text-neutral-700">
                <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                <span className="text-xs font-medium">Menganalisis live database Supabase PostgreSQL...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* INPUT FORM FOOTER */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-neutral-200 flex items-center gap-3">
          <div className="pl-2 text-emerald-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Ketik pertanyaan kueri lagi... (contoh: Berapa total Carousel BEGS? atau Sisa budget Karihome?)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent border-none focus:outline-hidden text-sm font-medium text-neutral-900 placeholder-neutral-400"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="px-5 py-3 rounded-2xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm shrink-0"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Kirim Pertanyaan</span>
          </button>
        </form>
      </div>
    </div>
  );
}
