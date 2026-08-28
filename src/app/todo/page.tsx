'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useUser } from '@/context/UserContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Search, ExternalLink, Plus, Filter, X } from 'lucide-react';
import { calculateAutoDeadline } from '@/lib/score-calculator';
import { isStrategicPipeline, STRATEGIC_STATUS_OPTIONS, PRODUCTION_STATUS_OPTIONS } from '@/lib/status';

function formatUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function formatDateForInput(d?: string | null): string {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dateObj = new Date(d);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }
  return '';
}

export default function ToDoPage() {
  const { tasks, clients, updateTask, addTask } = useData();
  const { allUsers } = useUser();
  const { currentWorkspace } = useWorkspace();

  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'Editor' | 'Scheduler' | 'Assistant' | 'Strategic'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState(clients[0]?.id || '');
  const [newPicName, setNewPicName] = useState('Jabin');
  const [newPostingDate, setNewPostingDate] = useState('2026-07-28');
  const [newCategory, setNewCategory] = useState<'Editor' | 'Strategic' | 'Assistant' | 'Scheduler'>('Editor');
  const [newTaskType, setNewTaskType] = useState('Editing');
  const [newFormat, setNewFormat] = useState('Carousel');
  const [newStatus, setNewStatus] = useState<'Brief' | 'Editing' | 'Waiting for Approval' | 'Scheduling' | 'Posted'>('Waiting for Approval');
  const [newPreviewLink, setNewPreviewLink] = useState('');
  const [newQty, setNewQty] = useState(1);

  const userMap = useMemo(() => new Map(allUsers.map((u) => [u.id, u.name])), [allUsers]);

  const allRows = useMemo(() => {
    const rows: any[] = [];
    tasks.forEach((t) => {
      const stages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : null;
      const assignedIds = typeof t.assignedUserIds === 'string'
        ? JSON.parse(t.assignedUserIds)
        : (t.assignedUserIds || []);

      if (Array.isArray(stages) && stages.length > 1) {
        stages.forEach((s: any, idx: number) => {
          const isSched = s.role === 'Scheduler' || s.taskType === 'Scheduling' || (s.userName && s.userName.toLowerCase().includes('dinda'));
          const isAssis = s.role === 'Production Assistant' || s.taskType === 'Production Assistant';
          const isStrat = s.role === 'Strategist' || isStrategicPipeline(undefined, s.taskType);

          const cat: 'Editor' | 'Scheduler' | 'Assistant' | 'Strategic' = isSched
            ? 'Scheduler'
            : isAssis
            ? 'Assistant'
            : isStrat
            ? 'Strategic'
            : 'Editor';

          const taskType = s.taskType || (cat === 'Scheduler' ? 'Scheduling' : 'Editing');
          const format = cat === 'Scheduler' ? 'Per Post' : (s.format || t.format || 'Story Video');
          const pic = s.userName || userMap.get(s.userId) || s.userId || (assignedIds[idx] ? userMap.get(assignedIds[idx]) : 'Jabin');

          let rowStatus = t.status;
          if (cat === 'Scheduler') {
            rowStatus = (t.status === 'Posted' || t.status === 'Completed' || t.status === 'Scheduling')
              ? (t.status === 'Completed' ? 'Posted' : t.status)
              : 'Scheduling';
          } else {
            if (t.status === 'Posted' || t.status === 'Completed') {
              rowStatus = 'Completed';
            }
          }

          let score = Number(s.score);
          if (isNaN(score) || score <= 0) {
            score = cat === 'Scheduler' ? 5 * (s.qty || t.qty || 1) : (t.score || 10);
          }

          rows.push({
            rowId: `${t.id}-stage-${idx}`,
            originalTaskId: t.id,
            clientId: t.clientId,
            postingDate: t.postingDate,
            deadline: t.deadline,
            month: t.month,
            year: t.year,
            title: t.title,
            picName: pic,
            category: cat,
            taskType: taskType,
            format: format,
            status: rowStatus,
            score: score,
            qty: s.qty || t.qty || 1,
            previewLink: t.previewLink,
            driveLink: t.driveLink,
            originalTask: t,
          });
        });
      } else {
        const isSched = t.taskType === 'Scheduling' || t.category === 'Scheduler';
        const isAssis = t.taskType === 'Production Assistant' || t.category === 'Assistant';
        const isStrat = isStrategicPipeline(t.category, t.taskType);

        const cat: 'Editor' | 'Scheduler' | 'Assistant' | 'Strategic' = isSched
          ? 'Scheduler'
          : isAssis
          ? 'Assistant'
          : isStrat
          ? 'Strategic'
          : (t.category === 'Scheduler' ? 'Scheduler' : t.category === 'Assistant' ? 'Assistant' : t.category === 'Strategic' ? 'Strategic' : 'Editor');

        const firstPicId = assignedIds[0];
        const picName = firstPicId ? (userMap.get(firstPicId) || firstPicId) : 'Jabin';

        rows.push({
          rowId: t.id,
          originalTaskId: t.id,
          clientId: t.clientId,
          postingDate: t.postingDate,
          deadline: t.deadline,
          month: t.month,
          year: t.year,
          title: t.title,
          picName: picName,
          category: cat,
          taskType: t.taskType || (cat === 'Scheduler' ? 'Scheduling' : 'Editing'),
          format: cat === 'Scheduler' ? 'Per Post' : t.format,
          status: t.status,
          score: cat === 'Scheduler' ? (t.score === 25 || t.score === 30 || t.score === 33 || t.score === 150 ? 5 * (t.qty || 1) : t.score) : t.score,
          qty: t.qty || 1,
          previewLink: t.previewLink,
          driveLink: t.driveLink,
          originalTask: t,
        });
      }
    });
    return rows;
  }, [tasks, userMap]);

  const displayedRows = useMemo(() => {
    return allRows.filter((r) => {
      const matchesClient = selectedClientId === 'ALL' || r.clientId === selectedClientId;
      const matchesCategory = selectedCategoryFilter === 'ALL' || r.category === selectedCategoryFilter;
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.picName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.taskType.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesClient && matchesCategory && matchesSearch;
    });
  }, [allRows, selectedClientId, selectedCategoryFilter, searchQuery]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const deadline = calculateAutoDeadline(newPostingDate, -3);
    const assignedUser = allUsers.find((u) => u.name.toLowerCase() === newPicName.toLowerCase()) || allUsers[0];

    addTask({
      clientId: newClientId || clients[0]?.id || 'c-1',
      workspaceId: currentWorkspace?.id || 'ws-team-anggi',
      title: newTitle.trim(),
      category: newCategory,
      taskType: newTaskType,
      format: newFormat,
      qty: Number(newQty) || 1,
      postingDate: newPostingDate,
      deadline: deadline,
      status: newStatus,
      assignedUserIds: [assignedUser.id],
      previewLink: newPreviewLink ? formatUrl(newPreviewLink) : '',
      score: newFormat === 'Reels' || newFormat === 'Carousel' ? 150 : 10,
      cogs: (newFormat === 'Reels' || newFormat === 'Carousel' ? 150 : 10) * 250,
    });

    setNewTitle('');
    setNewPreviewLink('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900 pb-36">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Client To Do List <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2.5 py-0.5 rounded-full border border-neutral-200">{tasks.length} Total Client Tasks</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Per-client operational content board with auto-calculated deadline (<span className="font-mono text-neutral-700">Posting Date - 3 days</span>).
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> Add Client Task
        </button>
      </div>

      {/* Client & Category Selector Controls */}
      <div className="space-y-3 p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 overflow-x-auto text-xs">
          <span className="text-neutral-500 font-medium shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <button
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('Editor')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              selectedCategoryFilter === 'Editor'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Editing Tasks (25-150 pts)
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('Scheduler')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              selectedCategoryFilter === 'Scheduler'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Scheduling Tasks (5 pts)
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('Assistant')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              selectedCategoryFilter === 'Assistant'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Production Tasks
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('Strategic')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              selectedCategoryFilter === 'Strategic'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Strategic Tasks
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Client Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedClientId('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedClientId === 'ALL'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Clients ({tasks.length})
            </button>
            {clients.map((c) => {
              const clientTaskCount = tasks.filter((t) => t.clientId === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                    selectedClientId === c.id
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.clientColor }} />
                  {c.name} ({clientTaskCount})
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search title, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent focus:outline-none placeholder-neutral-400 w-48"
            />
          </div>
        </div>
      </div>

      {/* Tabular To Do List Board */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 whitespace-nowrap">
              <tr>
                <th className="px-4 py-3 text-center w-12">No</th>
                <th className="px-4 py-3">Tanggal Posting</th>
                <th className="px-4 py-3">PIC</th>
                <th className="px-4 py-3">Deadline (-3d)</th>
                <th className="px-4 py-3">Content Title</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Tipe Task</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 font-bold text-center">Score</th>
                <th className="px-4 py-3 text-center">Preview Link</th>
                <th className="px-4 py-3 text-center">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {displayedRows.map((r, idx) => {
                return (
                  <tr key={r.rowId} className="hover:bg-neutral-50/80 transition">
                    <td className="px-4 py-3 text-center font-mono text-neutral-400">{idx + 1}</td>

                    {/* Tanggal Posting Editable */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap">
                      <input
                        type="date"
                        value={formatDateForInput(r.postingDate)}
                        onChange={(e) => {
                          const newPosting = e.target.value;
                          if (!newPosting) return;
                          const newDL = calculateAutoDeadline(newPosting, -3);
                          const dateObj = new Date(newPosting);
                          const monthNames = [
                            'January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'
                          ];
                          const newMonth = !isNaN(dateObj.getTime()) ? monthNames[dateObj.getMonth()] : r.month;
                          const newYear = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : r.year;

                          updateTask(r.originalTaskId, {
                            postingDate: newPosting,
                            deadline: newDL,
                            month: newMonth,
                            year: newYear
                          });
                        }}
                        className="bg-white border border-neutral-200 rounded px-2 py-1 text-neutral-900 focus:outline-hidden font-mono text-xs cursor-pointer"
                      />
                    </td>

                    {/* PIC Avatar / Name */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-1 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200 text-neutral-800 text-[11px] font-semibold">
                          <div className="w-3.5 h-3.5 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[8px]">
                            {r.picName.charAt(0).toUpperCase()}
                          </div>
                          <span>{r.picName}</span>
                        </div>
                      </div>
                    </td>

                    {/* Deadline Auto (-3d) */}
                    <td className="px-4 py-3 font-mono text-neutral-900 font-semibold whitespace-nowrap">
                      {r.deadline}
                    </td>

                    {/* Content Title */}
                    <td className="px-4 py-3 font-medium text-neutral-900 max-w-xs truncate" title={r.title}>
                      {r.title}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-800">
                      {r.category}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600">{r.taskType}</td>

                    <td className="px-4 py-3 font-mono text-neutral-700 whitespace-nowrap font-medium">
                      {r.format}
                    </td>

                    {/* Status Badge Select */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={r.status}
                        onChange={(e) => updateTask(r.originalTaskId, { status: e.target.value as any })}
                        className={`bg-white border border-neutral-200 rounded px-2.5 py-1 text-[11px] font-semibold focus:outline-hidden ${
                          r.status === 'Posted' || r.status === 'Completed'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : r.status === 'Waiting for Approval' || r.status === 'Approval'
                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : (r.status as any) === 'Ready to Post' || (r.status as any) === 'Ready To Post'
                            ? 'text-blue-700 bg-blue-50 border-blue-200'
                            : r.status === 'Brief'
                            ? 'text-neutral-500 bg-neutral-50'
                            : 'text-neutral-800'
                        }`}
                      >
                        {(r.category === 'Strategic'
                          ? STRATEGIC_STATUS_OPTIONS
                          : PRODUCTION_STATUS_OPTIONS
                        ).map((st) => (
                          <option key={st} value={st}>
                            {st === 'Editing' ? 'In Progress / Editing' : st}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Score (Pts) */}
                    <td className="px-4 py-3 text-center font-mono font-bold text-neutral-900 whitespace-nowrap">
                      {r.score} pts
                    </td>

                    {/* Preview Link */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {r.previewLink || r.driveLink ? (
                        <a
                          href={r.previewLink || r.driveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex p-1 rounded hover:bg-neutral-100 text-neutral-800 transition"
                          title="Open Preview Link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center font-mono font-semibold">{r.qty}</td>
                  </tr>
                );
              })}

              {displayedRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-400 italic">
                    No tasks found matching current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Task */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleCreateTask}
            className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-neutral-700" /> Add New Client To Do Task
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Client</label>
                <select
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Content Title</label>
                <input
                  type="text"
                  placeholder="e.g. Foto Blossom Cake Special Promo..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">PIC (Team Member)</label>
                  <select
                    value={newPicName}
                    onChange={(e) => setNewPicName(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.roles.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Posting Date</label>
                  <input
                    type="date"
                    value={newPostingDate}
                    onChange={(e) => setNewPostingDate(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Kategori</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                  >
                    <option value="Editor">Editor</option>
                    <option value="Strategic">Strategic</option>
                    <option value="Assistant">Assistant</option>
                    <option value="Scheduler">Scheduler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Tipe Task</label>
                  <input
                    type="text"
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                  >
                    <option value="Single Foto">Single Foto</option>
                    <option value="Carousel">Carousel</option>
                    <option value="Reels">Reels</option>
                    <option value="Story Video">Story Video</option>
                    <option value="Grafis">Grafis</option>
                    <option value="Paket Static">Paket Static</option>
                    <option value="Production Lead">Production Lead</option>
                    <option value="Content Plan">Content Plan</option>
                    <option value="Per Post">Per Post</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                  >
                    {(isStrategicPipeline(newCategory, newTaskType)
                      ? STRATEGIC_STATUS_OPTIONS
                      : PRODUCTION_STATUS_OPTIONS
                    ).map((st) => (
                      <option key={st} value={st}>
                        {st === 'Editing' ? 'In Progress / Editing' : st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Preview / Drive Link</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={newPreviewLink}
                  onChange={(e) => setNewPreviewLink(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs"
              >
                Save Task to Database
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
