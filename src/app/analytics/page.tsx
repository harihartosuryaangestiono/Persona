'use client';

import React from 'react';
import { useData } from '@/context/DataContext';
import { DollarSign, Clock, Award, Activity } from 'lucide-react';
import { formatRupiah } from '@/lib/score-calculator';

export default function AnalyticsPage() {
  const { worklogs } = useData();

  const totalPoints = worklogs.reduce((sum, w) => sum + w.score, 0);
  const totalCOGS = totalPoints * 250;

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Executive Analytics & Velocity <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Realtime Intelligence</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Agency operational performance, profit margins, editing velocity, revision rates, and client ROI metrics.
          </p>
        </div>
      </div>

      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-700" /> Agency Production Value
          </p>
          <p className="text-2xl font-bold text-neutral-900 font-mono">{formatRupiah(totalCOGS)}</p>
          <p className="text-[10px] text-emerald-700 font-mono">+18.4% vs last month</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-700" /> Total Output Points
          </p>
          <p className="text-2xl font-bold text-neutral-900 font-mono">{totalPoints} pts</p>
          <p className="text-[10px] text-neutral-500 font-mono">19 Master Rules Applied</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" /> Avg Editing Velocity
          </p>
          <p className="text-2xl font-bold text-neutral-900 font-mono">1.8 Days</p>
          <p className="text-[10px] text-emerald-700 font-mono">0.4d faster than target</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-2 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-700" /> Revision Rate
          </p>
          <p className="text-2xl font-bold text-neutral-900 font-mono">3.2%</p>
          <p className="text-[10px] text-emerald-700 font-mono">World-class quality standard</p>
        </div>
      </div>
    </div>
  );
}
