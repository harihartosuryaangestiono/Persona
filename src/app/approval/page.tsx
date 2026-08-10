'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { CheckCircle, RotateCcw, ShieldCheck, ExternalLink, LayoutGrid, CheckSquare, ShieldAlert, Link, Filter, X, ChevronUp, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';

import { useToast } from '@/context/ToastContext';

export default function ApprovalPage() {
  const { currentUser, allUsers } = useUser();
  const { tasks, clients, approveTask, updateTaskStatus, updateTask } = useData();
  const { workspaces, currentWorkspace } = useWorkspace();
  const { showToast } = useToast();

  const [viewType, setViewType] = useState<'card' | 'table'>('card');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Filters State
  const [selectedClientId, setSelectedClientId] = useState('ALL');
  const [selectedPIC, setSelectedPIC] = useState('ALL');
  const [selectedFormat, setSelectedFormat] = useState('ALL');

  // Sorting State
  const [sortField, setSortField] = useState<'title' | 'clientName' | 'deadline' | 'status' | 'priority'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Authenticated review checks
  const isAnggi = currentUser?.name === 'Anggi' || currentUser?.id === 'u-anggi';
  const isGigie = currentUser?.name === 'Gigie' || currentUser?.id === 'u-gigie';
  const isAdmin = currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner');
  
  // Wewenang Approval per Workspace (Gigie hanya inhouse, Anggi hanya team anggi, Admin/Owner bebas)
  const isAnggiInWorkspace = isAnggi && currentWorkspace?.id === 'ws-team-anggi';
  const isGigieInWorkspace = isGigie && currentWorkspace?.id === 'ws-inhouse';
  const canApprove = isAdmin || isAnggiInWorkspace || isGigieInWorkspace;

  // Filter tasks in Approval stage
  const rawQueue = tasks.filter((t) => t.status === 'Waiting for Approval' || t.status === 'Approval');

  // Formats list for filtering
  const uniqueFormats = Array.from(new Set(tasks.map((t) => t.format).filter(Boolean)));

  // Filter Approval Queue based on assignment & workspace permissions and user selected filters
  const filteredQueue = rawQueue.filter((t) => {
    if (t.workspaceId !== currentWorkspace?.id) return false;
    
    let allowed = false;
    if (isAdmin) allowed = true;
    else if (isAnggi && currentWorkspace?.id === 'ws-team-anggi') allowed = true;
    else if (isGigie && currentWorkspace?.id === 'ws-inhouse') allowed = true;

    if (!allowed) return false;

    // Apply client filter
    if (selectedClientId !== 'ALL' && t.clientId !== selectedClientId) return false;

    // Apply PIC filter
    if (selectedPIC !== 'ALL') {
      const assignedIds = typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : (t.assignedUserIds || []);
      const userObj = allUsers.find((u) => u.id === selectedPIC);
      const isAssigned = assignedIds.includes(selectedPIC) || (userObj && assignedIds.includes(userObj.name));
      
      const stages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
      const isStageAssignee = Array.isArray(stages) && stages.some((s: any) => s.userId === selectedPIC || (userObj && s.userName === userObj.name));

      if (!isAssigned && !isStageAssignee) return false;
    }

    // Apply format filter
    if (selectedFormat !== 'ALL' && t.format !== selectedFormat) return false;

    return true;
  });

  // Sort queue dynamically
  const approvalQueue = [...filteredQueue].sort((a, b) => {
    let valA: any = a[sortField] || '';
    let valB: any = b[sortField] || '';

    if (sortField === 'deadline') {
      valA = new Date(a.deadline).getTime();
      valB = new Date(b.deadline).getTime();
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleApprove = async (taskId: string) => {
    try {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}

    await approveTask(taskId, 'Ready to Post', currentUser?.id || 'u-system');
    showToast('Task approved! Moved to Ready to Post stage.', 'success');
  };

  const handleRequestRevision = async (taskId: string) => {
    if (!revisionNotes.trim()) {
      showToast('Please provide revision notes before requesting revision.', 'warning');
      return;
    }

    const taskObj = tasks.find((t) => t.id === taskId);
    const existingComments = taskObj?.comments
      ? (typeof taskObj.comments === 'string' ? JSON.parse(taskObj.comments) : taskObj.comments)
      : [];

    const newComment = {
      id: `comment-${Date.now()}`,
      userName: currentUser?.name || 'Approver',
      userId: currentUser?.id || 'u-system',
      text: `REVISION NOTE: ${revisionNotes.trim()}`,
      timestamp: new Date().toISOString()
    };
    const updatedComments = [...existingComments, newComment];

    try {
      await updateTask(taskId, {
        status: 'Revision',
        comments: updatedComments
      });
      setSelectedTaskId(null);
      setRevisionNotes('');
      showToast('Revision requested! Moved back to Revision stage.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Failed to request revision.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Approval Queue <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Review Gate</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Anggi handles approvals for Team Anggi, Gigie handles In-house, and Admins can approve globally.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-semibold">
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
        {(selectedClientId !== 'ALL' || selectedPIC !== 'ALL' || selectedFormat !== 'ALL') && (
          <button
            onClick={() => {
              setSelectedClientId('ALL');
              setSelectedPIC('ALL');
              setSelectedFormat('ALL');
            }}
            className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-0.5 ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Role Alert */}
      {!canApprove && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p>Access Restricted</p>
            <p className="font-normal text-amber-700 mt-1">
              {isGigie 
                ? 'Sesuai wewenang, Gigie hanya diperbolehkan menyetujui antrean di workspace Persona OS - Inhouse. Silakan pilih workspace Inhouse di switcher atas.'
                : isAnggi
                ? "Sesuai wewenang, Anggi hanya diperbolehkan menyetujui antrean di workspace Persona OS - Team Anggi. Silakan pilih workspace Team Anggi di switcher atas."
                : 'Hanya Approver yang berwenang (Admin, Anggi di Team Anggi, atau Gigie di Inhouse) yang diizinkan menyetujui antrean konten.'}
            </p>
          </div>
        </div>
      )}

      {/* Queue Views */}
      {approvalQueue.length > 0 ? (
        viewType === 'card' ? (
          /* CARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {approvalQueue.map((t) => {
              const uniqueUserNames = t.stages
                ? Array.from(new Set((typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages).map((s: any) => s.userName)))
                : [];

              return (
                <div key={t.id} className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded border"
                          style={{ backgroundColor: `${t.clientColor}15`, color: t.clientColor, borderColor: `${t.clientColor}30` }}
                        >
                          {t.clientName}
                        </span>
                        <h3 className="text-base font-bold text-neutral-900 mt-2">{t.title}</h3>
                        <p className="text-xs text-neutral-500 mt-0.5">PICs: {uniqueUserNames.join(', ') || 'Unassigned'}</p>
                      </div>

                      <span className="text-xs font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-1 rounded border border-neutral-200">
                        {t.score} pts
                      </span>
                    </div>

                    {t.previewLink && (
                      <a
                        href={t.previewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between text-xs text-purple-950 font-bold bg-purple-50 hover:bg-purple-100 p-2.5 rounded-xl border border-purple-200 transition"
                      >
                        <span className="flex items-center gap-2">
                          <Link className="w-4 h-4 text-purple-750" /> Review Preview Draft Link
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                      </a>
                    )}

                    {t.driveLink && (
                      <a
                        href={t.driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between text-xs text-neutral-900 font-semibold hover:bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 transition"
                      >
                        <span className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-neutral-500" /> Review Drive Master Asset
                        </span>
                      </a>
                    )}
                  </div>

                  {/* Actions (Only enable if Anggi or Admin) */}
                  {canApprove && (
                    <div className="flex items-center justify-between pt-4 border-t border-neutral-100 mt-4">
                      <button
                        onClick={() => setSelectedTaskId(t.id)}
                        className="bg-white hover:bg-neutral-50 border border-neutral-200 text-red-655 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Request Revision
                      </button>

                      <button
                        onClick={() => handleApprove(t.id)}
                        className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs flex items-center gap-1.5 transition"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve Content
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW (Requirement 12) */
          /* TABLE VIEW */
          <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3.5 cursor-pointer select-none" onClick={() => handleSort('title')}>
                      <div className="flex items-center gap-1">
                        Content
                        {sortField === 'title' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3.5 cursor-pointer select-none" onClick={() => handleSort('clientName')}>
                      <div className="flex items-center gap-1">
                        Client
                        {sortField === 'clientName' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3.5">Preview Link</th>
                    <th className="px-4 py-3.5">Assignee</th>
                    <th className="px-4 py-3.5 cursor-pointer select-none" onClick={() => handleSort('deadline')}>
                      <div className="flex items-center gap-1">
                        Deadline
                        {sortField === 'deadline' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3.5 cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">
                        Status
                        {sortField === 'status' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3.5 cursor-pointer select-none" onClick={() => handleSort('priority')}>
                      <div className="flex items-center gap-1">
                        Priority
                        {sortField === 'priority' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3.5">Workspace</th>
                    <th className="px-4 py-3.5 font-bold">Reviewer</th>
                    {canApprove && <th className="px-4 py-3.5 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {approvalQueue.map((t) => {
                    const uniqueUserNames = t.stages
                      ? Array.from(new Set((typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages).map((s: any) => s.userName)))
                      : [];

                    const wsName = workspaces.find((w) => w.id === t.workspaceId)?.name || 'Main Workspace';

                    // Reviewer Logic
                    const reviewer = isAnggi ? 'Anggi' : isGigie ? 'Gigie' : isAdmin ? `${currentUser?.name} (Admin Override)` : currentUser?.name || 'Reviewer';

                    return (
                      <tr key={t.id} className="hover:bg-neutral-50 transition">
                        <td className="px-4 py-3.5 font-bold text-neutral-900">{t.title}</td>
                        <td className="px-4 py-3.5 font-semibold">
                          <span
                            className="px-2 py-0.5 rounded text-[10px]"
                            style={{ backgroundColor: `${t.clientColor}15`, color: t.clientColor }}
                          >
                            {t.clientName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {t.driveLink ? (
                            <a
                              href={t.driveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-750 hover:text-purple-900 font-bold flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-purple-650" /> View Draft
                            </a>
                          ) : (
                            <span className="text-neutral-450 italic">No Draft Link</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-neutral-600">
                          {uniqueUserNames.join(', ') || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-neutral-500 font-bold">{t.deadline}</td>
                        <td className="px-4 py-3.5">
                          <span className="badge-waiting text-[10px] px-2 py-0.5 rounded border border-amber-200 font-bold">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-neutral-800">{t.priority}</td>
                        <td className="px-4 py-3.5 font-semibold text-neutral-500">{wsName}</td>
                        <td className="px-4 py-3.5 font-mono text-neutral-500">{t.updatedAt ? t.updatedAt.substring(0, 10) : 'Pending'}</td>
                        <td className="px-4 py-3.5 font-bold text-neutral-900">{reviewer}</td>
                        {canApprove && (
                          <td className="px-4 py-3.5 text-center flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedTaskId(t.id)}
                              className="p-1.5 rounded hover:bg-neutral-100 text-red-655"
                              title="Request Revision"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleApprove(t.id)}
                              className="p-1.5 rounded hover:bg-neutral-100 text-emerald-700"
                              title="Approve Content"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* CLEAR QUEUE */
        <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
          <ShieldCheck className="w-12 h-12 text-emerald-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900">Approval Queue is Clear</h3>
          <p className="text-xs text-neutral-500 mt-1">All production assets have been reviewed and approved.</p>
        </div>
      )}

      {/* Revision Modal */}
      {selectedTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-neutral-900">Request Revision Notes</h3>
            <textarea
              rows={3}
              placeholder="Specify required edits (e.g., change music track, adjust caption font)..."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="w-full bg-white border border-neutral-200 rounded-lg p-3 text-xs text-neutral-900 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedTaskId(null)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequestRevision(selectedTaskId)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-lg"
              >
                Send Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
