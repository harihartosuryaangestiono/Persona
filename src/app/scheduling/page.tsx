'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Calendar as CalendarIcon, ListTodo, Filter, ExternalLink } from 'lucide-react';

export default function SchedulingPage() {
  const { tasks, clients, updateTaskStatus } = useData();
  const { currentWorkspace } = useWorkspace();

  const [selectedClientId, setSelectedClientId] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // Default July 2026

  // Workspace restriction
  const workspaceTasks = tasks.filter((t) => !t.isArchived && (!t.workspaceId || t.workspaceId === currentWorkspace.id));

  // Client filtering
  const filteredTasks = workspaceTasks.filter(
    (t) => selectedClientId === 'ALL' || t.clientId === selectedClientId
  );

  // Queue List tasks (status is Scheduling or Ready to Post)
  const schedulingQueue = filteredTasks.filter((t) => t.status === 'Scheduling' || t.status === 'Ready to Post');

  // Calendar dates math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const formatDayString = (dayNum: number) => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Social Media Scheduling Dashboard
            <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">
              {currentWorkspace.name}
            </span>
          </h1>
          <p className="text-xs text-neutral-500">
            Publish approved contents to platforms. 1 Post = 5 Pts in employee scores.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'list' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" /> Queue List ({schedulingQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'calendar' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Scheduling Calendar
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs font-medium shadow-xs">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-neutral-400" />
          <span className="text-neutral-500 font-bold">Client Filter:</span>
        </div>

        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-neutral-800 focus:outline-hidden"
        >
          <option value="ALL">All Clients ({clients.filter(c => c.workspaceId === currentWorkspace.id).length})</option>
          {clients
            .filter((c) => c.workspaceId === currentWorkspace.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      {/* Main Content Area */}
      {activeTab === 'list' ? (
        /* QUEUE LIST TABLE VIEW */
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
                  <td className="px-4 py-3.5 font-semibold text-neutral-800">
                    <span
                      className="px-2 py-0.5 rounded text-[10px]"
                      style={{ backgroundColor: `${t.clientColor}15`, color: t.clientColor }}
                    >
                      {t.clientName}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-neutral-900 font-semibold">{t.postingDate || t.deadline}</td>
                  <td className="px-4 py-3.5 font-mono text-neutral-700 font-semibold">{t.format}</td>
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-neutral-900">{t.score} pts</td>
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
      ) : (
        /* SCHEDULING CALENDAR VIEW */
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <h2 className="text-base font-bold text-neutral-900">{monthName}</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="px-2 py-1 rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition text-xs font-bold"
              >
                Previous
              </button>
              <button
                onClick={handleNextMonth}
                className="px-2 py-1 rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition text-xs font-bold"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="font-semibold text-neutral-400 py-1.5 uppercase tracking-wider">
                {day}
              </div>
            ))}

            {/* Empty padding */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[80px] p-2 rounded-xl bg-neutral-50/50 border border-neutral-100 opacity-40" />
            ))}

            {/* Days list */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
              const dateStr = formatDayString(dayNum);
              // Show only tasks in Scheduling status
              const dayTasks = filteredTasks.filter(
                (t) => (t.postingDate === dateStr || t.deadline === dateStr) && t.status === 'Scheduling'
              );

              return (
                <div key={dayNum} className="min-h-[85px] p-2 rounded-xl border border-neutral-200 bg-white text-left space-y-1">
                  <span className="text-xs font-mono font-bold text-neutral-700">{dayNum}</span>
                  <div className="space-y-1 overflow-y-auto max-h-[55px]">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-1 rounded text-[9px] font-bold truncate bg-indigo-50 border border-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-100 transition flex items-center justify-between"
                        onClick={() => {
                          if (confirm(`Mark "${t.title}" as posted?`)) {
                            updateTaskStatus(t.id, 'Posted');
                          }
                        }}
                        title="Click to mark as posted"
                      >
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
