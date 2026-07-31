'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  DollarSign,
  Award,
  CheckCircle2,
  Clock,
  Video,
  FileText,
  Users,
  ExternalLink,
  Zap,
  Calendar as CalendarIcon,
  Briefcase,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { formatRupiah, getCapacityHealth, calculateUserPointsForPeriod } from '@/lib/score-calculator';

export default function DynamicDashboardPage() {
  const { currentUser } = useUser();
  const { tasks, worklogs, clients, attendances } = useData();
  const { currentWorkspace } = useWorkspace();

  // Role Checks
  const isOwner = currentUser?.roles.includes('Owner') || currentUser?.roles.includes('Admin');
  const isStrategist = currentUser?.roles.includes('Strategist');
  const isEditor = currentUser?.roles.includes('Editor');
  const isScheduler = currentUser?.roles.includes('Scheduler');
  const isPA = currentUser?.roles.includes('Production Assistant');

  const [selectedMonth, setSelectedMonth] = useState('July');
  const [selectedYear, setSelectedYear] = useState(2026);

  // Filter Tasks for current user's workspace, excluding archived
  const workspaceTasks = tasks.filter((t) => t.workspaceId === currentWorkspace.id && !t.isArchived);

  // Recalculate employee workload score from stages and tasks (Requirement 10: July 2026 default)
  const userTotalPoints = currentUser ? calculateUserPointsForPeriod(currentUser, selectedMonth, selectedYear, worklogs, tasks) : 0;

  const maxCapacity = (currentUser?.monthlyCapacity && currentUser.monthlyCapacity !== 12000) ? currentUser.monthlyCapacity : 16000;
  const capacityHealth = getCapacityHealth(userTotalPoints, maxCapacity);
  const remainingCapacity = maxCapacity - userTotalPoints;
  const workloadForecast = capacityHealth.percent >= 90 ? 'Critical Overload' : (capacityHealth.percent >= 75 ? 'Busy/Full Load' : 'Healthy Capacity');

  // Executive Metrics (Admins) (Requirement 10: July 2026 default)
  const totalAgencyPoints = worklogs
    .filter((w) => w.month === selectedMonth && Number(w.year) === selectedYear)
    .reduce((sum, w) => sum + w.score, 0);
  const totalAgencyCOGS = totalAgencyPoints * 250; // Employee Point COGS: Rp250 / point

  // Filter pending approvals for Admin
  const pendingApprovals = tasks.filter((t) => t.status === 'Approval' && !t.isArchived);

  // Filter today's attendance
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendances = attendances.filter((a) => a.date.startsWith(todayStr));

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Personalized Greeting Header */}
      <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-12 h-12 rounded-xl object-cover border border-neutral-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white font-bold text-lg flex items-center justify-center border border-neutral-200">
              {currentUser?.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Good Morning, {currentUser?.name}
            </h1>
            <p className="text-xs text-neutral-500 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
              <span>{currentUser?.roles.join(' • ')}</span>
              <span>•</span>
              <span>Workspace: {currentWorkspace.name}</span>
            </p>
            {/* Period Selector */}
            <div className="flex items-center gap-2 mt-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-[10px] font-bold focus:outline-hidden"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-[10px] font-bold focus:outline-hidden font-mono"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 bg-neutral-50 border border-neutral-200 px-4 py-3 rounded-2xl w-full lg:w-auto">
          <div className="text-right text-xs w-full">
            <p className="text-[9px] text-neutral-450 font-bold uppercase tracking-wider">
              Forecast: <strong className={capacityHealth.percent >= 90 ? 'text-rose-600' : capacityHealth.percent >= 75 ? 'text-amber-600' : 'text-emerald-700'}>{workloadForecast} ({capacityHealth.percent}%)</strong>
            </p>
            <div className="text-neutral-500 font-semibold text-[10px] mt-1 space-y-0.5">
              <p>Capacity: <strong className="text-neutral-800 font-mono">{maxCapacity.toLocaleString()} pts</strong></p>
              <p>Used: <strong className="text-neutral-800 font-mono">{userTotalPoints.toLocaleString()} pts</strong></p>
              <p>Remaining: <strong className="text-neutral-800 font-mono">{remainingCapacity.toLocaleString()} pts</strong></p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl border border-neutral-300 flex items-center justify-center font-bold text-sm text-neutral-900 font-mono bg-white shadow-2xs shrink-0">
            {capacityHealth.percent}%
          </div>
        </div>
      </div>

      {/* ---------------- DEVI (OWNER & EXECUTIVE DASHBOARD) ---------------- */}
      {isOwner && (
        <div className="space-y-6">
          {/* Financials Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-1.5">
              <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-neutral-700" /> Agency Payroll Burn (COGS)
              </p>
              <p className="text-2xl font-bold text-neutral-900 font-mono">{formatRupiah(totalAgencyCOGS)}</p>
              <p className="text-[10px] text-neutral-400">Calculated at Rp250 / Employee Point</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-1.5">
              <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-neutral-700" /> Total Roster Workload
              </p>
              <p className="text-2xl font-bold text-neutral-900 font-mono">{totalAgencyPoints.toLocaleString()} pts</p>
              <p className="text-[10px] text-neutral-400">Total logged workload points</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-1.5">
              <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-neutral-700" /> Pending Approvals
              </p>
              <p className="text-2xl font-bold text-neutral-900 font-mono">{pendingApprovals.length} Items</p>
              <p className="text-[10px] text-amber-700 font-semibold font-mono">Needs Anggi's review</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-1.5">
              <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-neutral-700" /> Today's Attendance
              </p>
              <p className="text-2xl font-bold text-neutral-900 font-mono">{todayAttendances.length} Active</p>
              <p className="text-[10px] text-emerald-700 font-semibold">In office or remote clock-in</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Budgets Overview */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-neutral-700" /> Client Point Budgets Burn
              </h3>
              <div className="space-y-3 text-xs">
                {clients.slice(0, 4).map((c) => {
                  const percent = c.monthlyPointBudget > 0 ? Math.round((c.usedPoint / c.monthlyPointBudget) * 100) : 0;
                  const isOver = c.usedPoint > c.monthlyPointBudget;

                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>{c.name}</span>
                        <span className={isOver ? 'text-red-600 font-bold' : 'text-neutral-700'}>
                          {c.usedPoint} / {c.monthlyPointBudget} pts ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden border border-neutral-200">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, percent)}%`,
                            backgroundColor: isOver ? '#EF4444' : c.clientColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Approval Queue Overview */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neutral-700" /> Approval Queue ({pendingApprovals.length})
                </span>
              </h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {pendingApprovals.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-neutral-900">{task.title}</p>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{task.clientName} • {task.score} pts</p>
                    </div>
                    {task.previewLink && (
                      <a
                        href={task.previewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-200 text-neutral-800 hover:bg-neutral-300 font-semibold flex items-center gap-1"
                      >
                        Review <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
                {pendingApprovals.length === 0 && (
                  <p className="text-xs text-neutral-400 italic text-center py-6">Approval queue is clear.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- STRATEGIST DASHBOARD SECTION ---------------- */}
      {!isOwner && isStrategist && (
        <div className="space-y-6">
          {/* Approval Queue Overview (if Anggi) */}
          {(currentUser?.name === 'Anggi' || currentUser?.id === 'u-anggi') && (
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neutral-700" /> Approval Queue ({pendingApprovals.length})
                </span>
              </h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {pendingApprovals.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-neutral-900">{task.title}</p>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{task.clientName} • {task.score} pts</p>
                    </div>
                    {task.previewLink && (
                      <a
                        href={task.previewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-200 text-neutral-800 hover:bg-neutral-300 font-semibold flex items-center gap-1"
                      >
                        Review <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
                {pendingApprovals.length === 0 && (
                  <p className="text-xs text-neutral-400 italic text-center py-6">Approval queue is clear.</p>
                )}
              </div>
            </div>
          )}

          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-700" /> Strategic Tasks & Content Proposals Queue
            </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {workspaceTasks
              .filter((t) => t.category === 'Strategic' && t.status !== 'Posted')
              .slice(0, 4)
              .map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono">{t.clientName}</span>
                    <h4 className="font-bold text-neutral-900 mt-2">{t.title}</h4>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{t.taskType} ({t.format}) • Deadline: {t.deadline}</p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-neutral-100">
                    <span className="font-semibold text-amber-700">Stage: {t.status}</span>
                    <span className="font-mono font-bold">{t.score} pts</span>
                  </div>
                </div>
              ))}
            {workspaceTasks.filter((t) => t.category === 'Strategic' && t.status !== 'Posted').length === 0 && (
              <p className="col-span-2 text-neutral-400 text-center py-8 italic">No active strategic proposals queued.</p>
            )}
          </div>
        </div>
      </div>
    )}

      {/* ---------------- PRODUCTION ASSISTANT DASHBOARD SECTION ---------------- */}
      {!isOwner && isPA && (
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Video className="w-4 h-4 text-neutral-700" /> Today's Shoots & Production Tasks
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {workspaceTasks
              .filter((t) => t.status === 'Shooting' || t.category === 'Assistant')
              .slice(0, 4)
              .map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono">{t.clientName}</span>
                    <h4 className="font-bold text-neutral-900 mt-2">{t.title}</h4>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{t.taskType} • Deadline: {t.deadline}</p>
                  </div>
                  {t.driveLink && (
                    <a
                      href={t.driveLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-650 hover:underline flex items-center gap-1 text-[10px] font-semibold"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Open Drive Assets
                    </a>
                  )}
                </div>
              ))}
            {workspaceTasks.filter((t) => t.status === 'Shooting' || t.category === 'Assistant').length === 0 && (
              <p className="col-span-2 text-neutral-400 text-center py-8 italic">No active production tasks.</p>
            )}
          </div>
        </div>
      )}

      {/* ---------------- EDITOR DASHBOARD SECTION ---------------- */}
      {!isOwner && isEditor && (
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Video className="w-4 h-4 text-neutral-700" /> Active Editing & Revision Queue
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {workspaceTasks
              .filter((t) => (t.status === 'Editing' || t.status === 'Revision') && t.category === 'Editor')
              .slice(0, 4)
              .map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono">{t.clientName}</span>
                    <h4 className="font-bold text-neutral-900 mt-2">{t.title}</h4>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{t.format} • Status: <strong className="text-amber-700">{t.status}</strong></p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-neutral-100">
                    <span>Deadline: <strong className="text-neutral-700">{t.deadline}</strong></span>
                    <span className="font-mono font-bold">{t.score} pts</span>
                  </div>
                </div>
              ))}
            {workspaceTasks.filter((t) => (t.status === 'Editing' || t.status === 'Revision') && t.category === 'Editor').length === 0 && (
              <p className="col-span-2 text-neutral-400 text-center py-8 italic">No active editing or revisions queued.</p>
            )}
          </div>
        </div>
      )}

      {/* ---------------- SCHEDULER DASHBOARD SECTION ---------------- */}
      {!isOwner && isScheduler && (
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-700" /> Content Ready to Post & Scheduling Calendar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {workspaceTasks
              .filter((t) => t.status === 'Scheduling')
              .slice(0, 4)
              .map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono">{t.clientName}</span>
                    <h4 className="font-bold text-neutral-900 mt-2">{t.title}</h4>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{t.format} • Posting Date: <strong className="text-neutral-700">{t.postingDate || t.deadline}</strong></p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-neutral-100">
                    <span className="font-bold text-purple-700 uppercase font-mono">{t.status}</span>
                    <span className="font-mono font-bold">{t.score} pts</span>
                  </div>
                </div>
              ))}
            {workspaceTasks.filter((t) => t.status === 'Scheduling').length === 0 && (
              <p className="col-span-2 text-neutral-400 text-center py-8 italic">No contents ready to post.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
