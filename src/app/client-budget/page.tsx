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
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Client Monthly Budget <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Jatah Score Per Klien Per Bulan</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Monthly point budget quota, usage tracking, status guardrails, and dynamic budget adjustment.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> Add Monthly Budget
        </button>
      </div>

      {/* Month Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedMonth('ALL')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedMonth === 'ALL' ? 'bg-neutral-900 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All Months ({budgets.length})
          </button>
          <button
            onClick={() => setSelectedMonth('2026-07')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedMonth === '2026-07' ? 'bg-neutral-900 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Juli 2026
          </button>
          <button
            onClick={() => setSelectedMonth('2026-08')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedMonth === '2026-08' ? 'bg-neutral-900 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Agustus 2026
          </button>
        </div>

        <span className="text-xs text-neutral-500 font-mono">1 pt = Rp250 COGS</span>
      </div>

      {/* Official Table Matching User Format */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 whitespace-nowrap">
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
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {displayedBudgets.map((b) => {
                const pct = Math.round((b.used / b.budget) * 100);
                const isWarning = pct >= 80;
                const monthDisplay = b.month === '2026-07' ? 'Juli 2026' : b.month === '2026-08' ? 'Agustus 2026' : b.month;

                return (
                  <tr key={b.id} className="hover:bg-neutral-50/80 transition">
                    <td className="px-4 py-3.5 font-bold text-neutral-900">{b.clientName}</td>
                    <td className="px-4 py-3.5 font-mono text-neutral-600 font-semibold">{monthDisplay}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-neutral-900">{b.budget.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-amber-600 font-semibold">{b.used.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600">{b.remaining.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold text-neutral-800">{pct}%</td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          isWarning
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
                        className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleAddBudget}
            className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-neutral-700" /> Add New Client Monthly Budget
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-750"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Select Client</label>
                <select
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Month</label>
                <select
                  value={newMonth}
                  onChange={(e) => setNewMonth(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                >
                  <option value="2026-07">Juli 2026</option>
                  <option value="2026-08">Agustus 2026</option>
                  <option value="2026-09">September 2026</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Budget Points (pts)</label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={newBudgetPoints}
                  onChange={(e) => setNewBudgetPoints(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-sm"
              >
                Save Budget
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Budget Modal */}
      {isEditModalOpen && editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleUpdateBudget}
            className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-neutral-700" /> Edit Budget ({editingBudget.clientName})
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-750"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Monthly Budget Points (pts)</label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={editingBudget.budget}
                  onChange={(e) =>
                    setEditingBudget({ ...editingBudget, budget: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-mono font-bold"
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1">
                <p className="text-neutral-600">Used Points: <span className="text-amber-600 font-mono font-bold">{editingBudget.used} pts</span></p>
                <p className="text-neutral-600">New Remaining Points: <span className="text-emerald-600 font-mono font-bold">{Math.max(0, editingBudget.budget - editingBudget.used)} pts</span></p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-sm flex items-center gap-1.5"
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
