'use client';
 
import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useUser } from '@/context/UserContext';
import { Video, Calendar, MapPin, Users, CheckSquare, Camera, Upload, X, Check, Link } from 'lucide-react';
 
export default function ProductionPage() {
  const { tasks, updateTask } = useData();
  const { currentWorkspace } = useWorkspace();
  const { currentUser } = useUser();
 
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [driveModalTask, setDriveModalTask] = useState<any | null>(null);
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
 
  // Filter active production tasks
  const shootingTasks = tasks.filter((t) => {
    if (t.isArchived) return false;
    if (t.workspaceId !== currentWorkspace?.id) return false;
 
    const isProductionTask = 
      t.status === 'Production' || 
      t.status === 'Shooting' || 
      t.category === 'Production' || 
      t.taskType?.includes('Production') ||
      (t.stages && (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages).some((s: any) => s.role === 'Production Assistant' || s.taskType?.includes('Production')));
 
    if (!isProductionTask) return false;
 
    const isAdmin = currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner');
    if (isAdmin) return true;
 
    const assignedIds = t.assignedUserIds
      ? (typeof t.assignedUserIds === 'string' ? JSON.parse(t.assignedUserIds) : t.assignedUserIds)
      : [];
    const isAssigned = assignedIds.includes(currentUser?.id) || assignedIds.includes(currentUser?.name);
 
    const logStages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
    const isStageAssignee = logStages.some((s: any) => s.userId === currentUser?.id || s.userName === currentUser?.name);
 
    const userRoles = currentUser?.roles || [];
    let matchesCategory = false;
    if (userRoles.includes('Production Assistant') && t.category === 'Production') matchesCategory = true;
    if (userRoles.includes('Editor') && t.category === 'Editor') matchesCategory = true;
    if (userRoles.includes('Strategist') && t.category === 'Strategic') matchesCategory = true;
 
    return isAssigned || isStageAssignee || matchesCategory;
  });
 
  // Update status from Production to Shooting
  const handleStartShooting = async (taskId: string) => {
    setSubmittingId(taskId);
    try {
      await updateTask(taskId, { status: 'Shooting' });
      setSuccessMsg('Status updated to Shooting!');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    } finally {
      setSubmittingId(null);
    }
  };
 
  // Open drive link submission modal
  const openCompleteModal = (task: any) => {
    setDriveModalTask(task);
    setDriveLinkInput(task.driveLink || '');
  };
 
  // Complete shooting and move to Editing status
  const handleCompleteShooting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveModalTask) return;
 
    setSubmittingId(driveModalTask.id);
    try {
      await updateTask(driveModalTask.id, {
        status: 'Editing',
        driveLink: driveLinkInput,
      });
      setDriveModalTask(null);
      setSuccessMsg('Shooting completed & forwarded to Editor!');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to save asset link');
    } finally {
      setSubmittingId(null);
    }
  };
 
  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900 relative min-h-[80vh]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Production & Shooting Schedule <span className="text-xs font-mono bg-purple-50 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">On-Site & Studio</span>
          </h1>
          <p className="text-xs text-neutral-550">On-site shoot sessions, camera gear allocation, and production lead assignments.</p>
        </div>
      </div>
 
      {/* Toast Notification Alert */}
      {successMsg && (
        <div className="fixed top-4 right-4 bg-emerald-900 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl shadow-xl z-55 flex items-center gap-2 border border-emerald-800 animate-slideIn">
          <Check className="w-4 h-4 text-emerald-400" /> {successMsg}
        </div>
      )}
 
      {shootingTasks.length === 0 ? (
        <div className="bg-white border border-neutral-200 border-dashed rounded-2xl p-10 text-center space-y-2">
          <Video className="w-8 h-8 text-neutral-350 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-700">No active production tasks found</h3>
          <p className="text-xs text-neutral-400">Tasks sent to production or in shooting status will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shootingTasks.map((t) => (
            <div key={t.id} className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-4 shadow-xs transition hover:shadow-md flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-850 border border-neutral-250 font-mono">
                      {t.clientName}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900 mt-2">{t.title}</h3>
                    <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{t.description || 'No description provided.'}</p>
                  </div>
 
                  <span className="text-xs font-mono font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded border border-purple-200 shrink-0">
                    {t.score} pts
                  </span>
                </div>
 
                <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-mono">
                  <div>
                    <span className="text-neutral-500 text-[10px]">Target Date:</span>
                    <p className="font-semibold text-neutral-900 mt-0.5">{t.deadline ? t.deadline.substring(0, 10) : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-neutral-550 text-[10px]">Format:</span>
                    <p className="font-semibold text-neutral-900 mt-0.5">{t.format || 'N/A'}</p>
                  </div>
                </div>
              </div>
 
              {/* Action Buttons for Interactive PA Transitions */}
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
                  <button
                    onClick={() => openCompleteModal(t)}
                    disabled={submittingId === t.id}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Complete & Send to Edit
                  </button>
                ) : (
                  <div className="text-neutral-450 font-semibold text-xs italic flex items-center gap-1.5 py-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Current Stage: {t.status}
                  </div>
                )}
              </div>
            </div>
          ))}
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
                  <Link className="w-3.5 h-3.5 text-neutral-400" /> Asset Drive Link *
                </label>
                <input
                  type="url"
                  required
                  value={driveLinkInput}
                  onChange={(e) => setDriveLinkInput(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:bg-white focus:outline-hidden transition"
                />
              </div>
 
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDriveModalTask(null)}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingId === driveModalTask.id}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submittingId === driveModalTask.id ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Submit & Send'
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
