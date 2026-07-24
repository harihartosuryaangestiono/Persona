'use client';

import React from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { formatRupiah, getCapacityHealth } from '@/lib/score-calculator';

export default function ScoreSummaryPage() {
  const { allUsers } = useUser();
  const { worklogs } = useData();

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Master Score Summary & Employee Capacity <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Monthly 12,000 Pts Cap</span>
          </h1>
          <p className="text-xs text-neutral-500">Tracks employee effective workload capacity (6 hrs/day × 20 workdays = 12,000 points).</p>
        </div>
      </div>

      {/* Leaderboard Summary Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Month</th>
                <th className="px-4 py-3.5 text-right">Score (pts)</th>
                <th className="px-4 py-3.5 text-right">Capacity</th>
                <th className="px-4 py-3.5 text-right">Remaining</th>
                <th className="px-4 py-3.5 text-center">Capacity %</th>
                <th className="px-4 py-3.5 text-right">COGS (Rp250/pt)</th>
                <th className="px-4 py-3.5">Capacity Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {allUsers.map((usr) => {
                const userPoints = worklogs.reduce((sum, w) => {
                  const logStages = w.stages ? (typeof w.stages === 'string' ? JSON.parse(w.stages) : w.stages) : [];
                  if (logStages.length > 0) {
                    const userStagePoints = logStages
                      .filter((s: any) => s.userId === usr.id || s.userName === usr.name)
                      .reduce((sumStage: number, s: any) => sumStage + (Number(s.score) || 0), 0);
                    return sum + userStagePoints;
                  } else {
                    const isUserLog = w.userName === usr.name || w.userId === usr.id;
                    return sum + (isUserLog ? w.score : 0);
                  }
                }, 0);

                const capacity = 12000;
                const remaining = Math.max(0, capacity - userPoints);
                const health = getCapacityHealth(userPoints, capacity);
                const cogs = userPoints * 250;

                return (
                  <tr key={usr.id} className="hover:bg-neutral-50 transition">
                    <td className="px-4 py-3.5 flex items-center gap-3">
                      <img src={usr.avatar} alt={usr.name} className="w-8 h-8 rounded-full object-cover border border-neutral-200" />
                      <div>
                        <p className="font-bold text-neutral-900">{usr.name}</p>
                        <p className="text-[10px] text-neutral-500">{usr.roles.join(', ')}</p>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-neutral-500">July 2026</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-neutral-900">{userPoints} pts</td>
                    <td className="px-4 py-3.5 text-right font-mono text-neutral-500">12,000 pts</td>
                    <td className="px-4 py-3.5 text-right font-mono text-neutral-700">{remaining} pts</td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold">{health.percent}%</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-800">{formatRupiah(cogs)}</td>

                    {/* Capacity Indicator */}
                    <td className="px-4 py-3.5 min-w-[180px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="font-semibold text-neutral-700">{health.status}</span>
                        </div>
                        <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden border border-neutral-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              health.status === 'RED'
                                ? 'bg-red-600'
                                : health.status === 'YELLOW'
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.min(100, health.percent || 15)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
