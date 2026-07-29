'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { CheckCircle, RotateCcw, ShieldCheck, ExternalLink, LayoutGrid, CheckSquare, ShieldAlert, Link } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ApprovalPage() {
  const { currentUser } = useUser();
  const { tasks, clients, approveTask, updateTaskStatus } = useData();
  const { workspaces, currentWorkspace } = useWorkspace();

  const [viewType, setViewType] = useState<'card' | 'table'>('card');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Authenticated review checks
  const isAnggi = currentUser?.name === 'Anggi' || currentUser?.id === 'u-anggi';
  const isGigie = currentUser?.name === 'Gigie' || currentUser?.id === 'u-gigie';
  const isAdmin = currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner');
  
  // Wewenang Approval per Workspace (Gigie hanya inhouse, Anggi hanya team anggi, Admin/Owner bebas)
  const isAnggiInWorkspace = isAnggi && currentWorkspace?.id === 'ws-team-anggi';
  const isGigieInWorkspace = isGigie && currentWorkspace?.id === 'ws-inhouse';
  const canApprove = isAdmin || isAnggiInWorkspace || isGigieInWorkspace;

  // Filter tasks in Approval stage
  const rawQueue = tasks.filter((t) => t.status === 'Approval');

  // Filter Approval Queue based on assignment & workspace permissions
  const approvalQueue = rawQueue.filter((t) => {
    if (t.workspaceId !== currentWorkspace?.id) return false;
    if (isAdmin) return true;
    if (isAnggi && currentWorkspace?.id === 'ws-team-anggi') return true;
    if (isGigie && currentWorkspace?.id === 'ws-inhouse') return true;
    return false;
  });

  const handleApprove = (taskId: string) => {
    try {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}

    approveTask(taskId, 'Scheduling', currentUser?.id || 'u-system');
    alert('Task approved! Moved to Scheduling pipeline stage.');
  };

  const handleRequestRevision = (taskId: string) => {
    if (!revisionNotes.trim()) {
      alert('Please provide revision notes.');
      return;
    }
    updateTaskStatus(taskId, 'Revision');
    setSelectedTaskId(null);
    setRevisionNotes('');
    alert('Revision requested. Moved back to Revision stage.');
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
          <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3.5">Content</th>
                    <th className="px-4 py-3.5">Client</th>
                    <th className="px-4 py-3.5">Preview Link</th>
                    <th className="px-4 py-3.5">Assignee</th>
                    <th className="px-4 py-3.5">Deadline</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Priority</th>
                    <th className="px-4 py-3.5">Workspace</th>
                    <th className="px-4 py-3.5">Approval Date (Last Update)</th>
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
                          {t.previewLink ? (
                            <a
                              href={t.previewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-purple-650" /> View Draft
                            </a>
                          ) : (
                            <span className="text-neutral-450 italic">No Preview</span>
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
