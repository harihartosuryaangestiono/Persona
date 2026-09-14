'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Plus, Filter, Search, Layers, Briefcase, ChevronRight, CheckCircle2, Video, FileText, Edit2, X, Save } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const { clients, tasks, updateClient, saveClientBudget, refreshData } = useData();
  const { workspaces } = useWorkspace();

  // Filters State
  const [selectedScope, setSelectedScope] = useState<'ALL' | 'INHOUSE' | 'PERSONA'>('ALL');
  const [selectedStageCategory, setSelectedStageCategory] = useState<string>('ALL');
  const [selectedSpecificStage, setSelectedSpecificStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Score Edit Modal State
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [editScoreValue, setEditScoreValue] = useState<number>(5000);
  const [savingScore, setSavingScore] = useState(false);

  const STRATEGIC_STAGES = ['Brief', 'Content Proposal', 'Editorial Calendar', 'Script & Shotlist', 'Ready for Production'];
  const PRODUCTION_STAGES = ['Production', 'Shooting', 'Editing', 'Revision', 'Waiting for Approval', 'Approval', 'Ready to Post', 'Scheduling'];
  const COMPLETED_STAGES = ['Posted', 'Completed'];

  const ALL_STAGES = [
    'Brief', 'Content Proposal', 'Editorial Calendar', 'Script & Shotlist', 'Ready for Production',
    'Production', 'Shooting', 'Editing', 'Revision', 'Waiting for Approval', 'Approval', 'Ready to Post', 'Scheduling', 'Posted', 'Completed'
  ];

  const handleOpenScoreModal = (client: any) => {
    setEditingClient(client);
    setEditScoreValue(client.monthlyPointBudget || 5000);
  };

  const handleSaveProjectScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      setSavingScore(true);
      const newScore = Number(editScoreValue);

      // Save via API
      const res = await fetch(`/api/clients?id=${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyPointBudget: newScore }),
      });

      if (res.ok) {
        await updateClient(editingClient.id, { monthlyPointBudget: newScore });
        // Also sync monthly budget table
        const monthStr = '2026-09';
        await saveClientBudget(editingClient.id, monthStr, newScore);
        await refreshData();
      }
      setEditingClient(null);
    } catch (e) {
      console.error('Failed to save project score:', e);
    } finally {
      setSavingScore(false);
    }
  };

  // Filter clients by scope
  const filteredClients = clients.filter((c) => {
    if (selectedScope === 'INHOUSE') {
      return c.workspaceId === 'ws-inhouse' || c.code?.toLowerCase().includes('inhouse') || c.name?.toLowerCase().includes('in-house');
    }
    if (selectedScope === 'PERSONA') {
      return c.workspaceId === 'ws-team-anggi' || c.name?.toLowerCase().includes('motodw') || c.code?.toLowerCase().includes('mdw') || (!c.workspaceId && !c.code?.toLowerCase().includes('inhouse'));
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Project Workflow Campaigns <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Pipeline Stage Engine</span>
          </h1>
          <p className="text-xs text-neutral-500">Filter by In-House or Persona projects and inspect specific production pipeline stages.</p>
        </div>

        <Link
          href="/kanban"
          className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> Open Kanban Pipeline
        </Link>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Scope Selector Tabs (In-House vs Persona) */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-semibold">
            <button
              onClick={() => setSelectedScope('ALL')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                selectedScope === 'ALL' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              All Projects ({clients.length})
            </button>
            <button
              onClick={() => setSelectedScope('INHOUSE')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                selectedScope === 'INHOUSE' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              In-House Team
            </button>
            <button
              onClick={() => setSelectedScope('PERSONA')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                selectedScope === 'PERSONA' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Persona Clients
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by title or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-900 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Stage Category Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100 text-xs">
          <span className="text-neutral-400 font-semibold flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter Stage:
          </span>

          <select
            value={selectedStageCategory}
            onChange={(e) => {
              setSelectedStageCategory(e.target.value);
              setSelectedSpecificStage('ALL');
            }}
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 font-semibold text-neutral-800 focus:outline-hidden"
          >
            <option value="ALL">All Production Stages</option>
            <option value="STRATEGIC">Strategic Stages (Brief → Ready for Prod)</option>
            <option value="PRODUCTION">Production Stages (Shoot → Scheduling)</option>
            <option value="COMPLETED">Completed / Posted</option>
          </select>

          <select
            value={selectedSpecificStage}
            onChange={(e) => setSelectedSpecificStage(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 font-semibold text-neutral-800 focus:outline-hidden"
          >
            <option value="ALL">Specific Stage: Any</option>
            {ALL_STAGES.map((stg) => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </select>

          {(selectedScope !== 'ALL' || selectedStageCategory !== 'ALL' || selectedSpecificStage !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedScope('ALL');
                setSelectedStageCategory('ALL');
                setSelectedSpecificStage('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-red-500 font-semibold hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredClients.map((c) => {
          let clientTasks = tasks.filter((t) => !t.isArchived && t.clientId === c.id);

          // Apply Stage Category Filter
          if (selectedStageCategory === 'STRATEGIC') {
            clientTasks = clientTasks.filter((t) => STRATEGIC_STAGES.includes(t.status));
          } else if (selectedStageCategory === 'PRODUCTION') {
            clientTasks = clientTasks.filter((t) => PRODUCTION_STAGES.includes(t.status));
          } else if (selectedStageCategory === 'COMPLETED') {
            clientTasks = clientTasks.filter((t) => COMPLETED_STAGES.includes(t.status));
          }

          // Apply Specific Stage Filter
          if (selectedSpecificStage !== 'ALL') {
            clientTasks = clientTasks.filter((t) => t.status === selectedSpecificStage);
          }

          // Apply Search Query
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            clientTasks = clientTasks.filter(
              (t) => t.title.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
            );
          }

          const totalPoints = clientTasks.reduce((sum, t) => sum + (t.score || 0), 0);
          const targetBudget = c.monthlyPointBudget || 5000;
          const pct = targetBudget > 0 ? Math.min(100, Math.round((totalPoints / targetBudget) * 100)) : 0;
          const strategicCount = clientTasks.filter((t) => STRATEGIC_STAGES.includes(t.status)).length;
          const productionCount = clientTasks.filter((t) => PRODUCTION_STAGES.includes(t.status)).length;
          const postedCount = clientTasks.filter((t) => COMPLETED_STAGES.includes(t.status)).length;

          return (
            <div key={c.id} className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-4 shadow-xs hover:shadow-md transition relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                      {c.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {c.workspaceId === 'ws-inhouse' || c.code?.toLowerCase().includes('inhouse') || c.name?.toLowerCase().includes('in-house') ? 'In-House' : 'Persona Client'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 mt-2">{c.name} Content Campaign</h3>
                </div>

                <div className="text-right space-y-1">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-xs font-mono font-bold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded border border-neutral-200">
                      {totalPoints} / {targetBudget.toLocaleString()} pts
                    </span>
                    <button
                      onClick={() => handleOpenScoreModal(c)}
                      title="Edit Project Target Score"
                      className="p-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition border border-neutral-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-neutral-500 font-semibold">{pct}% budget used</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden border border-neutral-200">
                <div
                  className={`h-full transition-all duration-300 ${
                    pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Stage breakdown badges */}
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                  Strategic: {strategicCount}
                </span>
                <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md font-semibold">
                  Production: {productionCount}
                </span>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                  Posted: {postedCount}
                </span>
              </div>

              {/* Task Items List */}
              <div className="space-y-2 pt-3 border-t border-neutral-100">
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <span>Filtered Pipeline Items ({clientTasks.length})</span>
                  <Link href={`/kanban?client=${c.id}`} className="text-neutral-900 hover:underline flex items-center gap-0.5 normal-case">
                    View in Kanban <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {clientTasks.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic py-4 text-center">No tasks match the selected stage filter.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {clientTasks.map((t) => (
                      <div key={t.id} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs hover:bg-neutral-100/80 transition">
                        <div className="truncate pr-2">
                          <span className="font-semibold text-neutral-900 truncate block">{t.title}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">{t.format || 'Reels'} • {t.category}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 ${
                            STRATEGIC_STAGES.includes(t.status)
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : PRODUCTION_STAGES.includes(t.status)
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Edit Project Score Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-md p-6 shadow-xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-neutral-900 text-base">Edit Project Target Score</h3>
                <p className="text-xs text-neutral-500">{editingClient.name} ({editingClient.code})</p>
              </div>
              <button
                onClick={() => setEditingClient(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectScore} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 block">Monthly Target Score (Points Budget)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={editScoreValue}
                  onChange={(e) => setEditScoreValue(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-neutral-900 focus:outline-hidden focus:border-neutral-900"
                  placeholder="e.g. 5000"
                />
                <p className="text-[11px] text-neutral-400 italic">Score target ini menentukan batas kuota point bulanan untuk project ini dan dapat diubah kapan saja.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScore}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingScore ? 'Saving...' : 'Update Score Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
