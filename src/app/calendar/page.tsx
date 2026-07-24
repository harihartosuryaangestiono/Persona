'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ExternalLink,
  Calendar as CalendarIcon,
  Video,
  Clock,
  User
} from 'lucide-react';
import { TaskItem } from '@/lib/types';

export default function CalendarPage() {
  const { tasks, clients } = useData();
  const { currentUser, allUsers } = useUser();
  const { currentWorkspace } = useWorkspace();

  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Timeline'>('Month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // Default July 2026
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Filters State
  const [selectedClientId, setSelectedClientId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPIC, setSelectedPIC] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedFormat, setSelectedFormat] = useState('ALL');

  // Role-based filtering (Requirement 16)
  const isExecutive = currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner');

  const workspaceTasks = tasks.filter((t) => {
    // 1. Must belong to the current workspace
    if (t.workspaceId !== currentWorkspace.id) return false;

    // 2. Role-based view restrictions (Requirement 16)
    if (!isExecutive && currentUser) {
      const userRoles = currentUser.roles;
      // Strategist sees Strategic category
      if (userRoles.includes('Strategist') && t.category === 'Strategic') return true;
      // Editor sees Editor category
      if (userRoles.includes('Editor') && t.category === 'Editor') return true;
      // Scheduler sees Scheduler category
      if (userRoles.includes('Scheduler') && t.category === 'Scheduler') return true;
      // PA sees Assistant / Production Assistant
      if (userRoles.includes('Production Assistant') && t.category === 'Assistant') return true;

      // If user has roles but this task category doesn't match any of their roles, hide it
      return false;
    }

    return true;
  });

  // Apply filters on top of workspaceTasks
  const filteredTasks = workspaceTasks.filter((t) => {
    if (selectedClientId !== 'ALL' && t.clientId !== selectedClientId) return false;
    if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;
    if (selectedFormat !== 'ALL' && t.format !== selectedFormat) return false;

    if (selectedPIC !== 'ALL') {
      const assignedIds = typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : t.assignedUserIds;
      if (!assignedIds.includes(selectedPIC)) return false;
    }

    if (selectedRole !== 'ALL' && t.category !== selectedRole) return false;

    return true;
  });

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
  const month = currentDate.getMonth(); 
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Grid calculation
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const formatDayString = (dayNum: number) => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  // Status Badge Colors (Requirement 15)
  const getStatusColorClass = (status: string, isToday: boolean) => {
    if (isToday) return 'bg-white/20 text-white';

    switch (status) {
      case 'Brief':
      case 'Draft':
      case 'Content Proposal':
      case 'Script':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Editing':
      case 'Revision':
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Approval':
      case 'Waiting Approval':
      case 'Waiting for Approval':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Completed':
      case 'Approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Ready To Post':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Scheduling':
      case 'Scheduled':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Posted':
        return 'bg-neutral-200 text-neutral-800 border-neutral-300';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  // Unique formats inside tasks for filtering
  const uniqueFormats = Array.from(new Set(tasks.map((t) => t.format).filter(Boolean)));

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Editorial Calendar <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">{currentWorkspace.name}</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Interactive scheduling grid. Events are filtered based on your operational roles.
          </p>
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

      {/* Advanced Filters */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs font-medium shadow-xs">
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-500">Filters:</span>
        </div>

        {/* Client */}
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden"
        >
          <option value="ALL">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden"
        >
          <option value="ALL">All Statuses</option>
          <option value="Brief">Brief</option>
          <option value="Script">Script</option>
          <option value="Production">Production</option>
          <option value="Editing">Editing</option>
          <option value="Revision">Revision</option>
          <option value="Approval">Approval</option>
          <option value="Ready To Post">Ready To Post</option>
          <option value="Scheduling">Scheduling</option>
          <option value="Posted">Posted</option>
        </select>

        {/* PIC */}
        <select
          value={selectedPIC}
          onChange={(e) => setSelectedPIC(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden"
        >
          <option value="ALL">All PICs</option>
          {allUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Role */}
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden"
        >
          <option value="ALL">All Roles</option>
          <option value="Strategic">Strategic</option>
          <option value="Editor">Editor</option>
          <option value="Assistant">Production Assistant</option>
          <option value="Scheduler">Scheduler</option>
        </select>

        {/* Format */}
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden"
        >
          <option value="ALL">All Formats</option>
          {uniqueFormats.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {(selectedClientId !== 'ALL' || selectedStatus !== 'ALL' || selectedPIC !== 'ALL' || selectedRole !== 'ALL' || selectedFormat !== 'ALL') && (
          <button
            onClick={() => {
              setSelectedClientId('ALL');
              setSelectedStatus('ALL');
              setSelectedPIC('ALL');
              setSelectedRole('ALL');
              setSelectedFormat('ALL');
            }}
            className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-0.5 ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Grid Container */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 space-y-4 shadow-xs">
        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-neutral-100 pb-4 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-neutral-900 min-w-[160px]">{monthName}</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-850 font-bold text-xs transition"
              >
                Current Cycle
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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

            {/* Empty cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[100px] p-2 rounded-xl bg-neutral-50/50 border border-neutral-100 opacity-40" />
            ))}

            {/* Actual Days */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
              const dateStr = formatDayString(dayNum);
              const dayTasks = filteredTasks.filter(
                (t) => t.postingDate === dateStr || t.deadline === dateStr
              );

              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={dayNum}
                  className={`min-h-[110px] p-2 rounded-xl border text-left space-y-1.5 transition flex flex-col justify-between ${
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
                      <span className={`text-[9px] font-mono font-bold ${isToday ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        {dayTasks.length} task(s)
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[75px] flex-1">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className={`p-1.5 rounded text-[9px] font-bold truncate shadow-2xs cursor-pointer transition flex items-center justify-between gap-1 ${getStatusColorClass(
                          t.status,
                          isToday
                        )}`}
                      >
                        <span className="truncate">{t.title}</span>
                        <span className="font-mono opacity-80">{t.score}p</span>
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
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5 text-xs font-bold text-neutral-700">
                      <span>Day {dayNum}</span>
                      <span className="text-[9px] font-mono text-neutral-400 font-normal">{dateStr.substring(5)}</span>
                    </div>

                    <div className="space-y-1.5">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className={`p-2 rounded-lg text-[10px] font-bold cursor-pointer shadow-2xs ${getStatusColorClass(
                            t.status,
                            false
                          )}`}
                        >
                          <p className="truncate">{t.title}</p>
                          <p className="text-[9px] font-medium opacity-80 mt-0.5">{t.status} • {t.score} pts</p>
                        </div>
                      ))}
                      {dayTasks.length === 0 && <p className="text-[10px] text-neutral-400 italic">No posts</p>}
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
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs hover:shadow-2xs cursor-pointer transition ${getStatusColorClass(
                    t.status,
                    false
                  )}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-8 rounded-full"
                      style={{ backgroundColor: t.clientColor || '#3B82F6' }}
                    />
                    <div>
                      <p className="font-bold text-neutral-900">{t.title}</p>
                      <p className="text-[11px] font-semibold opacity-75">{t.clientName} • Stage: {t.status}</p>
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold">
                    <p className="text-neutral-900">{t.postingDate || t.deadline}</p>
                    <p className="text-[10px] opacity-75">{t.score} points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
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
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-mono font-bold text-neutral-600">
              <div>
                <span className="text-neutral-400 text-[10px] block">Posting Date:</span>
                <span className="text-neutral-900">{selectedTask.postingDate || 'N/A'}</span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">Deadline (-3d):</span>
                <span className="text-amber-800">{selectedTask.deadline}</span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">Format:</span>
                <span className="text-neutral-900">{selectedTask.format}</span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">Points:</span>
                <span className="text-emerald-800">{selectedTask.score} pts</span>
              </div>
            </div>

            {selectedTask.driveLink && (
              <a
                href={selectedTask.driveLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-neutral-900 font-bold hover:underline bg-neutral-50 p-2.5 rounded-xl border border-neutral-200"
              >
                <ExternalLink className="w-4 h-4" /> Open Drive Folder
              </a>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedTask(null)}
                className="bg-neutral-900 text-white font-semibold text-xs px-4 py-2 rounded-lg"
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
