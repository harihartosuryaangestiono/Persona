'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { DollarSign, ShieldAlert, AlertTriangle, Plus, CheckCircle2, Edit3, X, Save } from 'lucide-react';
import { formatRupiah } from '@/lib/score-calculator';
import { ClientMonthlyBudgetItem } from '@/lib/types';

export default function ClientBudgetPage() {
  const { clients, budgets, setBudgets } = useData();
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  // Modal State for Add & Edit Budget
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ClientMonthlyBudgetItem | null>(null);

  // New Budget Form State
  const [newClientId, setNewClientId] = useState(clients[0]?.id || '');
  const [newMonth, setNewMonth] = useState('2026-07');
  const [newBudgetPoints, setNewBudgetPoints] = useState(5000);

  const displayedBudgets = budgets.filter((b) => selectedMonth === 'ALL' || b.month === selectedMonth);

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClient = clients.find((c) => c.id === newClientId) || clients[0];

    const newItem: ClientMonthlyBudgetItem = {
      id: `bgt-${Date.now()}`,
      clientId: targetClient.id,
      clientName: targetClient.name,
      month: newMonth,
      budget: newBudgetPoints,
      used: 0,
      remaining: newBudgetPoints,
    };

    setBudgets((prev) => [...prev, newItem]);
    setIsAddModalOpen(false);
  };

  const handleUpdateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;

    setBudgets((prev) =>
      prev.map((b) =>
        b.id === editingBudget.id
          ? {
              ...b,
              budget: editingBudget.budget,
              remaining: Math.max(0, editingBudget.budget - b.used),
            }
          : b
      )
    );

    setIsEditModalOpen(false);
    setEditingBudget(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Persona · Client Budget <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Jatah Score Per Klien Per Bulan</span>
          </h1>
          <p className="text-xs text-slate-400">
            Monthly point budget quota, usage tracking, status guardrails, and dynamic budget adjustment.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> Add Monthly Budget
        </button>
      </div>

      {/* Month Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 glass-panel">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedMonth('ALL')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedMonth === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Months ({budgets.length})
          </button>
          <button
            onClick={() => setSelectedMonth('2026-07')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedMonth === '2026-07' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Juli 2026
          </button>
          <button
            onClick={() => setSelectedMonth('2026-08')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedMonth === '2026-08' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Agustus 2026
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono">1 pt = Rp250 COGS</span>
      </div>

      {/* Official Table Matching User Format */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Klien</th>
                <th className="px-4 py-3.5">Bulan</th>
                <th className="px-4 py-3.5 text-right">Budget (pts)</th>
                <th className="px-4 py-3.5 text-right">Terpakai (pts)</th>
                <th className="px-4 py-3.5 text-right">Sisa (pts)</th>
                <th className="px-4 py-3.5 text-center">% Terpakai</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {displayedBudgets.map((b) => {
                const pct = Math.round((b.used / b.budget) * 100);
                const isWarning = pct >= 80;
                const monthDisplay = b.month === '2026-07' ? 'Juli 2026' : b.month === '2026-08' ? 'Agustus 2026' : b.month;

                return (
                  <tr key={b.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-100">{b.clientName}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-300 font-semibold">{monthDisplay}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-200">{b.budget.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-amber-400 font-semibold">{b.used.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">{b.remaining.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold">{pct}%</td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          isWarning
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isWarning ? 'Menuju batas' : 'Aman'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => {
                          setEditingBudget(b);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-blue-400 hover:text-blue-300 transition"
                        title="Edit Budget"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Budget Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <form
            onSubmit={handleAddBudget}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 glass-panel space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" /> Add New Client Monthly Budget
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Client</label>
                <select
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Month</label>
                <select
                  value={newMonth}
                  onChange={(e) => setNewMonth(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="2026-07">Juli 2026</option>
                  <option value="2026-08">Agustus 2026</option>
                  <option value="2026-09">September 2026</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Budget Points (pts)</label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={newBudgetPoints}
                  onChange={(e) => setNewBudgetPoints(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-5 py-2 rounded-xl shadow-lg shadow-blue-600/30"
              >
                Save Budget
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Budget Modal */}
      {isEditModalOpen && editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <form
            onSubmit={handleUpdateBudget}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 glass-panel space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" /> Edit Budget ({editingBudget.clientName})
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Monthly Budget Points (pts)</label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={editingBudget.budget}
                  onChange={(e) =>
                    setEditingBudget({ ...editingBudget, budget: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-slate-400">Used Points: <span className="text-amber-400 font-mono font-bold">{editingBudget.used} pts</span></p>
                <p className="text-slate-400">New Remaining Points: <span className="text-emerald-400 font-mono font-bold">{Math.max(0, editingBudget.budget - editingBudget.used)} pts</span></p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-5 py-2 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
