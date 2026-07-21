'use client';

import React from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
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
} from 'lucide-react';
import { formatRupiah, getCapacityHealth } from '@/lib/score-calculator';

export default function DynamicDashboardPage() {
  const { currentUser } = useUser();
  const { tasks, worklogs } = useData();

  // Role Checks
  const isOwner = currentUser.roles.includes('Owner') || currentUser.roles.includes('Admin');
  const isStrategist = currentUser.roles.includes('Strategist') && !isOwner;
  const isEditorOnly = currentUser.roles.includes('Editor') && !isOwner && !currentUser.roles.includes('Scheduler');
  const isHybridScheduler = currentUser.roles.includes('Scheduler') && !isOwner;
  const isPAOnly = currentUser.roles.includes('Production Assistant') && !currentUser.roles.includes('Editor') && !isOwner;

  // Filter Tasks for current user
  const userWorklogs = worklogs.filter((w) => w.userName === currentUser.name || w.userId === currentUser.id);
  const userTotalPoints = userWorklogs.reduce((sum, w) => sum + w.score, 0);
  const userCOGS = userTotalPoints * 250;
  const capacityHealth = getCapacityHealth(userTotalPoints, currentUser.monthlyCapacity || 12000);

  // Executive Metrics
  const totalAgencyPoints = worklogs.reduce((sum, w) => sum + w.score, 0);
  const totalAgencyCOGS = totalAgencyPoints * 250;

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Personalized Minimal Greeting Header */}
      <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {currentUser.avatar && currentUser.avatar.trim() !== '' ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-12 h-12 rounded-xl object-cover border border-neutral-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white font-bold text-lg flex items-center justify-center shadow-xs border border-neutral-200">
              {currentUser.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Good Morning, {currentUser.name}
            </h1>
            <p className="text-xs text-neutral-500 font-medium mt-0.5 flex items-center gap-2">
              <span>{currentUser.roles.join(' • ')}</span>
              <span>•</span>
              <span>Workspace Overview</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 px-4 py-2 rounded-xl">
          <div className="text-right">
            <p className="text-[10px] text-neutral-500 font-semibold uppercase">Capacity Health</p>
            <p className="text-xs font-bold font-mono text-neutral-900">{userTotalPoints} / 12,000 pts ({capacityHealth.percent}%)</p>
          </div>
          <div className="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center font-bold text-[10px] text-neutral-900 font-mono bg-white">
            {capacityHealth.percent}%
          </div>
        </div>
      </div>

      {/* ---------------- DEVI (OWNER & EXECUTIVE DASHBOARD) ---------------- */}
      {isOwner && (
        <div className="space-y-6">
          {/* Financials Banner — Monochrome Metric Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-2">
              <p className="text-xs font-medium text-neutral-500 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-neutral-700" /> Production Value (COGS)
              </p>
              <p className="text-2xl font-bold text-neutral-900 font-mono">{formatRupiah(totalAgencyCOGS)}</p>
              <p className="text-[10px] text-neutral-500 font-mono">+24.5% vs last cycle</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-2">
              <p className="text-xs font-medium text-neutral-500 flex items-center gap-2">
                <Award className="w-4 h-4 text-neutral-700" /> Total Points Generated
              </p>
              <p className="text-2xl font-bold text-neutral-900 font-mono">{totalAgencyPoints} pts</p>
              <p className="text-[10px] text-neutral-500 font-mono">6 Master Clients</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-2">
              <p className="text-xs font-medium text-neutral-500 flex items-center gap-2">
                <Zap className="w-4 h-4 text-neutral-700" /> Pending Approvals
              </p>
              <p className="text-2xl font-bold text-neutral-900 font-mono">{tasks.filter((t) => t.status === 'Approval').length} Items</p>
              <p className="text-[10px] text-amber-700 font-mono">Requires Action</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-2">
              <p className="text-xs font-medium text-neutral-500 flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-700" /> Active Roster
              </p>
              <p className="text-2xl font-bold text-neutral-900 font-mono">6 Employees</p>
              <p className="text-[10px] text-emerald-700 font-mono">100% Attendance</p>
            </div>
          </div>

          {/* Executive Approval Queue Table */}
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neutral-700" /> Owner Approval Queue ({tasks.filter((t) => t.status === 'Approval').length})
              </span>
            </h3>

            <div className="space-y-2.5">
              {tasks
                .filter((t) => t.status === 'Approval')
                .map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-neutral-900">{task.title}</p>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{task.clientName || 'Samazama Japan'} • {task.format} • {task.score} pts</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {task.previewLink && (
                        <a
                          href={task.previewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-neutral-200 text-neutral-800 hover:bg-neutral-300 font-semibold flex items-center gap-1"
                        >
                          Preview <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-semibold shadow-xs">
                        Approve Task
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ANGGI / GIGIE (STRATEGIST DASHBOARD) ---------------- */}
      {isStrategist && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Today's Brief & Proposals */}
            <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-700" /> Content Proposals & Strategic Briefs
              </h3>

              <div className="space-y-2 text-xs">
                {tasks
                  .filter((t) => t.status === 'Brief' || t.status === 'Content Proposal' || t.category === 'Strategic')
                  .slice(0, 5)
                  .map((t) => (
                    <div key={t.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-neutral-900">{t.title}</p>
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{t.category} • Deadline: {t.deadline}</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-200 text-neutral-800">
                        {t.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Strategist Output */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-neutral-700" /> Strategic Output
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <p className="text-neutral-500">Content Plans Created</p>
                  <p className="text-xl font-bold text-neutral-900 font-mono">8 Proposals</p>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <p className="text-neutral-500">Client Approval Success Rate</p>
                  <p className="text-xl font-bold text-emerald-700 font-mono">98.2%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- JABIN (EDITOR DASHBOARD) ---------------- */}
      {isEditorOnly && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Editing Queue */}
            <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-neutral-700" /> Active Editing Queue
                </span>
                <span className="text-xs font-mono text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
                  {userWorklogs.length} Tasks Logged
                </span>
              </h3>

              <div className="space-y-2 text-xs">
                {userWorklogs.slice(0, 6).map((w) => (
                  <div key={w.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900">{w.contentTitle}</p>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{w.clientName} • {w.format} • {w.score} pts</p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        w.status === 'Posted'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Jabin's Performance */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-neutral-700" /> Editor Performance
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <p className="text-neutral-500 font-medium">Points Earned This Month</p>
                  <p className="text-2xl font-bold text-neutral-900 font-mono">{userTotalPoints} pts</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <p className="text-neutral-500 font-medium">COGS Contribution</p>
                  <p className="text-xl font-bold text-emerald-700 font-mono">{formatRupiah(userCOGS)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- DINDONG (HYBRID EDITOR/SCHEDULER DASHBOARD) ---------------- */}
      {isHybridScheduler && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-700" /> Scheduling & Posting Queue
              </h3>

              <div className="space-y-2 text-xs">
                {tasks
                  .filter((t) => t.status === 'Scheduling' || t.category === 'Scheduler')
                  .slice(0, 5)
                  .map((t) => (
                    <div key={t.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-neutral-900">{t.title}</p>
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{t.clientName} • Posting: {t.postingDate}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                        Ready to Schedule
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-neutral-700" /> Editing Tasks Assigned
              </h3>

              <div className="space-y-2 text-xs">
                {userWorklogs.slice(0, 5).map((w) => (
                  <div key={w.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900">{w.contentTitle}</p>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{w.clientName} • {w.score} pts</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800">
                      {w.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PRISKA (PRODUCTION ASSISTANT DASHBOARD) ---------------- */}
      {isPAOnly && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-neutral-700" /> Production & Shoot Schedule
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <p className="font-bold text-neutral-900">BE Citra 8 Shoot</p>
                <p className="text-[11px] text-neutral-500">Location: Citra 8 Ruko Outlet</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">Equipment Checked</span>
              </div>
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <p className="font-bold text-neutral-900">Karihome Campaign Shoot</p>
                <p className="text-[11px] text-neutral-500">Location: Studio BSD</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Crew Confirmed</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
