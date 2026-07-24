'use client';

import React from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { Download, TrendingUp, Award } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatRupiah } from '@/lib/score-calculator';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const { clients, worklogs, tasks } = useData();
  const { allUsers } = useUser();

  const totalCOGS = tasks.reduce((sum, t) => sum + (t.cogs || 0), 0);
  const totalPoints = clients.reduce((sum, c) => sum + c.usedPoint, 0);

  // Client Budget Usage Data for Bar Chart
  const clientChartData = clients.map((c) => ({
    name: c.code,
    fullName: c.name,
    Used: c.usedPoint,
    Remaining: c.remainingPoint,
    COGS: c.usedPoint * 250,
  }));

  // User Productivity Data for Chart
  const userProductivityData = allUsers.map((u) => {
    const pts = worklogs.reduce((sum, w) => {
      const logStages = w.stages ? (typeof w.stages === 'string' ? JSON.parse(w.stages) : w.stages) : [];
      if (logStages.length > 0) {
        const userStagePoints = logStages
          .filter((s: any) => s.userId === u.id || s.userName === u.name)
          .reduce((sumStage: number, s: any) => sumStage + (Number(s.score) || 0), 0);
        return sum + userStagePoints;
      } else {
        const isUserLog = w.userName === u.name || w.userId === u.id;
        return sum + (isUserLog ? w.score : 0);
      }
    }, 0);
    return {
      name: u.name,
      Points: pts,
    };
  });

  const exportPDF = () => {
    window.print();
  };

  const exportExcelReport = () => {
    const data = clients.map((c) => ({
      Client: c.name,
      Code: c.code,
      'Monthly Point Budget': c.monthlyPointBudget,
      'Used Points': c.usedPoint,
      'Remaining Points': c.remainingPoint,
      'Total Client Value (Rp)': c.usedPoint * 1500,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Executive_Report');
    XLSX.writeFile(wb, `PersonaOS_Executive_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Executive Command Center & Reports <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Realtime Analytics</span>
          </h1>
          <p className="text-xs text-neutral-500">High-level executive overview of agency revenue, COGS burn, productivity, and client health.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            className="bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-neutral-500" /> Export PDF Report
          </button>
          <button
            onClick={exportExcelReport}
            className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" /> Export Excel Analytics
          </button>
        </div>
      </div>

      {/* High-Level Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Agency Points Burned</span>
          <p className="text-3xl font-bold text-neutral-900">{totalPoints.toLocaleString()} pts</p>
          <p className="text-xs text-neutral-400">Across 6 master accounts</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Calculated Agency COGS</span>
          <p className="text-3xl font-bold text-emerald-800">{formatRupiah(totalCOGS)}</p>
          <p className="text-xs text-neutral-400">Total cost at Rp250 / point</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Client Health Score</span>
          <p className="text-3xl font-bold text-neutral-900">96.4%</p>
          <p className="text-xs text-neutral-400">Low revision rate & healthy budget burn</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Client Budget Usage Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neutral-700" /> Client Point Usage Breakdown
          </h3>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientChartData}>
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', fontSize: '12px', color: '#111827' }}
                />
                <Bar dataKey="Used" fill="#111827" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Remaining" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Employee Productivity Score Leaderboard Chart */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-neutral-700" /> Employee Productivity Leaderboard (Pts)
          </h3>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userProductivityData} layout="vertical">
                <XAxis type="number" stroke="#6b7280" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', fontSize: '12px', color: '#111827' }}
                />
                <Bar dataKey="Points" fill="#111827" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
