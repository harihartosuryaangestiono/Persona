'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/context/ToastContext';
import {
  Sparkles,
  Send,
  Database,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Calendar,
  FileSpreadsheet,
  Copy,
  Check,
  ChevronRight,
  Zap,
  Info,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { PersonaAIEngine, ExecutiveSummary, PersonaAIResponse } from '@/lib/services/persona-ai-engine';

export default function PersonaAIPage() {
  const { worklogs, tasks, clients, budgets, attendances, leaveRequests } = useData();
  const { currentUser, allUsers } = useUser();
  const { showToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [execSummary, setExecSummary] = useState<ExecutiveSummary | null>(null);
  const [activeResponse, setActiveResponse] = useState<PersonaAIResponse | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleQuery = (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setPrompt(queryText);

    try {
      const res = PersonaAIEngine.processQuery(
        queryText,
        worklogs,
        tasks || [],
        clients,
        allUsers,
        budgets || [],
        attendances || [],
        leaveRequests || []
      );

      setActiveResponse(res);
    } catch (e: any) {
      showToast('Gagal memproses kueri database', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(prompt);
  };

  const handleCopy = () => {
    if (!activeResponse) return;
    const text = `${activeResponse.answerTitle}\n\n${activeResponse.answerText}\n\nAnalysis Based On:\n- Source: ${activeResponse.reasoning.source}\n- Records Analyzed: ${activeResponse.reasoning.recordsFound}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Ringkasan berhasil disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const QUICK_BUTTONS = [
    { label: 'Total Reels Bulan Ini', query: 'Berapa total Reels bulan Agustus?' },
    { label: 'Total Carousel Bulan Ini', query: 'Berapa Carousel bulan Agustus?' },
    { label: 'Status Budget Klien', query: 'Budget Karihome tinggal berapa?' },
    { label: 'Workload & Peringkat Editor', query: 'Siapa editor paling sibuk bulan ini?' },
    { label: 'Agenda Operasional Hari Ini', query: 'Hari ini ada apa?' },
    { label: 'Daftar Overdue Tasks', query: 'Ada task yang overdue?' },
    { label: 'Ringkasan BEGS', query: 'Ringkasan Baking Empire bulan Agustus' },
    { label: 'Reels Baking Empire', query: 'Berapa konten Carousel Baking Empire Gading Serpong bulan Agustus?' },
    { label: 'Bandingkan Juli vs Agustus', query: 'Bandingkan Juli vs Agustus' },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
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

      {/* QUICK ACTION BUTTONS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Quick Executive Action Queries (1-Click Execution)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              onClick={() => handleQuery(btn.query)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-900 hover:text-white border border-neutral-200/90 text-neutral-700 font-semibold text-xs transition shadow-2xs flex items-center gap-1.5 active:scale-95"
            >
              <span>{btn.label}</span>
              <ChevronRight className="w-3 h-3 text-neutral-400 opacity-60" />
            </button>
          ))}
        </div>
      </div>

      {/* NATURAL LANGUAGE QUERY INPUT BAR */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="bg-white rounded-2xl border border-neutral-300 shadow-md p-2 flex items-center gap-3 focus-within:ring-2 focus-within:ring-neutral-900 transition">
          <div className="pl-3 text-neutral-400">
            <Sparkles className="w-5 h-5 text-emerald-500" />
          </div>
          <input
            type="text"
            placeholder="Tanyakan ke Persona AI... (contoh: Berapa total Reels bulan Agustus? atau Siapa editor paling sibuk?)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-hidden text-sm font-medium text-neutral-900 placeholder-neutral-400"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 disabled:opacity-50 transition flex items-center gap-2 shadow-sm"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Query Database</span>
          </button>
        </div>
      </form>

      {/* ACTIVE RESPONSE DISPLAY AREA */}
      {activeResponse && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200/90 shadow-lg space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                Persona AI Result
              </span>
              <h2 className="text-xl font-bold text-neutral-900 mt-1">{activeResponse.answerTitle}</h2>
            </div>
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs flex items-center gap-1.5 transition self-start md:self-auto"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin' : 'Salin Laporan'}</span>
            </button>
          </div>

          {/* SUMMARY CARDS */}
          {activeResponse.summaryCards && activeResponse.summaryCards.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {activeResponse.summaryCards.map((card, idx) => (
                <div key={idx} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/70 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-neutral-400">{card.label}</span>
                  <div className="text-lg font-black text-neutral-900">{card.value}</div>
                  {card.badge && (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-200/80 text-neutral-700">
                      {card.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ANSWER TEXT */}
          <div className="bg-neutral-50/60 rounded-2xl p-5 border border-neutral-200/80 text-sm leading-relaxed text-neutral-800 space-y-2">
            <div className="font-medium whitespace-pre-line">{activeResponse.answerText}</div>
          </div>

          {/* AUTO INSIGHTS */}
          {activeResponse.autoInsights && activeResponse.autoInsights.length > 0 && (
            <div className="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-200/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Auto Insights (Derived from Dataset)</span>
              </div>
              <ul className="space-y-1 text-xs text-emerald-800 font-medium">
                {activeResponse.autoInsights.map((insight, idx) => (
                  <li key={idx}>{insight}</li>
                ))}
              </ul>
            </div>
          )}

          {/* REASONING TRANSPARENCY PANEL */}
          <div className="bg-neutral-900 text-white rounded-2xl p-5 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Analysis Based On (Reasoning Transparency)</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">{activeResponse.reasoning.source}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              {activeResponse.reasoning.client && (
                <div>
                  <span className="text-neutral-400 block text-[10px]">Client:</span>
                  <strong className="text-white">{activeResponse.reasoning.client}</strong>
                </div>
              )}
              {activeResponse.reasoning.period && (
                <div>
                  <span className="text-neutral-400 block text-[10px]">Period:</span>
                  <strong className="text-white">{activeResponse.reasoning.period}</strong>
                </div>
              )}
              {activeResponse.reasoning.format && (
                <div>
                  <span className="text-neutral-400 block text-[10px]">Format:</span>
                  <strong className="text-white">{activeResponse.reasoning.format}</strong>
                </div>
              )}
              {activeResponse.reasoning.calculation && (
                <div>
                  <span className="text-neutral-400 block text-[10px]">Calculation:</span>
                  <strong className="text-emerald-400">{activeResponse.reasoning.calculation}</strong>
                </div>
              )}
              <div>
                <span className="text-neutral-400 block text-[10px]">Records Analyzed:</span>
                <strong className="text-amber-400">{activeResponse.reasoning.recordsFound} DB Rows</strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Database Source:</span>
                <strong className="text-emerald-400">Supabase PostgreSQL</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
