'use client';

import React from 'react';
import { useData } from '@/context/DataContext';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const { clients, tasks } = useData();

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Project Workflow Campaigns <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Pipeline Stage Engine</span>
          </h1>
          <p className="text-xs text-neutral-500">Every project follows: Brief → Proposal → Script → Calendar → Shooting → Editing → Approval → Scheduling → Posted.</p>
        </div>

        <Link
          href="/kanban"
          className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-xs flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> Open Kanban Pipeline
        </Link>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clients.map((c) => {
          const clientTasks = tasks.filter((t) => t.clientId === c.id);
          const totalPoints = clientTasks.reduce((sum, t) => sum + t.score, 0);

          return (
            <div key={c.id} className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                    {c.code}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 mt-2">{c.name} Content Batch</h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  {totalPoints} pts
                </span>
              </div>

              <p className="text-xs text-neutral-500">
                Active monthly campaign containing {clientTasks.length} production items across pipeline stages.
              </p>

              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Active Pipeline Tasks</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {clientTasks.map((t) => (
                    <div key={t.id} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-900 truncate">{t.title}</span>
                      <span className="text-[10px] font-mono bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded font-semibold">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
