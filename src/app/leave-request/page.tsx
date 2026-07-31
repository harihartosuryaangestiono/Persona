'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { Plus, X } from 'lucide-react';
import { hasPermission } from '@/lib/rbac';

export default function LeaveRequestPage() {
  const { currentUser } = useUser();
  const { leaveRequests, submitLeave, approveLeave } = useData();

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-03');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'ANNUAL' | 'SICK' | 'EMERGENCY'>('ANNUAL');

  const canApprove = currentUser?.name === 'Devi' || currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    submitLeave({
      userId: currentUser.id,
      userName: currentUser.name,
      startDate,
      endDate,
      reason,
      type,
    });

    setIsSubmitModalOpen(false);
    setReason('');
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Leave Requests & Time Off <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">Approval Workflow</span>
          </h1>
          <p className="text-xs text-neutral-500">Employee leave submissions & manager approval queue.</p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-100 font-semibold text-xs text-neutral-900">
          Agency Time Off Submissions
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {leaveRequests.map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50 transition">
                  <td className="px-4 py-3 font-semibold text-neutral-900">{l.userName}</td>
                  <td className="px-4 py-3 font-mono text-neutral-500">
                    {l.startDate} to {l.endDate}
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-800">{l.type}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{l.reason}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        l.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : l.status === 'REJECTED'
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canApprove && l.status === 'PENDING' && l.userId !== currentUser?.id ? (
                      <button
                        onClick={() => approveLeave(l.id, currentUser.id)}
                        className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-[11px] px-3 py-1 rounded-lg transition shadow-xs"
                      >
                        Approve
                      </button>
                    ) : (
                      <span className="text-neutral-400 font-mono text-[10px]">
                        {l.status === 'APPROVED' ? 'Approved' : 'Awaiting Approval'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {leaveRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-400 italic">
                    No leave requests submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Leave Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">Submit Leave Request</h3>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Leave Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Reason</label>
                <textarea
                  rows={3}
                  placeholder="Describe reason for leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-3 text-neutral-900 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
