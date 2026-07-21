'use client';

import React from 'react';
import { useData } from '@/context/DataContext';
import { ShieldAlert } from 'lucide-react';
import { formatRupiah } from '@/lib/score-calculator';

export default function ClientsPage() {
  const { clients, tasks, worklogs } = useData();

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Client Management <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">6 Master Accounts</span>
          </h1>
          <p className="text-xs text-neutral-500">Monthly score limits & points governance. Clients cannot exceed purchased point caps.</p>
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((cli) => {
          const clientTasks = tasks.filter((t) => t.clientId === cli.id);
          const burnPercent = Math.round((cli.usedPoint / cli.monthlyPointBudget) * 100);
          const isWarning = cli.remainingPoint < 1000;
          const isExceeded = cli.remainingPoint <= 0;

          return (
            <div key={cli.id} className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-4 shadow-xs relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: cli.clientColor }}
              />

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">{cli.name}</h3>
                  <span className="text-[10px] font-mono text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                    CODE: {cli.code}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-neutral-900">
                    {cli.monthlyPointBudget} pts
                  </span>
                  <p className="text-[10px] text-neutral-400">Monthly Cap</p>
                </div>
              </div>

              {/* Point Usage Progress */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-500">Used: {cli.usedPoint} pts</span>
                  <span className={`font-bold ${isExceeded ? 'text-red-600' : isWarning ? 'text-amber-700' : 'text-emerald-700'}`}>
                    Rem: {cli.remainingPoint} pts ({burnPercent}%)
                  </span>
                </div>

                <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden border border-neutral-200">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, burnPercent)}%`,
                      backgroundColor: isExceeded ? '#DC2626' : isWarning ? '#D97706' : cli.clientColor,
                    }}
                  />
                </div>
              </div>

              {/* Status Warning Banner */}
              {isExceeded && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 font-semibold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Budget Exceeded! Prevent new task creation until top-up.</span>
                </div>
              )}

              {/* Stats Footer */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-100 text-xs">
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                  <span className="text-neutral-500 text-[10px]">Active Tasks:</span>
                  <p className="font-bold text-neutral-900">{clientTasks.length}</p>
                </div>

                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                  <span className="text-neutral-500 text-[10px]">Est. COGS:</span>
                  <p className="font-bold text-emerald-800">{formatRupiah(cli.usedPoint * 250)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
