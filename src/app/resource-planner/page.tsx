'use client';

import React from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AiOptimizerService } from '@/lib/services/ai-optimizer-service';
import { formatRupiah } from '@/lib/score-calculator';

export default function ResourcePlannerPage() {
  const { allUsers } = useUser();
  const { worklogs, tasks } = useData();

  const recommendations = AiOptimizerService.recommendAssignees(allUsers, worklogs, tasks, 150);

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Resource Planner & Workload Optimizer <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Workload Intelligence</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Realtime employee capacity allocation, workload distribution, and task assignment recommendations.
          </p>
        </div>
      </div>

      {/* Workload Recommendation Box */}
      <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neutral-700" /> Assignee Recommendation Engine
          </h3>
          <span className="text-xs font-mono text-neutral-800 bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200 font-semibold">
            Target Score: 150 pts (Reels/Carousel)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {recommendations.slice(0, 2).map((rec) => (
            <div
              key={rec.employee.id}
              className={`p-4 rounded-xl border space-y-2 ${
                rec.isRecommended
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={rec.employee.avatar} alt={rec.employee.name} className="w-7 h-7 rounded-full object-cover border border-neutral-200" />
                  <span className="font-bold text-neutral-900">{rec.employee.name}</span>
                </div>
                <span className="font-mono font-bold text-xs">{rec.currentPoints} / 12,000 pts</span>
              </div>

              <p className="text-[11px] leading-relaxed">{rec.reason}</p>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200 text-[10px] font-mono">
                <span>Remaining: {rec.remainingCapacity} pts</span>
                <span className="font-bold flex items-center gap-1">
                  {rec.isRecommended ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Recommended Assignee
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-red-700" /> Overload Warning
                    </>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Capacity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((rec) => (
          <div
            key={rec.employee.id}
            className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={rec.employee.avatar} alt={rec.employee.name} className="w-10 h-10 rounded-full object-cover border border-neutral-200" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">{rec.employee.name}</h4>
                  <p className="text-[10px] text-neutral-500">{rec.employee.roles.join(', ')}</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  rec.status === 'RED'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : rec.status === 'YELLOW'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {rec.capacityPercent}% LOAD
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-neutral-500">Used Points:</span>
                <span className="font-bold text-neutral-900">{rec.currentPoints} / 12,000 pts</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden border border-neutral-200">
                <div
                  className={`h-full transition-all ${
                    rec.status === 'RED'
                      ? 'bg-red-600'
                      : rec.status === 'YELLOW'
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, rec.capacityPercent)}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-700">
              COGS Value Generated: <span className="font-bold text-emerald-800 font-mono">{formatRupiah(rec.currentPoints * 250)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
