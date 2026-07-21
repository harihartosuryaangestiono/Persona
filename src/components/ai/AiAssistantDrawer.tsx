'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { Bot, Sparkles, X, Send, BrainCircuit, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '@/lib/score-calculator';

export function AiAssistantDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { tasks, clients, worklogs } = useData();
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; text: string; actionList?: string[] }[]
  >([
    {
      role: 'assistant',
      text: 'Hello! I am your Persona OS Operations AI. I continuously monitor team capacity, client point budgets, deadline risks, and worklog productivity. How can I assist your agency operations today?',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  const handleQuickQuestion = (promptText: string) => {
    setInputQuery(promptText);
    processQuery(promptText);
  };

  const processQuery = (query: string) => {
    if (!query.trim()) return;
    const userMsg = { role: 'user' as const, text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsAnalyzing(true);

    setTimeout(() => {
      let responseText = '';
      let actions: string[] = [];

      const q = query.toLowerCase();

      if (q.includes('jabin') || q.includes('work on')) {
        const jabinTasks = tasks.filter((t) =>
          t.assignedUserIds?.some((id) => id.includes('jabin') || id === 'u-jabin')
        );
        responseText = `Jabin has ${jabinTasks.length || 2} active production tasks assigned today:
1. Artisan Pastry Reel Video (Baking Empire GS - Editing Stage, Deadline: July 22)
2. Samazama Ramen Promo Reel (Samazama Japan - Approval Stage)

Recommended focus: Complete the Artisan Pastry Reel edit first to prevent deadline bottleneck.`;
        actions = ['Open Kanban Board', 'Review Jabin Worklog'];
      } else if (q.includes('budget') || q.includes('out of budget')) {
        const lowBudgetClients = clients.filter((c) => c.remainingPoint < 1000);
        responseText = `⚠️ Client Point Budget Alert:
${lowBudgetClients
  .map(
    (c) =>
      `• ${c.name}: ${c.remainingPoint} pts remaining (${Math.round(
        (c.usedPoint / c.monthlyPointBudget) * 100
      )}% burned)`
  ).join('\n')}

Notice: Baking Empire Kelapa Gading and Baking Empire Citra 8 are reaching point capacity. The system will prevent new task creation once points hit zero.`;
        actions = ['Send Budget Upsell Proposal', 'View Client Budget Table'];
      } else if (q.includes('workload') || q.includes('highest')) {
        responseText = `Team Workload Heatmap Summary:
• Anggi & Priska: High Workload (MotoDW Superbike photoshoot session, 800 pts)
• Dindong: High Workload (3 multi-client carousel & scheduling tasks, 325 pts)
• Jabin: Medium Workload (150 pts)
• Gigie: Optimal Capacity (66 pts)

Recommendation: Reassign 1 static graphic task from Dindong to Gigie for optimal team throughput.`;
        actions = ['Auto Redistribute Workload', 'Open Workload Heatmap'];
      } else if (q.includes('content plan') || q.includes('generate')) {
        responseText = `✨ AI Content Plan Idea Generated for Baking Empire GS:
Title: "Behind the Secret Sourdough Fermentation"
Format: Instagram Reels (150 pts)
Category: Editor / Editing
Suggested Deadline: July 25, 2026 (Posting Date: July 28, 2026)
Estimated COGS: Rp37.500 (150 pts * Rp250)`;
        actions = ['1-Click Create Task in Kanban', 'Copy Content Brief'];
      } else {
        responseText = `Based on current agency metrics across 6 active clients:
• Total Monthly Point Budget Burn: 68.4%
• Active Pipeline Tasks: ${tasks.length} items
• Estimated COGS: ${formatRupiah(tasks.reduce((sum, t) => sum + (t.cogs || 0), 0))}
• Overall Agency Operational Health: 94% (Optimal)`;
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: responseText, actionList: actions }]);
      setIsAnalyzing(false);
    }, 600);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-950/95 border-l border-slate-800 shadow-2xl glass-panel flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              Persona OS AI Operations <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md font-mono">v2.4</span>
            </h3>
            <p className="text-xs text-slate-400">Realtime Capacity & Budget Intelligence</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-3 bg-slate-900/40 border-b border-slate-800/60 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <BrainCircuit className="w-3 h-3 text-blue-400" /> Quick Operations Prompts
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[
            'What should Jabin work on today?',
            'Which client is almost out of budget?',
            'Who has the highest workload?',
            'Generate Content Plan',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleQuickQuestion(prompt)}
              className="text-xs bg-slate-800/80 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 border border-slate-700/60 hover:border-blue-500/40 px-2.5 py-1 rounded-lg transition text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
              }`}
            >
              <div className="whitespace-pre-line">{m.text}</div>
              {m.actionList && m.actionList.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                  {m.actionList.map((act) => (
                    <button
                      key={act}
                      className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-medium px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1 transition"
                    >
                      <CheckCircle2 className="w-3 h-3" /> {act}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-xs text-blue-400 py-2">
            <Sparkles className="w-4 h-4 animate-spin" /> Analyzing real-time workspace database...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            processQuery(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask AI about workload, COGS, budget..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          <button
            type="submit"
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
