'use client';

import React from 'react';
import { useData } from '@/context/DataContext';
import { Video, Calendar, MapPin, Users, CheckSquare } from 'lucide-react';

export default function ProductionPage() {
  const { tasks } = useData();

  const shootingTasks = tasks.filter((t) => t.status === 'Shooting' || t.taskType?.includes('Production'));

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Production & Shooting Schedule <span className="text-xs font-mono bg-purple-50 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">On-Site & Studio</span>
          </h1>
          <p className="text-xs text-neutral-500">On-site shoot sessions, camera gear allocation, and production lead assignments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shootingTasks.map((t) => (
          <div key={t.id} className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                  {t.clientName}
                </span>
                <h3 className="text-base font-bold text-neutral-900 mt-2">{t.title}</h3>
                <p className="text-xs text-neutral-500">{t.description}</p>
              </div>

              <span className="text-xs font-mono font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                {t.score} pts
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-mono">
              <div>
                <span className="text-neutral-500">Date:</span>
                <p className="font-semibold text-neutral-900">{t.deadline}</p>
              </div>
              <div>
                <span className="text-neutral-500">Format:</span>
                <p className="font-semibold text-neutral-900">{t.format}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
