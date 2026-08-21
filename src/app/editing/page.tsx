'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import {
  Video,
  ExternalLink,
  FolderOpen,
  LayoutGrid,
  CheckSquare,
  Filter,
  Search,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

function formatUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export default function EditingQueuePage() {
  const { currentUser, allUsers } = useUser();
  const { tasks, clients, updateTask } = useData();
  const { currentWorkspace, workspaces } = useWorkspace();
  const { showToast } = useToast();

  // State Management
  const [viewType, setViewType] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL, Editing, Revision
  const [selectedPic, setSelectedPic] = useState('ALL'); // ALL, ME, or specific userId

  // Task detail/edit Modal State
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editDriveLink, setEditDriveLink] = useState('');
  const [editPreviewLink, setEditPreviewLink] = useState('');
  const [editChecklist, setEditChecklist] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Quick Card Drive Submission State
  const [activeSubmitId, setActiveSubmitId] = useState<string | null>(null);
  const [submittingDrive, setSubmittingDrive] = useState<Record<string, string>>({});

  const handleOpenTask = (t: any) => {
    if (isSaving) return;
    setSelectedTask(t);
    setEditStatus(t.status);
    setEditDriveLink(t.driveLink || '');
    setEditPreviewLink(t.previewLink || '');
    setEditChecklist(t.checklist ? (typeof t.checklist === 'string' ? JSON.parse(t.checklist) : t.checklist) : []);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || isSaving) return;
    setIsSaving(true);
    try {
      const formattedDrive = editDriveLink ? formatUrl(editDriveLink) : '';
      const formattedPreview = editPreviewLink ? formatUrl(editPreviewLink) : '';
      await updateTask(selectedTask.id, {
        status: editStatus as any,
        driveLink: formattedDrive,
        previewLink: formattedPreview,
        checklist: editChecklist,
      });
      showToast('Task updated successfully!', 'success');
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to update task.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickSubmitDrive = async (taskId: string) => {
    if (isSaving) return;
    setIsSaving(true);
    const link = submittingDrive[taskId] || '';
    const formattedLink = link ? formatUrl(link) : '';
    try {
      await updateTask(taskId, { driveLink: formattedLink });
      showToast('Drive link submitted successfully!', 'success');
      setActiveSubmitId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to submit drive link.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter Tasks for the current workspace and Editing/Revision stages
  const editingTasks = tasks.filter((t) => {
    if (t.workspaceId !== currentWorkspace.id || t.isArchived) return false;
    return t.status === 'Editing' || t.status === 'Revision';
  });

  // Apply filters
  const filteredTasks = editingTasks.filter((t) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchClient = t.clientName?.toLowerCase().includes(q);
      if (!matchTitle && !matchClient) return false;
    }

    // 2. Client Filter
    if (selectedClientId !== 'ALL' && t.clientId !== selectedClientId) {
      return false;
    }

    // 3. Status Filter
    if (selectedStatus !== 'ALL' && t.status !== selectedStatus) {
      return false;
    }

    // 4. PIC Filter
    if (selectedPic !== 'ALL') {
      const assignedIds = t.assignedUserIds ? (typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : t.assignedUserIds) : [];
      if (selectedPic === 'ME') {
        const isAssigned = assignedIds.includes(currentUser?.id) || assignedIds.includes(currentUser?.name);
        if (!isAssigned) return false;
      } else {
        const isAssigned = assignedIds.includes(selectedPic);
        if (!isAssigned) return false;
      }
    }

    return true;
  });

  const renderCardActions = (t: any) => {
    const hasPreview = !!t.previewLink;
    const hasDrive = !!t.driveLink;

    return (
      <div className="mt-2.5 pt-2 border-t border-neutral-100 space-y-2">
        {activeSubmitId === t.id ? (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
            <input
               type="text"
               placeholder="Paste Drive URL..."
               disabled={isSaving}
               value={submittingDrive[t.id] || ''}
               onChange={(e) => setSubmittingDrive(prev => ({ ...prev, [t.id]: e.target.value }))}
               className="bg-white border border-neutral-200 rounded px-2 py-1 text-[10px] focus:outline-hidden flex-1 font-mono text-neutral-808 disabled:opacity-50"
             />
            <button
              onClick={() => handleQuickSubmitDrive(t.id)}
              disabled={isSaving}
              className={`bg-neutral-900 hover:bg-neutral-800 text-white px-2.5 py-1 rounded text-[10px] font-semibold transition ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setActiveSubmitId(null)}
              disabled={isSaving}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-500 px-2 py-1 rounded text-[10px] disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {hasPreview ? (
              <a
                href={t.previewLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 font-semibold px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </a>
            ) : (
              <button
                disabled
                className="bg-neutral-50 border border-neutral-200 text-neutral-400 font-semibold px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 cursor-not-allowed opacity-50"
              >
                <ExternalLink className="w-3.5 h-3.5" /> No Preview
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveSubmitId(t.id);
                setSubmittingDrive(prev => ({ ...prev, [t.id]: t.driveLink || '' }));
              }}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 transition"
            >
              <FolderOpen className="w-3.5 h-3.5" /> {hasDrive ? 'Update Drive' : 'Submit Drive'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Editing & Revision Queue
            <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">
              {currentWorkspace.name}
            </span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage files currently undergoing editing or revision. Submit drive assets once complete.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setViewType('card')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              viewType === 'card' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Card View
          </button>
          <button
            onClick={() => setViewType('table')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              viewType === 'table' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" /> Table View
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-3.5 h-3.5 text-neutral-400" />
            </span>
            <input
              type="text"
              placeholder="Search title, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-neutral-850 focus:outline-hidden"
            />
          </div>

          {/* Client Filter */}
          <div>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-855 font-semibold focus:outline-hidden"
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

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-855 font-semibold focus:outline-hidden"
            >
              <option value="ALL">All Stages (Editing + Revision)</option>
              <option value="Editing">Editing stage</option>
              <option value="Revision">Revision stage</option>
            </select>
          </div>

          {/* PIC Filter */}
          <div>
            <select
              value={selectedPic}
              onChange={(e) => setSelectedPic(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-855 font-semibold focus:outline-hidden"
            >
              <option value="ALL">All Assignees</option>
              <option value="ME">Assigned to Me</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.roles.join(', ')})
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      {filteredTasks.length > 0 ? (
        viewType === 'card' ? (
          /* CARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => handleOpenTask(t)}
                className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-xs hover:border-neutral-350 transition"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
                      style={{ backgroundColor: `${t.clientColor}15`, color: t.clientColor }}
                    >
                      {t.clientName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        t.status === 'Revision' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-250'
                      }`}>
                        {t.status}
                      </span>
                      {t.status === 'Revision' && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          t.revisionSeverity === 'Major' || (t.comments && JSON.stringify(t.comments).includes('Major'))
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : t.revisionSeverity === 'Medium' || (t.comments && JSON.stringify(t.comments).includes('Medium'))
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {t.revisionSeverity ? `Revisi ${t.revisionSeverity}` : JSON.stringify(t.comments || '').includes('Major') ? 'Revisi Major' : JSON.stringify(t.comments || '').includes('Medium') ? 'Revisi Medium' : 'Revisi Minor'}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-neutral-900 mt-3">{t.title}</h3>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    {(() => {
                      const parsedStages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
                      const edStage = Array.isArray(parsedStages) ? parsedStages.find((s: any) => s.role === 'Editor' || s.taskType === 'Editing' || ['Single Foto', 'Grafis', 'Story Video', 'Paket Static', 'Carousel', 'Reels'].includes(s.format)) : null;
                      return edStage?.format || t.format || 'Reels';
                    })()} • PICs: {t.stages ? Array.from(new Set((typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages).map((s: any) => s.userName))).join(', ') : 'Unassigned'}
                  </p>
                  {t.status === 'Revision' && t.comments && (typeof t.comments === 'string' ? JSON.parse(t.comments) : t.comments).length > 0 && (
                    <div className="mt-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-900 leading-snug space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="font-bold text-[9px] uppercase tracking-wider text-rose-600 font-mono">
                          Revision Notes ({t.revisionSeverity || (JSON.stringify(t.comments || '').includes('Major') ? 'Major' : JSON.stringify(t.comments || '').includes('Medium') ? 'Medium' : 'Minor')})
                        </strong>
                      </div>
                      <p className="line-clamp-3 text-xs font-medium text-neutral-800">
                        {((typeof t.comments === 'string' ? JSON.parse(t.comments) : t.comments) as any[])
                          .filter((c: any) => c.text.includes('REVISION NOTE'))
                          .slice(-1)[0]?.text.replace(/REVISION NOTE (\[Severity: (Minor|Medium|Major)\])?:? /g, '') ||
                          ((typeof t.comments === 'string' ? JSON.parse(t.comments) : t.comments) as any[]).slice(-1)[0]?.text}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-neutral-100">
                  <span>Deadline: <strong className="text-neutral-700 font-semibold">{t.deadline}</strong></span>
                  <span className="font-mono font-bold">{t.score} pts</span>
                </div>
                {renderCardActions(t)}
              </div>
            ))}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3.5">Content</th>
                    <th className="px-4 py-3.5">Client</th>
                    <th className="px-4 py-3.5">Format</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Deadline</th>
                    <th className="px-4 py-3.5">PIC / Assignee</th>
                    <th className="px-4 py-3.5 font-bold">Score</th>
                    <th className="px-4 py-3.5">Preview Link</th>
                    <th className="px-4 py-3.5">Drive Link</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {filteredTasks.map((t) => {
                    const parsedStages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
                    const uniqueUserNames = Array.isArray(parsedStages)
                      ? Array.from(new Set(parsedStages.map((s: any) => s.userName)))
                      : [];
                    const edStage = Array.isArray(parsedStages) ? parsedStages.find((s: any) => s.role === 'Editor' || s.taskType === 'Editing' || ['Single Foto', 'Grafis', 'Story Video', 'Paket Static', 'Carousel', 'Reels'].includes(s.format)) : null;
                    const displayFormat = edStage?.format || t.format || 'Reels';

                    return (
                      <tr key={t.id} onClick={() => handleOpenTask(t)} className="hover:bg-neutral-50 transition cursor-pointer">
                        <td className="px-4 py-3.5 font-bold text-neutral-900">{t.title}</td>
                        <td className="px-4 py-3.5 font-semibold">
                          <span
                            className="px-2 py-0.5 rounded text-[10px]"
                            style={{ backgroundColor: `${t.clientColor}15`, color: t.clientColor }}
                          >
                            {t.clientName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-neutral-700 font-semibold">{displayFormat}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              t.status === 'Revision' 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-amber-50 text-amber-750 border-amber-250'
                            }`}>
                              {t.status}
                            </span>
                            {t.status === 'Revision' && (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                t.revisionSeverity === 'Major' || (t.comments && JSON.stringify(t.comments).includes('Major'))
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : t.revisionSeverity === 'Medium' || (t.comments && JSON.stringify(t.comments).includes('Medium'))
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              }`}>
                                {t.revisionSeverity ? `Revisi ${t.revisionSeverity}` : JSON.stringify(t.comments || '').includes('Major') ? 'Revisi Major' : JSON.stringify(t.comments || '').includes('Medium') ? 'Revisi Medium' : 'Revisi Minor'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-neutral-500 font-bold">{t.deadline}</td>
                        <td className="px-4 py-3.5 font-semibold text-neutral-600">
                          {uniqueUserNames.join(', ') || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3.5 font-bold font-mono text-neutral-900">{t.score} pts</td>
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          {t.previewLink ? (
                            <a
                              href={t.previewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View Draft
                            </a>
                          ) : (
                            <span className="text-neutral-400 italic">No Preview</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          {t.driveLink ? (
                            <a
                              href={t.driveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View Drive
                            </a>
                          ) : (
                            <span className="text-neutral-400 italic">No Drive Link</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold" onClick={(e) => e.stopPropagation()}>
                          {renderCardActions(t)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
          <Video className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900 font-semibold">Editing Queue is Clear</h3>
          <p className="text-xs text-neutral-500 mt-1">No content is currently queued for editing or revisions.</p>
        </div>
      )}

      {/* Task Details and Quick Edit Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4 text-xs text-neutral-700 animate-fadeIn">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                  {selectedTask.clientName}
                </span>
                <h3 className="text-sm font-bold text-neutral-900 mt-2">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-bold font-mono text-[9px] uppercase">Format</label>
                  <p className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-800 font-medium">
                    {selectedTask.format || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="block text-neutral-500 font-bold font-mono text-[9px] uppercase">Score</label>
                  <p className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-800 font-bold font-mono">
                    {selectedTask.score} pts
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-500 font-bold font-mono text-[9px] uppercase">Status / Stage</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-medium focus:outline-hidden"
                >
                  {(selectedTask.category === 'Strategic'
                    ? ['Brief', 'Content Proposal', 'Editorial Calendar', 'Script & Shotlist', 'Ready for Production', 'Completed']
                    : ['Production', 'Editing', 'Revision', 'Waiting for Approval', 'Approval', 'Ready to Post', 'Scheduling', 'Posted']
                  ).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-neutral-500 font-bold font-mono text-[9px] uppercase">Google Drive Link</label>
                  {editDriveLink && (
                    <a
                      href={editDriveLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-650 hover:underline flex items-center gap-0.5 text-[9px] font-bold"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> Open
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={editDriveLink}
                  onChange={(e) => setEditDriveLink(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-neutral-500 font-bold font-mono text-[9px] uppercase">Post Link (Preview)</label>
                  {editPreviewLink && (
                    <a
                      href={formatUrl(editPreviewLink)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-650 hover:underline flex items-center gap-0.5 text-[9px] font-bold"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> Open Link
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="https://instagram.com/p/..."
                  value={editPreviewLink}
                  onChange={(e) => setEditPreviewLink(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden font-mono"
                />
              </div>

              {/* Checklist rendering */}
              {editChecklist.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                  <label className="block text-neutral-500 font-bold font-mono text-[9px] uppercase mb-1">Checklist Progress</label>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {editChecklist.map((item, idx) => (
                      <label key={item.id || idx} className="flex items-center gap-2 cursor-pointer text-[11px] font-medium text-neutral-700">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => {
                            setEditChecklist((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, done: !c.done } : c))
                            );
                          }}
                          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
                        />
                        <span className={item.done ? 'line-through text-neutral-450' : ''}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Revision Notes & Comments rendering */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                <label className="block text-neutral-500 font-bold font-mono text-[9px] uppercase mb-1">
                  Revision Notes & Comments
                </label>
                {selectedTask.comments && (typeof selectedTask.comments === 'string' ? JSON.parse(selectedTask.comments) : selectedTask.comments).length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                    {((typeof selectedTask.comments === 'string' ? JSON.parse(selectedTask.comments) : selectedTask.comments) as any[]).map((comment: any, idx: number) => (
                      <div key={comment.id || idx} className="text-[11px] leading-snug space-y-0.5">
                        <div className="flex items-center justify-between text-[9px] text-neutral-450 font-semibold">
                          <span>{comment.userName}</span>
                          <span>{new Date(comment.timestamp).toLocaleString()}</span>
                        </div>
                        <p className={`font-medium ${comment.text.startsWith('REVISION NOTE:') ? 'text-rose-700 font-bold' : 'text-neutral-700'}`}>
                          {comment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-450 italic text-[10px]">No revision notes or comments.</p>
                )}
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  disabled={isSaving}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4 py-2 rounded-lg transition ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
