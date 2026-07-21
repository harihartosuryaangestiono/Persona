'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ExternalLink,
} from 'lucide-react';
import { TaskItem } from '@/lib/types';

export default function CalendarPage() {
  const { tasks, clients } = useData();
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Timeline'>('Month');
  const [selectedClientId, setSelectedClientId] = useState('ALL');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // Default July 2026
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const filteredTasks = tasks.filter(
    (t) => selectedClientId === 'ALL' || t.clientId === selectedClientId
  );

  // Month navigation logic
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 6, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed (6 = July)
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Grid calculation
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Format month and day to YYYY-MM-DD
  const formatDayString = (dayNum: number) => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Editorial Calendar <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Notion Calendar Style</span>
          </h1>
          <p className="text-xs text-neutral-500">Content schedule color-coded by client & assigned PIC.</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-white border border-neutral-200 p-1.5 rounded-xl shadow-xs">
          {(['Month', 'Week', 'Timeline'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === mode ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {mode} View
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 space-y-4 shadow-xs">
        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-neutral-100 pb-4 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-neutral-900 min-w-[160px]">{monthName}</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800 font-semibold text-xs transition"
              >
                Current Cycle
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 font-semibold focus:outline-none"
            >
              <option value="ALL">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Month View */}
        {viewMode === 'Month' && (
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="font-semibold text-neutral-400 py-2 uppercase tracking-wider">
                {day}
              </div>
            ))}

            {/* Empty padding cells before 1st day of month */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[100px] p-2 rounded-xl bg-neutral-50/50 border border-neutral-100 opacity-40" />
            ))}

            {/* Actual Days in Month */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
              const dateStr = formatDayString(dayNum);
              const dayTasks = filteredTasks.filter(
                (t) => t.postingDate === dateStr || t.deadline === dateStr
              );

              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={dayNum}
                  className={`min-h-[110px] p-2 rounded-xl border text-left space-y-1.5 transition ${
                    isToday
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                      : 'bg-white border-neutral-200/80 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold ${isToday ? 'text-white' : 'text-neutral-800'}`}>
                      {dayNum}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className={`text-[10px] font-mono ${isToday ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        {dayTasks.length} posts
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className={`p-1.5 rounded text-[10px] font-semibold truncate shadow-xs cursor-pointer transition flex items-center justify-between gap-1 ${
                          isToday ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-900 border border-neutral-200'
                        }`}
                      >
                        <span className="truncate">{t.title}</span>
                        <span className="font-mono text-[9px] opacity-80">{t.score}p</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Week View */}
        {viewMode === 'Week' && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-neutral-500 font-medium">Schedule for active week cycle in {monthName}:</p>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {Array.from({ length: 7 }, (_, i) => i + 15).map((dayNum) => {
                const dateStr = formatDayString(dayNum);
                const dayTasks = filteredTasks.filter(
                  (t) => t.postingDate === dateStr || t.deadline === dateStr
                );

                return (
                  <div key={dayNum} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5 text-xs">
                      <span className="font-bold text-neutral-900">Day {dayNum}</span>
                      <span className="text-[10px] font-mono text-neutral-400">{dateStr}</span>
                    </div>

                    <div className="space-y-1.5">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="p-2 rounded-lg text-xs font-semibold bg-white border border-neutral-200 text-neutral-900 cursor-pointer shadow-xs"
                        >
                          <p className="truncate">{t.title}</p>
                          <p className="text-[10px] text-neutral-500">{t.status} • {t.score} pts</p>
                        </div>
                      ))}
                      {dayTasks.length === 0 && <p className="text-[11px] text-neutral-400 italic">No posts</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'Timeline' && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-neutral-500 font-medium">Linear timeline sequence for {monthName}:</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs hover:bg-neutral-100 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-8 rounded-full"
                      style={{ backgroundColor: t.clientColor || '#3B82F6' }}
                    />
                    <div>
                      <p className="font-bold text-neutral-900">{t.title}</p>
                      <p className="text-[11px] text-neutral-500">{t.clientName} • Stage: {t.status}</p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <p className="text-neutral-900 font-semibold">{t.postingDate || t.deadline}</p>
                    <p className="text-neutral-500 text-[10px]">{t.score} points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Detail Popover */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                  {selectedTask.clientName}
                </span>
                <h3 className="text-base font-bold text-neutral-900 mt-2">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-mono">
              <div>
                <span className="text-neutral-500">Posting Date:</span>
                <p className="text-neutral-900 font-bold">{selectedTask.postingDate || 'N/A'}</p>
              </div>
              <div>
                <span className="text-neutral-500">Deadline (-3d):</span>
                <p className="text-amber-800 font-bold">{selectedTask.deadline}</p>
              </div>
              <div>
                <span className="text-neutral-500">Format:</span>
                <p className="text-neutral-900 font-bold">{selectedTask.format}</p>
              </div>
              <div>
                <span className="text-neutral-500">Points:</span>
                <p className="text-emerald-800 font-bold">{selectedTask.score} pts</p>
              </div>
            </div>

            {selectedTask.driveLink && (
              <a
                href={selectedTask.driveLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-neutral-900 font-semibold hover:underline bg-neutral-50 p-2.5 rounded-xl border border-neutral-200"
              >
                <ExternalLink className="w-4 h-4" /> Open Drive Link
              </a>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedTask(null)}
                className="bg-neutral-900 text-white text-xs px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
