'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import {
  Archive,
  Search,
  RefreshCw,
  FolderOpen,
  Video,
  ExternalLink,
  ChevronRight,
  History,
  Calendar,
  X
} from 'lucide-react';
import { TaskItem } from '@/lib/types';
import { calculatePriority, getPriorityColorClass } from '@/lib/score-calculator';

export default function ArchivePage() {
  const { tasks, clients, updateTask } = useData();
  const { currentUser } = useUser();
  const { currentWorkspace } = useWorkspace();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskItem | null>(null);

  // Filter archived tasks for this workspace
  const archivedTasks = tasks.filter((t) => {
    return t.isArchived === true && t.workspaceId === currentWorkspace.id;
  });

  const filteredTasks = archivedTasks.filter((t) => {
    if (selectedClientId !== 'ALL' && t.clientId !== selectedClientId) return false;
    if (selectedMonth !== 'ALL' && t.month !== selectedMonth) return false;

    // Apply Date Range Filter (based on postingDate or deadline)
    const taskDateStr = t.postingDate || t.deadline;
    if (taskDateStr) {
      const taskTime = new Date(taskDateStr).getTime();
      if (startDate !== '') {
        const startTime = new Date(startDate).getTime();
        if (isNaN(taskTime) || taskTime < startTime) return false;
      }
      if (endDate !== '') {
        const endTime = new Date(endDate + 'T23:59:59.999Z').getTime();
        if (isNaN(taskTime) || taskTime > endTime) return false;
      }
    } else if (startDate !== '' || endDate !== '') {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchClient = t.clientName?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchClient) return false;
    }

    return true;
  });

  const handleRestore = (taskId: string) => {
    updateTask(taskId, { isArchived: false } as any);
    showToast('Task successfully restored to active board!', 'success');
    if (selectedTaskDetail?.id === taskId) {
      setSelectedTaskDetail(null);
    }
  };

  return (
    <div className="space-y-6 text-neutral-900 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
          <Archive className="w-5 h-5 text-neutral-500" /> Archived Tasks
        </h1>
        <p className="text-xs text-neutral-500">
          Historical repository. Finished tasks (Done/Posted) are auto-archived once their reporting month/year cycle ends.
        </p>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs font-medium shadow-xs">
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search archived content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-full bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-hidden text-[11px]"
          />
        </div>

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

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:outline-hidden font-bold"
        >
          <option value="ALL">All Months</option>
          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* Start Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-500">Start Date:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-neutral-800 focus:outline-hidden font-mono"
          />
        </div>

        {/* End Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-500">End Date:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-neutral-800 focus:outline-hidden font-mono"
          />
        </div>

        {(selectedClientId !== 'ALL' || selectedMonth !== 'ALL' || startDate !== '' || endDate !== '') && (
          <button
            onClick={() => {
              setSelectedClientId('ALL');
              setSelectedMonth('ALL');
              setStartDate('');
              setEndDate('');
            }}
            className="text-red-500 hover:text-red-700 font-semibold"
          >
            Clear
          </button>
        )}

        <span className="text-[10px] text-neutral-450 font-mono ml-auto">
          {filteredTasks.length} archived tasks found
        </span>
      </div>

      {/* Archive Grid/Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
        {filteredTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 whitespace-nowrap">
                <tr>
                  <th className="px-4 py-3.5">Content Title</th>
                  <th className="px-4 py-3.5">Client</th>
                  <th className="px-4 py-3.5">Period</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5 text-center">Score</th>
                  <th className="px-4 py-3.5 text-center font-mono">Priority</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {filteredTasks.map((t) => {
                  const dynamicPriority = calculatePriority(t.deadline);
                  const priorityColorClass = getPriorityColorClass(dynamicPriority);

                  return (
                    <tr key={t.id} className="hover:bg-neutral-50 transition">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-neutral-900">{t.title}</span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold">{t.clientName}</td>
                      <td className="px-4 py-3.5 font-semibold text-neutral-600">
                        {t.month} {t.year}
                      </td>
                      <td className="px-4 py-3.5 font-semibold">
                        <span className="bg-neutral-100 border text-neutral-600 px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold">{t.score}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${priorityColorClass}`}>
                          {dynamicPriority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedTaskDetail(t)}
                          className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-3 py-1.5 rounded-lg transition text-[10px] flex items-center gap-1"
                        >
                          <History className="w-3 h-3" /> View History
                        </button>
                        <button
                          onClick={() => handleRestore(t.id)}
                          className="border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold px-3 py-1.5 rounded-lg transition text-[10px] flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Restore
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-neutral-400 space-y-2">
            <Archive className="w-8 h-8 text-neutral-350 mx-auto" />
            <h3 className="text-sm font-bold text-neutral-700">No Archived Tasks</h3>
            <p className="text-xs text-neutral-500">Tasks in active pipelines will be moved here after their reporting cycle completes.</p>
          </div>
        )}
      </div>

      {/* Task History Modal */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded border"
                  style={{ backgroundColor: `${selectedTaskDetail.clientColor}15`, color: selectedTaskDetail.clientColor }}
                >
                  {selectedTaskDetail.clientName}
                </span>
                <h3 className="text-base font-bold text-neutral-900 mt-2">
                  {selectedTaskDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            {/* Grid properties */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5 font-bold uppercase text-[9px]">Deadline</span>
                <strong className="text-neutral-800 font-mono">{selectedTaskDetail.deadline}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5 font-bold uppercase text-[9px]">Posting Date</span>
                <strong className="text-neutral-800 font-mono">{selectedTaskDetail.postingDate || '-'}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5 font-bold uppercase text-[9px]">Reporting Period</span>
                <strong className="text-neutral-800 font-mono">{selectedTaskDetail.month} {selectedTaskDetail.year}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5 font-bold uppercase text-[9px]">Last Stage Status</span>
                <strong className="text-neutral-850 uppercase font-mono">{selectedTaskDetail.status}</strong>
              </div>
            </div>

            {/* Stages / History timeline */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-neutral-800 flex items-center gap-1">
                <History className="w-3.5 h-3.5" /> Stage Allocations History
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedTaskDetail.stages ? (
                  (typeof selectedTaskDetail.stages === 'string' ? JSON.parse(selectedTaskDetail.stages) : selectedTaskDetail.stages).map((s: any) => (
                    <div key={s.id} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white font-bold flex items-center justify-center">
                          {s.userName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">{s.userName}</p>
                          <p className="text-[10px] text-neutral-500">{s.role} • <span className="text-neutral-600 font-mono">{s.taskType} ({s.format})</span></p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-neutral-850 bg-white border border-neutral-200 px-2.5 py-1 rounded-lg">
                        {s.score} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-400 italic">No allocation history available.</p>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-neutral-550 font-semibold block">Asset Drive Link</span>
                {selectedTaskDetail.driveLink ? (
                  <a
                    href={selectedTaskDetail.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 font-semibold hover:bg-blue-100 transition"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" /> Open Drive Assets
                    </span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 border-dashed rounded-xl text-neutral-400 text-center">
                    No Drive Link Added
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-neutral-550 font-semibold block">Preview Link</span>
                {selectedTaskDetail.previewLink ? (
                  <a
                    href={selectedTaskDetail.previewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-semibold hover:bg-emerald-100 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Video className="w-4 h-4" /> Preview Link
                    </span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 border-dashed rounded-xl text-neutral-400 text-center">
                    No Preview Link Added
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
              <button
                onClick={() => handleRestore(selectedTaskDetail.id)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Restore Task
              </button>
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs px-4 py-2 rounded-lg"
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
