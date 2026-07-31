'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Plus, Filter, Search, Layers, Briefcase, ChevronRight, CheckCircle2, Video, FileText } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const { clients, tasks } = useData();
  const { workspaces } = useWorkspace();

  // Filters State
  const [selectedScope, setSelectedScope] = useState<'ALL' | 'INHOUSE' | 'PERSONA'>('ALL');
  const [selectedStageCategory, setSelectedStageCategory] = useState<string>('ALL');
  const [selectedSpecificStage, setSelectedSpecificStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const STRATEGIC_STAGES = ['Brief', 'Content Proposal', 'Script & Shotlist', 'Editorial Calendar', 'Ready for Production'];
  const PRODUCTION_STAGES = ['Production', 'Shooting', 'Editing', 'Revision', 'Approval', 'Ready to Post', 'Scheduling'];
  const COMPLETED_STAGES = ['Posted', 'Completed'];

  const ALL_STAGES = [
    'Brief', 'Content Proposal', 'Script & Shotlist', 'Editorial Calendar', 'Ready for Production',
    'Production', 'Shooting', 'Editing', 'Revision', 'Approval', 'Ready to Post', 'Scheduling', 'Posted', 'Completed'
  ];

  // Filter clients by scope
  const filteredClients = clients.filter((c) => {
    if (selectedScope === 'INHOUSE') {
      return c.workspaceId === 'ws-inhouse' || c.code?.toLowerCase().includes('inhouse') || c.name?.toLowerCase().includes('in-house');
    }
    if (selectedScope === 'PERSONA') {
      return c.workspaceId === 'ws-team-anggi' || (!c.workspaceId && !c.code?.toLowerCase().includes('inhouse'));
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
          const strategicCount = clientTasks.filter((t) => STRATEGIC_STAGES.includes(t.status)).length;
          const productionCount = clientTasks.filter((t) => PRODUCTION_STAGES.includes(t.status)).length;
          const postedCount = clientTasks.filter((t) => COMPLETED_STAGES.includes(t.status)).length;

          return (
            <div key={c.id} className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-4 shadow-xs hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                      {c.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {c.workspaceId === 'ws-team-anggi' ? 'In-House' : 'Persona Client'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 mt-2">{c.name} Content Campaign</h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  {totalPoints} pts
                </span>
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
    </div>
  );
}
