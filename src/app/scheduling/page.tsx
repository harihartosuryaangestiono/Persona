'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Calendar as CalendarIcon, ListTodo, Filter, ExternalLink, FolderOpen } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function SchedulingPage() {
  const { tasks, clients, updateTask, updateTaskStatus } = useData();
  const { currentWorkspace } = useWorkspace();
  const { showToast } = useToast();

  const [selectedClientId, setSelectedClientId] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [postingTask, setPostingTask] = useState<any | null>(null);
  const [postUrlInput, setPostUrlInput] = useState('');
  const [postUrlError, setPostUrlError] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const [subQueueTab, setSubQueueTab] = useState<'pending' | 'posted'>('pending');

  // Workspace restriction
  const workspaceTasks = tasks.filter((t) => !t.isArchived && (!t.workspaceId || t.workspaceId === currentWorkspace.id));

  // Client filtering
  const filteredTasks = workspaceTasks.filter(
    (t) => selectedClientId === 'ALL' || t.clientId === selectedClientId
  );

  // Pending Queue List (Scheduling or Ready to Post)
  const pendingQueue = filteredTasks.filter((t) => t.status === 'Scheduling' || t.status === 'Ready to Post');

  // Posted Queue List (Posted)
  const postedQueue = filteredTasks.filter((t) => t.status === 'Posted');

  // Calendar dates math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const formatDayString = (dayNum: number) => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleMarkAsPosted = (t: any) => {
    setPostingTask(t);
    setPostUrlInput(t.previewLink || '');
    setPostUrlError('');
    setIsSubmittingPost(false);
  };

  const handleSavePosted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postingTask || isSubmittingPost) return;

    const trimmed = postUrlInput.trim();
    if (!trimmed) {
      setPostUrlError('Please provide a valid live post URL.');
      return;
    }

    setIsSubmittingPost(true);
    setPostUrlError('');

    let formattedLink = trimmed;
    if (!/^https?:\/\//i.test(trimmed)) {
      formattedLink = `https://${trimmed}`;
    }

    try {
      await updateTask(postingTask.id, {
        status: 'Posted',
        previewLink: formattedLink
      });
      showToast?.('Content successfully marked as Posted!', 'success');
      setPostingTask(null);
    } catch (err) {
      console.error(err);
      setPostUrlError('Failed to mark content as posted. Please try again.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Social Media Scheduling Dashboard
            <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">
              {currentWorkspace.name}
            </span>
          </h1>
          <p className="text-xs text-neutral-500">
            Publish approved contents to platforms. 1 Post = 5 Pts in employee scores.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'list' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" /> Queue List ({pendingQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'calendar' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Scheduling Calendar
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs font-medium shadow-xs">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-neutral-400" />
          <span className="text-neutral-500 font-bold">Client Filter:</span>
        </div>

        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-neutral-800 focus:outline-hidden"
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

      {/* Main Content Area */}
      {activeTab === 'list' ? (
        <div className="space-y-4">
          {/* Sub Queue Tab Selector */}
          <div className="flex border-b border-neutral-200/80 text-xs font-semibold">
            <button
              onClick={() => setSubQueueTab('pending')}
              className={`pb-2.5 px-4 border-b-2 transition ${
                subQueueTab === 'pending'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-450 hover:text-neutral-900'
              }`}
            >
              Pending Queue ({pendingQueue.length})
            </button>
            <button
              onClick={() => setSubQueueTab('posted')}
              className={`pb-2.5 px-4 border-b-2 transition ${
                subQueueTab === 'posted'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-450 hover:text-neutral-900'
              }`}
            >
              Posted History ({postedQueue.length})
            </button>
          </div>

          {/* QUEUE LIST TABLE VIEW */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3.5">Content Title</th>
                  <th className="px-4 py-3.5">Client</th>
                  <th className="px-4 py-3.5">Posting Date</th>
                  <th className="px-4 py-3.5">Format</th>
                  <th className="px-4 py-3.5 text-center">Score</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {subQueueTab === 'pending' ? (
                  <>
                    {pendingQueue.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50 transition">
                        <td className="px-4 py-3.5 font-bold text-neutral-900">{t.title}</td>
                        <td className="px-4 py-3.5 font-semibold text-neutral-800">
                          <span
                            className="px-2 py-0.5 rounded text-[10px]"
                            style={{ backgroundColor: `${t.clientColor}15`, color: t.clientColor }}
                          >
                            {t.clientName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-neutral-900 font-semibold">{t.postingDate || t.deadline}</td>
                        <td className="px-4 py-3.5 font-mono text-neutral-700 font-semibold">{t.format}</td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-neutral-900">{t.score} pts</td>
                        <td className="px-4 py-3.5 text-right flex items-center justify-end gap-2">
                          {t.driveLink ? (
                            <a
                              href={t.driveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-950 border border-neutral-250 font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition"
                              title="Open Preview Assets"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
                              Preview
                            </a>
                          ) : (
                            <button
                              disabled
                              className="inline-flex items-center gap-1.5 bg-neutral-50 text-neutral-350 border border-neutral-100 font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-not-allowed"
                              title="No drive assets link added"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-neutral-200" />
                              Preview
                            </button>
                          )}
                          <button
                            onClick={() => handleMarkAsPosted(t)}
                            className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition"
                          >
                            Mark as Posted
                          </button>
                        </td>
                      </tr>
                    ))}

                    {pendingQueue.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-400 italic">
                          No items currently queued for scheduling.
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <>
                    {postedQueue.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50 transition">
                        <td className="px-4 py-3.5 font-bold text-neutral-900">{t.title}</td>
                        <td className="px-4 py-3.5 font-semibold text-neutral-800">
                          <span
                            className="px-2 py-0.5 rounded text-[10px]"
                            style={{ backgroundColor: `${t.clientColor}15`, color: t.clientColor }}
                          >
                            {t.clientName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-neutral-900 font-semibold">{t.postingDate || t.deadline}</td>
                        <td className="px-4 py-3.5 font-mono text-neutral-700 font-semibold">{t.format}</td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-neutral-900">{t.score} pts</td>
                        <td className="px-4 py-3.5 text-right flex items-center justify-end gap-2">
                          {t.previewLink ? (
                            <a
                              href={t.previewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 p-1.5 rounded-lg border border-emerald-250 bg-emerald-50/50 font-bold font-mono text-[9px] flex items-center gap-1.5 transition"
                              title="View Live Post"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View Post
                            </a>
                          ) : (
                            <span className="text-[10px] text-neutral-400 italic">No Link</span>
                          )}
                          <button
                            onClick={() => handleMarkAsPosted(t)}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-750 font-semibold text-xs px-3.5 py-1.5 rounded-lg border border-neutral-200 transition"
                          >
                            Edit Link
                          </button>
                        </td>
                      </tr>
                    ))}

                    {postedQueue.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-400 italic">
                          No items have been marked as posted yet.
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SCHEDULING CALENDAR VIEW */
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <h2 className="text-base font-bold text-neutral-900">{monthName}</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="px-2 py-1 rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition text-xs font-bold"
              >
                Previous
              </button>
              <button
                onClick={handleNextMonth}
                className="px-2 py-1 rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition text-xs font-bold"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="font-semibold text-neutral-400 py-1.5 uppercase tracking-wider">
                {day}
              </div>
            ))}

            {/* Empty padding */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[80px] p-2 rounded-xl bg-neutral-50/50 border border-neutral-100 opacity-40" />
            ))}

            {/* Days list */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
              const dateStr = formatDayString(dayNum);
              // Show tasks in Ready to Post, Scheduling, or Posted status on their Posting Date
              const dayTasks = filteredTasks.filter(
                (t) =>
                  t.postingDate === dateStr &&
                  (t.status === 'Scheduling' || t.status === 'Ready to Post' || t.status === 'Posted')
              );

              return (
                <div key={dayNum} className="min-h-[85px] p-2 rounded-xl border border-neutral-200 bg-white text-left space-y-1">
                  <span className="text-xs font-mono font-bold text-neutral-700">{dayNum}</span>
                  <div className="space-y-1 overflow-y-auto max-h-[55px]">
                    {dayTasks.map((t) => {
                      const isPosted = t.status === 'Posted';
                      return (
                        <div
                          key={t.id}
                          className={`p-1 rounded text-[9px] font-bold truncate transition flex items-center justify-between gap-1 cursor-pointer ${
                            isPosted
                              ? 'bg-emerald-50 border border-emerald-250 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                          }`}
                          onClick={() => {
                            if (isPosted) {
                              if (t.previewLink) {
                                window.open(t.previewLink, '_blank');
                              } else {
                                alert('No post URL saved for this task.');
                              }
                            } else {
                              handleMarkAsPosted(t);
                            }
                          }}
                          title={isPosted ? (t.previewLink ? `Posted: Click to view live post` : `Posted`) : `Click to mark as posted`}
                        >
                          <span className="truncate flex-1">
                            {isPosted && '✓ '}
                            {t.title}
                          </span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            <span className="text-[8px] bg-purple-200 text-purple-900 px-1 rounded-sm font-mono font-bold" title="Posting Date">P</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Proof of Posting Custom Modal */}
      {postingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4 text-xs text-neutral-700 animate-slideUp">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wide font-mono">
                  Proof of Posting
                </span>
                <h3 className="text-sm font-bold text-neutral-900 mt-1">
                  Mark as Posted
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPostingTask(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 text-sm font-semibold transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePosted} className="space-y-4">
              <div className="space-y-1 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <label className="block text-neutral-400 font-bold font-mono text-[8px] uppercase tracking-wider">Content Title</label>
                <p className="font-bold text-neutral-800 text-xs">{postingTask.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${postingTask.clientColor}15`, color: postingTask.clientColor }}
                  >
                    {postingTask.clientName}
                  </span>
                  <span className="text-[9px] text-neutral-400">•</span>
                  <span className="text-[9px] font-mono text-neutral-500 font-bold">{postingTask.format}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-500 font-bold font-mono text-[9px] uppercase">Live Post URL (Link Post)</label>
                <input
                  type="text"
                  required
                  placeholder="https://instagram.com/p/... or https://tiktok.com/..."
                  value={postUrlInput}
                  onChange={(e) => {
                    setPostUrlInput(e.target.value);
                    if (e.target.value.trim()) setPostUrlError('');
                  }}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden focus:border-neutral-450 font-mono text-xs transition"
                />
                {postUrlError && (
                  <p className="text-[10px] text-rose-600 font-semibold mt-1">{postUrlError}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPostingTask(null)}
                  disabled={isSubmittingPost}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost}
                  className={`bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4 py-2 rounded-lg transition text-xs flex items-center gap-1.5 ${
                    isSubmittingPost ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmittingPost ? 'Submitting...' : 'Mark as Posted ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
