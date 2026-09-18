'use client';
 
import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useUser } from '@/context/UserContext';
import { Video, Calendar, MapPin, Users, CheckSquare, Camera, Upload, X, Check, Link as LinkIcon, Search, Filter, ExternalLink, Clock } from 'lucide-react';
 
import { useToast } from '@/context/ToastContext';
import { resolvePrimaryEmployee, isUserMatch } from '@/lib/rbac';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function getTaskFormat(t: any): string {
  const stages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
  if (Array.isArray(stages) && stages.length > 0) {
    const paStage = stages.find((s: any) =>
      s.role === 'Production Assistant' ||
      s.taskType === 'Production Assistant' ||
      s.role === 'Production' ||
      (s.taskType && String(s.taskType).includes('Production'))
    );
    if (paStage && paStage.format) {
      return paStage.format;
    }
    const firstStageWithFormat = stages.find((s: any) => s.format);
    if (firstStageWithFormat && firstStageWithFormat.format) {
      return firstStageWithFormat.format;
    }
  }
  return t.format || 'N/A';
}

function getTaskMonth(t: any): string {
  if (t.month) return t.month;
  const dateStr = t.postingDate || t.deadline || t.createdAt;
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return MONTH_NAMES[d.getMonth()];
}

export default function ProductionPage() {
  const { tasks, clients, updateTask, addWorklog } = useData();
  const { currentWorkspace } = useWorkspace();
  const { currentUser, allUsers } = useUser();
  const { showToast } = useToast();
 
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [driveModalTask, setDriveModalTask] = useState<any | null>(null);
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter states
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'INCOMPLETE' | 'COMPLETED' | 'ALL'>('INCOMPLETE');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter all production tasks assigned/visible to current workspace & user
  const allProductionTasks = tasks.filter((t) => {
    if (t.isArchived) return false;
    if (t.workspaceId !== currentWorkspace?.id) return false;
 
    const isProductionTask = 
      t.status === 'Production' || 
      t.status === 'Shooting' || 
      t.category === 'Production' || 
      t.taskType?.includes('Production') ||
      (t.stages && (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages).some((s: any) => s.role === 'Production Assistant' || s.taskType?.includes('Production')));
 
    if (!isProductionTask) return false;
 
    const isManager = currentUser?.roles?.some((r) => ['Admin', 'Owner', 'Strategist'].includes(r));
    if (isManager) return true;
 
    const parsedStages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
    const paStage = Array.isArray(parsedStages) ? parsedStages.find((s: any) =>
      s && (
        s.role === 'Production Assistant' ||
        s.taskType?.includes('Production') ||
        (s.name && String(s.name).toLowerCase().includes('shoot')) ||
        (s.name && String(s.name).toLowerCase().includes('prod'))
      )
    ) : null;

    if (paStage && (paStage.userId || paStage.userName)) {
      return isUserMatch(paStage.userId, currentUser) || isUserMatch(paStage.userName, currentUser);
    }

    const assignedIds = t.assignedUserIds
      ? (typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : t.assignedUserIds)
      : [];
    const isAssigned = assignedIds.some((id: string) => isUserMatch(id, currentUser));
    const isStageAssignee = Array.isArray(parsedStages) && parsedStages.some((s: any) => isUserMatch(s.userId, currentUser) || isUserMatch(s.userName, currentUser));
 
    return isAssigned || isStageAssignee;
  });

  // Filter by completion status, month, client, and search query
  const filteredTasks = allProductionTasks.filter((t) => {
    const isCompleted = t.status === 'Completed' || t.status === 'Editing' || t.status === 'Revision' || t.status === 'Scheduling' || t.status === 'Posted' || t.status === 'Ready to Post';

    if (selectedStatusFilter === 'INCOMPLETE' && isCompleted) return false;
    if (selectedStatusFilter === 'COMPLETED' && !isCompleted) return false;

    if (selectedMonthFilter !== 'ALL') {
      const taskMonth = getTaskMonth(t);
      if (taskMonth.toLowerCase() !== selectedMonthFilter.toLowerCase()) return false;
    }

    if (selectedClientFilter !== 'ALL') {
      if (t.clientId !== selectedClientFilter && t.clientName !== selectedClientFilter) return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchClient = (t.clientName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchClient) return false;
    }

    return true;
  });

  const incompleteCount = allProductionTasks.filter((t) => t.status === 'Production' || t.status === 'Shooting').length;
  const completedCount = allProductionTasks.length - incompleteCount;
 
  // Update status from Production to Shooting
  const handleStartShooting = async (taskId: string) => {
    setSubmittingId(taskId);
    try {
      await updateTask(taskId, { status: 'Shooting' });
      setSuccessMsg('Status updated to Shooting!');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    } finally {
      setSubmittingId(null);
    }
  };
 
  // Open drive link submission modal
  const openCompleteModal = (task: any) => {
    setDriveModalTask(task);
    setDriveLinkInput(task.driveLink || '');
  };
 
  // Complete shooting and move to Editing status (for video editing)
  const handleCompleteShooting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveModalTask) return;
 
    setSubmittingId(driveModalTask.id);
    const formattedLink = driveLinkInput ? formatUrl(driveLinkInput) : '';
    try {
      await updateTask(driveModalTask.id, {
        status: 'Editing',
        driveLink: formattedLink,
      });

      const primaryAssignedUser = resolvePrimaryEmployee(driveModalTask.stages, driveModalTask.assignedUserIds, allUsers, currentUser);
      await addWorklog({
        clientId: driveModalTask.clientId,
        clientName: driveModalTask.clientName,
        contentTitle: driveModalTask.title,
        userId: primaryAssignedUser?.id || currentUser?.id,
        userName: primaryAssignedUser?.name || currentUser?.name,
        taskType: driveModalTask.taskType || 'Production Assistant',
        format: getTaskFormat(driveModalTask),
        qty: driveModalTask.qty || 1,
        score: driveModalTask.score || 0,
        previewLink: formattedLink || driveModalTask.driveLink || '',
        stages: driveModalTask.stages || null,
        date: driveModalTask.postingDate || new Date().toISOString(),
        status: 'Completed',
        month: driveModalTask.month,
        year: driveModalTask.year,
        contentId: driveModalTask.contentId,
      });

      setDriveModalTask(null);
      setSuccessMsg('Shooting completed & forwarded to Editor!');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      console.error(err);
      showToast('Failed to save asset link', 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  // Complete Production task directly with Completed status
  const handleCompleteProduction = async (task: any, customDriveLink?: string) => {
    setSubmittingId(task.id);
    const finalDriveLink = customDriveLink ? formatUrl(customDriveLink) : task.driveLink;
    try {
      const rawTimeline = task.workflowTimeline ? (typeof task.workflowTimeline === 'string' ? JSON.parse(task.workflowTimeline) : task.workflowTimeline) : [];
      rawTimeline.push({
        status: 'Completed',
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'u-system',
      });

      await updateTask(task.id, {
        status: 'Completed',
        driveLink: finalDriveLink || '',
        workflowTimeline: JSON.stringify(rawTimeline),
      });

      const primaryAssignedUser = resolvePrimaryEmployee(task.stages, task.assignedUserIds, allUsers, currentUser);
      await addWorklog({
        clientId: task.clientId,
        clientName: task.clientName,
        contentTitle: task.title,
        userId: primaryAssignedUser?.id || currentUser?.id,
        userName: primaryAssignedUser?.name || currentUser?.name,
        taskType: task.taskType || 'Production Assistant',
        format: getTaskFormat(task),
        qty: task.qty || 1,
        score: task.score || 0,
        previewLink: task.previewLink || finalDriveLink || '',
        stages: task.stages || null,
        date: task.postingDate || new Date().toISOString(),
        status: 'Completed',
        month: task.month,
        year: task.year,
        contentId: task.contentId,
      });

      if (driveModalTask) setDriveModalTask(null);
      setSuccessMsg(`Production task "${task.title}" completed & points logged!`);
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      console.error(err);
      showToast('Failed to complete production task', 'error');
    } finally {
      setSubmittingId(null);
    }
  };
 
  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900 relative min-h-[80vh] pb-36">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Production & Shooting Schedule <span className="text-xs font-mono bg-purple-50 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">On-Site & Studio</span>
          </h1>
          <p className="text-xs text-neutral-550">On-site shoot sessions, camera gear allocation, and production lead assignments.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Belum Selesai: <strong className="font-mono">{incompleteCount}</strong></span>
          </div>
          <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Selesai: <strong className="font-mono">{completedCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter Bar Controls */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Filter Tabs (Incomplete / Completed / All) */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200">
            <button
              onClick={() => setSelectedStatusFilter('INCOMPLETE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedStatusFilter === 'INCOMPLETE'
                  ? 'bg-white text-purple-950 shadow-xs border border-neutral-200/80'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Belum Complete
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedStatusFilter === 'INCOMPLETE' ? 'bg-purple-100 text-purple-900' : 'bg-neutral-200 text-neutral-700'}`}>
                {incompleteCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedStatusFilter === 'COMPLETED'
                  ? 'bg-white text-emerald-950 shadow-xs border border-neutral-200/80'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Sudah Complete
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedStatusFilter === 'COMPLETED' ? 'bg-emerald-100 text-emerald-900' : 'bg-neutral-200 text-neutral-700'}`}>
                {completedCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedStatusFilter === 'ALL'
                  ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Semua Status
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-neutral-200 text-neutral-700">
                {allProductionTasks.length}
              </span>
            </button>
          </div>

          {/* Month & Client & Search Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
            {/* Search Input */}
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari judul / client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-900 focus:bg-white focus:outline-hidden transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter per Month */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="bg-transparent font-medium text-neutral-800 focus:outline-hidden text-xs cursor-pointer"
              >
                <option value="ALL">Semua Bulan</option>
                {MONTH_NAMES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filter by Client */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <select
                value={selectedClientFilter}
                onChange={(e) => setSelectedClientFilter(e.target.value)}
                className="bg-transparent font-medium text-neutral-800 focus:outline-hidden text-xs cursor-pointer max-w-[140px] truncate"
              >
                <option value="ALL">Semua Client</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
 
      {/* Toast Notification Alert */}
      {successMsg && (
        <div className="fixed top-4 right-4 bg-emerald-900 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl shadow-xl z-55 flex items-center gap-2 border border-emerald-800 animate-slideIn">
          <Check className="w-4 h-4 text-emerald-400" /> {successMsg}
        </div>
      )}
 
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-neutral-200 border-dashed rounded-2xl p-10 text-center space-y-2">
          <Video className="w-8 h-8 text-neutral-350 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-700">No production tasks found</h3>
          <p className="text-xs text-neutral-400">
            {selectedStatusFilter === 'INCOMPLETE' 
              ? 'Tidak ada tugas produksi yang belum selesai untuk filter saat ini.'
              : 'Tidak ada tugas produksi yang sesuai dengan filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTasks.map((t) => {
            const isTaskDone = t.status === 'Completed' || t.status === 'Editing' || t.status === 'Revision' || t.status === 'Scheduling' || t.status === 'Posted' || t.status === 'Ready to Post';

            return (
              <div key={t.id} className={`bg-white border rounded-2xl p-6 space-y-4 shadow-xs transition hover:shadow-md flex flex-col justify-between ${isTaskDone ? 'border-emerald-200 bg-emerald-50/20' : 'border-neutral-200/80'}`}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-850 border border-neutral-250 font-mono">
                          {t.clientName}
                        </span>
                        {isTaskDone ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono flex items-center gap-1">
                            <Check className="w-3 h-3" /> Selesai ({t.status})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-mono">
                            {t.status}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-neutral-900 mt-2">{t.title}</h3>
                      <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{t.description || 'No description provided.'}</p>
                    </div>
   
                    <span className="text-xs font-mono font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded border border-purple-200 shrink-0">
                      {t.score} pts
                    </span>
                  </div>
   
                  <div className="grid grid-cols-3 gap-2 text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-mono">
                    <div>
                      <span className="text-neutral-500 text-[10px]">Target Date:</span>
                      <p className="font-semibold text-neutral-900 mt-0.5">{t.deadline ? t.deadline.substring(0, 10) : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px]">Bulan:</span>
                      <p className="font-semibold text-purple-800 mt-0.5">{getTaskMonth(t) || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-neutral-550 text-[10px]">Format:</span>
                      <p className="font-semibold text-neutral-900 mt-0.5">{getTaskFormat(t)}</p>
                    </div>
                  </div>
                </div>
   
                {/* Action Buttons */}
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3 mt-2">
                  {t.status === 'Production' ? (
                    <button
                      onClick={() => handleStartShooting(t.id)}
                      disabled={submittingId === t.id}
                      className="flex-1 bg-purple-600 hover:bg-purple-750 text-white font-bold py-2 px-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {submittingId === t.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      Start Shooting
                    </button>
                  ) : t.status === 'Shooting' ? (
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCompleteProduction(t)}
                        disabled={submittingId === t.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2 rounded-xl transition text-[11px] flex items-center justify-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                        title="Mark production session completed & log points"
                      >
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        Complete Production
                      </button>
                      <button
                        onClick={() => openCompleteModal(t)}
                        disabled={submittingId === t.id}
                        className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2 px-2 rounded-xl transition text-[11px] flex items-center justify-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                        title="Upload asset link & forward to Video Editor"
                      >
                        <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        Complete & Send to Edit
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between text-xs">
                      <div className="text-emerald-700 font-semibold text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                        Tahap Selesai: {t.status}
                      </div>
                      {t.driveLink && (
                        <a
                          href={formatUrl(t.driveLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-700 hover:text-purple-900 font-semibold underline flex items-center gap-1 text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Drive Link
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
 
      {/* Complete Shooting asset modal */}
      {driveModalTask && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-filter backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-neutral-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-scaleUp p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <Upload className="w-4.5 h-4.5 text-emerald-600" /> Complete Shooting Phase
              </h3>
              <button
                onClick={() => setDriveModalTask(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
 
            <p className="text-xs text-neutral-500 leading-relaxed">
              Submit the link to the raw video/photo asset folder (Google Drive/Dropbox) to complete the shooting phase and forward it to the Editor.
            </p>
 
            <form onSubmit={handleCompleteShooting} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-neutral-700 font-bold flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5 text-neutral-400" /> Asset Drive Link *
                </label>
                <input
                  type="text"
                  required
                  value={driveLinkInput}
                  onChange={(e) => setDriveLinkInput(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:bg-white focus:outline-hidden transition"
                />
              </div>
 
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDriveModalTask(null)}
                  className="px-3 py-2 bg-neutral-100 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const task = driveModalTask;
                    handleCompleteProduction(task, driveLinkInput);
                  }}
                  className="px-3 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Mark Completed
                </button>
                <button
                  type="submit"
                  disabled={submittingId === driveModalTask.id}
                  className="px-4 py-2 bg-neutral-900 text-white font-bold rounded-lg hover:bg-neutral-800 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submittingId === driveModalTask.id ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Complete & Send to Edit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
