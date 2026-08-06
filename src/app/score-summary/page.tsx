'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { formatRupiah, getCapacityHealth, calculateUserPointsForPeriod } from '@/lib/score-calculator';
import { Filter, Calendar } from 'lucide-react';

export default function ScoreSummaryPage() {
  const { allUsers } = useUser();
  const { worklogs, tasks } = useData();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(monthNames[currentDate.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Master Score Summary & Employee Capacity <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Monthly 16,000 Pts Cap</span>
          </h1>
          <p className="text-xs text-neutral-500">Tracks employee effective workload capacity (16,000 points monthly limit).</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2.5 bg-white border border-neutral-200 p-2 rounded-xl shadow-2xs text-xs font-semibold">
          <Calendar className="w-4 h-4 text-neutral-450" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-neutral-800 focus:outline-hidden"
          >
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-center text-neutral-800 font-mono focus:outline-hidden"
          />
        </div>
      </div>

      {/* Leaderboard Summary Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Month Period</th>
                <th className="px-4 py-3.5 text-right">Score (pts)</th>
                <th className="px-4 py-3.5 text-right">Capacity Limit</th>
                <th className="px-4 py-3.5 text-right">Remaining Capacity</th>
                <th className="px-4 py-3.5 text-center">Capacity Load %</th>
                <th className="px-4 py-3.5 text-right">COGS (Rp250/pt)</th>
                <th className="px-4 py-3.5">Capacity Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {allUsers.map((usr) => {
                // Sum worklogs and active tasks matching selected period
                const userPoints = calculateUserPointsForPeriod(usr, selectedMonth, selectedYear, worklogs, tasks);

                const capacity = (usr.monthlyCapacity && usr.monthlyCapacity !== 12000) ? usr.monthlyCapacity : 16000;
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

                    <td className="px-4 py-3.5 font-semibold text-neutral-600 capitalize">
                      {selectedMonth} {selectedYear}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-neutral-900">{userPoints} pts</td>
                    <td className="px-4 py-3.5 text-right font-mono text-neutral-500">{capacity.toLocaleString()} pts</td>
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
                                ? 'bg-red-650 animate-pulse'
                                : health.status === 'YELLOW'
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, health.percent))}%` }}
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
