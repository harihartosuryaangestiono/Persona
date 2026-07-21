'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { CheckCircle, RotateCcw, ShieldCheck, ExternalLink } from 'lucide-react';
import { hasPermission } from '@/lib/rbac';
import confetti from 'canvas-confetti';

export default function ApprovalPage() {
  const { currentUser } = useUser();
  const { tasks, approveTask, updateTaskStatus } = useData();

  const [revisionNotes, setRevisionNotes] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const approvalQueue = tasks.filter((t) => t.status === 'Approval');
  const canApprove = hasPermission(currentUser, 'APPROVE_TASKS');

  const handleApprove = (taskId: string) => {
    try {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}

    approveTask(taskId, 'Scheduling', currentUser.id);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Approval Queue <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Strategist → Owner → Approved</span>
          </h1>
          <p className="text-xs text-neutral-500">Review creative assets, grant final approval, or request revisions.</p>
        </div>
      </div>

      {/* Queue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {approvalQueue.map((t) => (
          <div key={t.id} className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                  {t.clientName}
                </span>
                <h3 className="text-base font-bold text-neutral-900 mt-2">{t.title}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">{t.category} • {t.format}</p>
              </div>

              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                {t.score} pts
              </span>
            </div>

            {t.previewLink && (
              <div className="rounded-xl overflow-hidden border border-neutral-200 max-h-48 bg-neutral-50">
                <img src={t.previewLink} alt={t.title} className="w-full h-full object-cover" />
              </div>
            )}

            {t.driveLink && (
              <a
                href={t.driveLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-neutral-900 font-semibold hover:underline bg-neutral-50 p-2.5 rounded-xl border border-neutral-200"
              >
                <ExternalLink className="w-4 h-4" /> Review Drive Master Asset
              </a>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
              <button
                onClick={() => setSelectedTaskId(t.id)}
                className="bg-white hover:bg-neutral-50 border border-neutral-200 text-red-600 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Request Revision
              </button>

              <button
                onClick={() => handleApprove(t.id)}
                disabled={!canApprove}
                className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs flex items-center gap-1.5 transition"
              >
                <CheckCircle className="w-4 h-4" /> Approve Content
              </button>
            </div>
          </div>
        ))}

        {approvalQueue.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
            <ShieldCheck className="w-12 h-12 text-emerald-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-900">Approval Queue is Clear</h3>
            <p className="text-xs text-neutral-500 mt-1">All production assets have been reviewed and approved.</p>
          </div>
        )}
      </div>

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
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequestRevision(selectedTaskId)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-lg"
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
