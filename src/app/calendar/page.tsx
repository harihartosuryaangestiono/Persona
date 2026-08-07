'use client';

import React, { useState, useEffect } from 'react';
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
  User,
  Edit,
  Save,
  CheckCircle2
} from 'lucide-react';
import { TaskItem } from '@/lib/types';
import { calculatePriority, getPriorityColorClass } from '@/lib/score-calculator';

import { useToast } from '@/context/ToastContext';

export default function CalendarPage() {
  const { tasks, clients, worklogs, updateTask } = useData();
  const { currentUser, allUsers } = useUser();
  const { currentWorkspace } = useWorkspace();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Timeline'>('Month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 1)); // Default August 2026
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editPostingDate, setEditPostingDate] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  // Filters State
  const [selectedClientId, setSelectedClientId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPIC, setSelectedPIC] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedFormat, setSelectedFormat] = useState('ALL');

  // Load persistent filters from localStorage (Requirement 11)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedClient = localStorage.getItem('calFilterClientId');
      const cachedStatus = localStorage.getItem('calFilterStatus');
      const cachedPIC = localStorage.getItem('calFilterPIC');
      const cachedRole = localStorage.getItem('calFilterRole');
      const cachedFormat = localStorage.getItem('calFilterFormat');
      const cachedViewMode = localStorage.getItem('calFilterViewMode');

      if (cachedClient) setSelectedClientId(cachedClient);
      if (cachedStatus) setSelectedStatus(cachedStatus);
      if (cachedPIC) setSelectedPIC(cachedPIC);
      if (cachedRole) setSelectedRole(cachedRole);
      if (cachedFormat) setSelectedFormat(cachedFormat);
      if (cachedViewMode) setViewMode(cachedViewMode as any);
    }
  }, []);

  // Save persistent filters to localStorage (Requirement 11)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calFilterClientId', selectedClientId);
      localStorage.setItem('calFilterStatus', selectedStatus);
      localStorage.setItem('calFilterPIC', selectedPIC);
      localStorage.setItem('calFilterRole', selectedRole);
      localStorage.setItem('calFilterFormat', selectedFormat);
      localStorage.setItem('calFilterViewMode', viewMode);
    }
  }, [selectedClientId, selectedStatus, selectedPIC, selectedRole, selectedFormat, viewMode]);

  // Combine Tasks & Worklogs to keep Editorial Calendar aligned (Requirement 1, 2)
  const loggedContentIds = new Set(worklogs.map((w) => w.contentId).filter(Boolean));
  const activeTasks = tasks.filter((t) => !t.isArchived && (!t.contentId || !loggedContentIds.has(t.contentId)));

  const worklogTasks = worklogs.map((w) => {
    const matchedClient = clients.find((c) => c.id === w.clientId);
    const stages = w.stages ? (typeof w.stages === 'string' ? JSON.parse(w.stages) : w.stages) : [];
    const assignedUserIds = Array.isArray(stages) ? stages.map((s: any) => s.userId).filter(Boolean) : [w.userId];
    
    return {
      id: w.id,
      workspaceId: matchedClient?.workspaceId || 'ws-team-anggi',
      campaignId: null,
      projectId: null,
      clientId: w.clientId,
      clientName: w.clientName || matchedClient?.name || 'Unknown Client',
      clientColor: matchedClient?.clientColor || '#3B82F6',
      title: w.contentTitle,
      description: 'Automatically synchronized task from manual worklog.',
      category: w.taskType === 'Content Plan' ? 'Strategic' : (w.taskType === 'Scheduling' ? 'Scheduling' : (w.taskType === 'Production Assistant' ? 'Production' : 'Editing')),
      taskType: w.taskType,
      format: w.format,
      qty: w.qty,
      priority: 'Low',
      postingDate: w.date ? w.date.substring(0, 10) : null,
      deadline: w.deadline ? w.deadline.substring(0, 10) : (w.date ? w.date.substring(0, 10) : null),
      status: w.status,
      assignedUserIds: assignedUserIds,
      files: null,
      driveLink: '',
      previewLink: w.previewLink || '',
      checklist: '[]',
      comments: '[]',
      stages: w.stages,
      month: w.month,
      year: w.year,
      score: w.score || 0,
      cogs: w.cogs || 0,
      contentId: w.contentId,
      isArchived: w.isArchived,
      createdAt: w.createdAt?.toString() || new Date().toISOString(),
      updatedAt: w.updatedAt?.toString() || new Date().toISOString(),
    };
  }) as any as TaskItem[];

  const combinedTasks = [...activeTasks, ...worklogTasks];

  // Role-based filtering
  const isExecutive = currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner');

  const workspaceTasks = combinedTasks.filter((t) => {
    // 1. Filter out archived tasks (Requirement 4)
    if (t.isArchived) return false;

    // 2. Workspace check (fallback to client workspace or allow if unassigned)
    if (t.workspaceId && t.workspaceId !== currentWorkspace.id) {
      const taskClient = clients.find((c) => c.id === t.clientId);
      if (taskClient && taskClient.workspaceId !== currentWorkspace.id && t.workspaceId !== taskClient.workspaceId) {
        return false;
      }
    }

    // 3. Tasks containing a Posting Date or Deadline must automatically appear (Requirement 1)
    if (t.postingDate || t.deadline) return true;

    // 4. Role-based view restrictions (Requirement 16)
    if (!isExecutive && currentUser) {
      const userRoles = currentUser.roles;
      if (userRoles.includes('Strategist') && t.category === 'Strategic') return true;
      if (userRoles.includes('Editor') && t.category === 'Editing') return true;
      if (userRoles.includes('Scheduler') && t.category === 'Scheduling') return true;
      if (userRoles.includes('Production Assistant') && (t.category === 'Production' || t.category === 'Assistant')) return true;

      const assignedIds = typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : (t.assignedUserIds || []);
      if (assignedIds.includes(currentUser.id) || assignedIds.includes(currentUser.name)) return true;

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
      const assignedIds = typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : (t.assignedUserIds || []);
      const userObj = allUsers.find((u) => u.id === selectedPIC);
      const isAssigned = assignedIds.includes(selectedPIC) || (userObj && assignedIds.includes(userObj.name));
      
      const logStages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
      const isStageAssignee = Array.isArray(logStages) && logStages.some((s: any) => s.userId === selectedPIC || (userObj && s.userName === userObj.name));

      if (!isAssigned && !isStageAssignee) return false;
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
    setCurrentDate(new Date(2026, 7, 1));
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

  // Set edit form values when selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      setEditTitle(selectedTask.title);
      setEditClientId(selectedTask.clientId);
      setEditPostingDate(selectedTask.postingDate ? selectedTask.postingDate.substring(0, 10) : '');
      setEditDeadline(selectedTask.deadline ? selectedTask.deadline.substring(0, 10) : '');
    } else {
      setIsEditing(false);
    }
  }, [selectedTask]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const targetClient = clients.find((c) => c.id === editClientId);
    
    updateTask(selectedTask.id, {
      title: editTitle,
      clientId: editClientId,
      clientName: targetClient?.name,
      clientColor: targetClient?.clientColor,
      postingDate: editPostingDate,
      deadline: editDeadline,
    });

    setIsEditing(false);
    setSelectedTask(null);
    showToast('Task synchronized and updated successfully!', 'success');
  };

  // Status Badge Colors
  const getStatusColorClass = (status: string, isToday: boolean) => {
    if (isToday) return 'bg-white/20 text-white';

    switch (status) {
      case 'Brief':
      case 'Draft':
      case 'Content Proposal':
      case 'Script':
      case 'Script & Shotlist':
        return 'bg-gray-150 text-gray-800 border-gray-205';
      case 'Production':
      case 'Shooting':
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
      case 'Ready to Post':
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
            Interactive scheduling grid. All Strategic tasks with a Posting Date appear automatically.
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
          <Filter className="w-3.5 h-3.5 text-neutral-450" />
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
          <option value="Content Proposal">Content Proposal</option>
          <option value="Script & Shotlist">Script & Shotlist</option>
          <option value="Editorial Calendar">Editorial Calendar</option>
          <option value="Ready for Production">Ready for Production</option>
          <option value="Production">Production</option>
          <option value="Editing">Editing</option>
          <option value="Revision">Revision</option>
          <option value="Waiting for Approval">Waiting for Approval</option>
          <option value="Ready to Post">Ready to Post</option>
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
          <option value="ALL">All Categories</option>
          <option value="Strategic">Strategic</option>
          <option value="Production">Production</option>
          <option value="Editing">Editing</option>
          <option value="Scheduling">Scheduling</option>
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
                        {dayTasks.length}
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
                    <p className="text-[10px] opacity-75">{(t.score ?? 0)} points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Detail & Edit Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                  {selectedTask.clientName}
                </span>
                <h3 className="text-base font-bold text-neutral-900 mt-2">
                  {isEditing ? 'Edit Calendar task' : selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs text-neutral-700">
                <div className="space-y-1">
                  <label className="block text-neutral-605 font-bold">Content Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-neutral-605 font-bold">Client</label>
                  <select
                    value={editClientId}
                    onChange={(e) => setEditClientId(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-neutral-900 focus:outline-hidden"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-neutral-605 font-bold">Posting Date</label>
                    <input
                      type="date"
                      required
                      value={editPostingDate}
                      onChange={(e) => setEditPostingDate(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-neutral-900 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-605 font-bold">Deadline</label>
                    <input
                      type="date"
                      required
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-neutral-900 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-neutral-105 hover:bg-neutral-150 rounded-lg text-neutral-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-neutral-900 hover:bg-neutral-850 text-white rounded-lg font-bold flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <>
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
                    <span className="text-neutral-900">{selectedTask.format || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] block">Priority:</span>
                    <span className={`capitalize ${calculatePriority(selectedTask.deadline) === 'Overdue' ? 'text-red-700' : 'text-neutral-800'}`}>
                      {calculatePriority(selectedTask.deadline)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] block">Stage Status:</span>
                    <span className="text-neutral-900">{selectedTask.status}</span>
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

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                  {currentUser && (isExecutive || (
                    (() => {
                      const assignedIds = typeof selectedTask.assignedUserIds === 'string'
                        ? JSON.parse(selectedTask.assignedUserIds)
                        : (selectedTask.assignedUserIds || []);
                      const isAssigned = assignedIds.includes(currentUser.id) || assignedIds.includes(currentUser.name);

                      const stages = selectedTask.stages
                        ? (typeof selectedTask.stages === 'string' ? JSON.parse(selectedTask.stages) : selectedTask.stages)
                        : [];
                      const isStageAssignee = Array.isArray(stages) && stages.some((s: any) => s.userId === currentUser.id || s.userName === currentUser.name);

                      return isAssigned || isStageAssignee;
                    })()
                  )) && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1 transition"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit specifications
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="bg-neutral-900 text-white font-semibold text-xs px-4 py-2 rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
