'use client';

import React from 'react';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useUser } from '@/context/UserContext';
import { Video, Calendar, MapPin, Users, CheckSquare } from 'lucide-react';

export default function ProductionPage() {
  const { tasks } = useData();
  const { currentWorkspace } = useWorkspace();
  const { currentUser } = useUser();

  const shootingTasks = tasks.filter((t) => {
    if (t.isArchived) return false;
    if (t.workspaceId !== currentWorkspace?.id) return false;

    // Filter by status/category
    const isProductionTask = 
      t.status === 'Production' || 
      t.status === 'Shooting' || 
      t.category === 'Production' || 
      t.taskType?.includes('Production') ||
      (t.stages && (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages).some((s: any) => s.role === 'Production Assistant' || s.taskType?.includes('Production')));

    if (!isProductionTask) return false;

    // Role-based visibility: Admin/Owner sees everything.
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

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Production & Shooting Schedule <span className="text-xs font-mono bg-purple-50 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">On-Site & Studio</span>
          </h1>
          <p className="text-xs text-neutral-500">On-site shoot sessions, camera gear allocation, and production lead assignments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shootingTasks.map((t) => (
          <div key={t.id} className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                  {t.clientName}
                </span>
                <h3 className="text-base font-bold text-neutral-900 mt-2">{t.title}</h3>
                <p className="text-xs text-neutral-500">{t.description}</p>
              </div>

              <span className="text-xs font-mono font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                {t.score} pts
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-mono">
              <div>
                <span className="text-neutral-500">Date:</span>
                <p className="font-semibold text-neutral-900">{t.deadline}</p>
              </div>
              <div>
                <span className="text-neutral-500">Format:</span>
                <p className="font-semibold text-neutral-900">{t.format}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
