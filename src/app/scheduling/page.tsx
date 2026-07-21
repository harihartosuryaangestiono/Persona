'use client';

import React from 'react';
import { useData } from '@/context/DataContext';

export default function SchedulingPage() {
  const { tasks, updateTaskStatus } = useData();

  const schedulingQueue = tasks.filter((t) => t.status === 'Scheduling');

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Social Media Scheduling Dashboard <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Per Post = 5 Pts</span>
          </h1>
          <p className="text-xs text-neutral-500">Queue & schedule approved assets across Meta Business Suite & TikTok.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3.5">Content Title</th>
              <th className="px-4 py-3.5">Client</th>
              <th className="px-4 py-3.5">Posting Date</th>
              <th className="px-4 py-3.5">Format</th>
              <th className="px-4 py-3.5 text-center">Score</th>
              <th className="px-4 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-700">
            {schedulingQueue.map((t) => (
              <tr key={t.id} className="hover:bg-neutral-50 transition">
                <td className="px-4 py-3.5 font-bold text-neutral-900">{t.title}</td>
                <td className="px-4 py-3.5">{t.clientName}</td>
                <td className="px-4 py-3.5 font-mono text-neutral-900">{t.postingDate || t.deadline}</td>
                <td className="px-4 py-3.5 font-mono text-neutral-700">{t.format}</td>
                <td className="px-4 py-3.5 text-center font-mono font-bold text-emerald-800">{t.score} pts</td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={() => updateTaskStatus(t.id, 'Posted')}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition"
                  >
                    Mark as Posted
                  </button>
                </td>
              </tr>
            ))}

            {schedulingQueue.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400 italic">
                  No items currently queued for scheduling.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
