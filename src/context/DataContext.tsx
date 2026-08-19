'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useUser } from './UserContext';
import { useToast } from './ToastContext';
import { useWorkspace } from './WorkspaceContext';
import {
  TaskItem,
  ClientItem,
  WorklogItem,
  AttendanceItem,
  LeaveRequestItem,
  ClientMonthlyBudgetItem,
  MasterScoreItem,
  ActivityLogItem,
} from '@/lib/types';
import { MASTER_SCORES_STATIC, calculateCOGS, calculatePriority } from '@/lib/score-calculator';
import { getStatusLabel, getDbStatus, normalizeStatusForPipeline, isStrategicPipeline } from '@/lib/status';

interface DataContextType {
  tasks: TaskItem[];
  clients: ClientItem[];
  worklogs: WorklogItem[];
  attendances: AttendanceItem[];
  leaveRequests: LeaveRequestItem[];
  budgets: ClientMonthlyBudgetItem[];
  setBudgets: React.Dispatch<React.SetStateAction<ClientMonthlyBudgetItem[]>>;
  masterScores: MasterScoreItem[];
  activities: ActivityLogItem[];
  notifications: any[];
  addNotification: (notif: { userId: string; type: string; title: string; message: string; link?: string }) => Promise<void>;
  companySettings: any;
  updateCompanySettings: (updates: any) => Promise<void>;
  loading: boolean;
  addTask: (task: Partial<TaskItem>) => Promise<TaskItem>;
  updateTaskStatus: (taskId: string, newStatus: TaskItem['status']) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  deleteTask: (taskId: string) => void;
  addWorklog: (log: Partial<WorklogItem>) => Promise<void>;
  updateWorklog: (log: WorklogItem) => Promise<void>;
  deleteWorklog: (worklogId: string) => Promise<void>;
  importWorklogs: (logs: Partial<WorklogItem>[]) => void;
  clockIn: (userId: string, locationMode: 'OFFICE' | 'REMOTE' | 'GPS') => Promise<{ success: boolean; reused?: boolean; error?: string }>;
  clockOut: (userId: string) => Promise<{ success: boolean; error?: string }>;
  submitLeave: (leave: Partial<LeaveRequestItem>) => void;
  approveLeave: (leaveId: string, approvedByUserId: string) => void;
  approveTask: (taskId: string, nextStage: string, reviewerId: string, notes?: string) => void;
  addActivity: (userId: string, entityType: string, entityId: string, action: string, details: string) => void;
  saveClientBudget: (clientId: string, month: string, budget: number) => Promise<any>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [rawTasks, setTasks] = useState<TaskItem[]>([]);
  const [rawClients, setClients] = useState<ClientItem[]>([]);
  const [rawWorklogs, setWorklogs] = useState<WorklogItem[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [rawBudgets, setBudgets] = useState<ClientMonthlyBudgetItem[]>([]);
  const [masterScores, setMasterScores] = useState<MasterScoreItem[]>([]);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { syncUsers, currentUser } = useUser();
  const { showToast } = useToast();
  const { currentWorkspace } = useWorkspace();

  const clients = useMemo(() => {
    return rawClients.filter((c) => c.workspaceId === currentWorkspace.id);
  }, [rawClients, currentWorkspace.id]);

  const tasks = useMemo(() => {
    return rawTasks.filter((t) => t.workspaceId === currentWorkspace.id);
  }, [rawTasks, currentWorkspace.id]);

  const worklogs = useMemo(() => {
    return rawWorklogs.filter((w) => {
      if ((w as any).workspaceId) {
        return (w as any).workspaceId === currentWorkspace.id;
      }
      const matchedClient = rawClients.find((c) => c.id === w.clientId);
      return matchedClient?.workspaceId === currentWorkspace.id;
    });
  }, [rawWorklogs, rawClients, currentWorkspace.id]);

  const budgets = useMemo(() => {
    const clientIdsOfWorkspace = new Set(clients.map((c) => c.id));
    return rawBudgets.filter((b) => clientIdsOfWorkspace.has(b.clientId));
  }, [rawBudgets, clients]);

  const normalizeTask = (t: TaskItem): TaskItem => {
    const matchedClient = rawClients.find((c) => c.id === t.clientId);
    return {
      ...t,
      clientName: t.clientName || matchedClient?.name || 'Unknown Client',
      clientColor: t.clientColor || matchedClient?.clientColor || '#3B82F6',
      status: normalizeStatusForPipeline(t.status, t.category, t.taskType) as any,
    };
  };

  const normalizeWorklog = (w: WorklogItem): WorklogItem => ({
    ...w,
    status: normalizeStatusForPipeline(w.status, (w as any).category, w.taskType),
  });

  const fetchInitialData = async () => {
    try {
      const headers: HeadersInit = {};
      if (currentUser) {
        headers['X-User-Id'] = currentUser.id;
        headers['X-User-Role'] = currentUser.roles.join(',');
      }
      const res = await fetch('/api/data', { headers });
      if (res.ok) {
        const json = await res.json();
        syncUsers(json.users || []);
        setTasks((json.tasks || []).map(normalizeTask));
        setClients(json.clients || []);
        setWorklogs((json.worklogs || []).map(normalizeWorklog));
        setAttendances(json.attendances || []);
        setLeaveRequests(json.leaveRequests || []);
        setBudgets(json.budgets || []);
        setMasterScores(json.masterScores || []);
        setActivities(json.activities || []);
        setNotifications(json.notifications || []);
        setCompanySettings(json.companySettings || null);
      }
    } catch (e) {
      console.error('Failed to fetch data from API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [currentUser?.id]);

  const getTaskScore = (t: Partial<TaskItem>) => {
    if (t.stages && Array.isArray(t.stages) && t.stages.length > 0) {
      return t.stages.reduce((sum: number, s: any) => sum + (Number(s.score) || 0), 0);
    }
    return Number(t.score) || 10;
  };

  const addTask = async (newTaskData: Partial<TaskItem>): Promise<TaskItem> => {
    const score = getTaskScore(newTaskData);
    const cogs = calculateCOGS(score);
    const clientObj = clients.find((c) => c.id === newTaskData.clientId) || clients[0];

    const postingDateVal = newTaskData.postingDate || new Date().toISOString().split('T')[0];
    const dateObj = new Date(postingDateVal);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const detectedMonth = !isNaN(dateObj.getTime()) ? monthNames[dateObj.getMonth()] : 'July';
    const detectedYear = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : 2026;

    const deadlineVal = newTaskData.deadline || new Date().toISOString().split('T')[0];
    const computedPriority = calculatePriority(deadlineVal, newTaskData.status || 'Brief', postingDateVal);

    const created: TaskItem = {
      id: `task-${Date.now()}`,
      clientId: newTaskData.clientId || clientObj?.id || 'client-1',
      clientName: newTaskData.clientName || clientObj?.name || 'Baking Empire Gading Serpong',
      clientColor: newTaskData.clientColor || clientObj?.clientColor || '#3B82F6',
      workspaceId: newTaskData.workspaceId || clientObj?.workspaceId || currentWorkspace.id,
      title: newTaskData.title || 'Untitled Task',
      description: newTaskData.description || '',
      category: newTaskData.category || 'Editor',
      taskType: newTaskData.taskType || 'Editing',
      format: newTaskData.format || 'Reels',
      qty: newTaskData.qty || 1,
      priority: computedPriority,
      postingDate: newTaskData.postingDate || null,
      deadline: deadlineVal,
      status: newTaskData.status || 'Brief',
      assignedUserIds: newTaskData.assignedUserIds || [],
      score,
      cogs,
      driveLink: newTaskData.driveLink || '',
      previewLink: newTaskData.previewLink || '',
      checklist: newTaskData.checklist || [],
      comments: newTaskData.comments || [],
      stages: newTaskData.stages || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      month: newTaskData.month || detectedMonth,
      year: newTaskData.year || detectedYear,
      contentId: newTaskData.contentId || `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isArchived: newTaskData.isArchived || false,
    } as any;

    // Sync to backend first (Source of Truth)
    if (currentUser) {
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUser.id,
            'X-User-Role': currentUser.roles.join(','),
          },
          body: JSON.stringify(created),
        });
        if (res.ok) {
          const saved = await res.json();
          setTasks((prev) => [normalizeTask(saved), ...prev]);
          await fetchInitialData();
          return saved;
        }
      } catch (err) {
        console.error(err);
      }
    }

    setTasks((prev) => [normalizeTask(created), ...prev]);
    return created;
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskItem['status']) => {
    const oldTask = tasks.find((t) => t.id === taskId);

    // Optimistic local state update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? normalizeTask({ ...t, status: newStatus, updatedAt: new Date().toISOString() }) : t))
    );
    addActivity(currentUser?.id || 'u-system', 'TASK', taskId, 'MOVED', `Moved task to stage ${newStatus}`);

    if (currentUser) {
      try {
        const res = await fetch(`/api/tasks?id=${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUser.id,
            'X-User-Role': currentUser.roles.join(','),
          },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          const saved = await res.json();
          setTasks((prev) => prev.map((t) => (t.id === taskId ? normalizeTask(saved) : t)));

          if (oldTask && oldTask.category === 'Strategic' && newStatus === 'Production') {
            showToast('Task successfully handed over to the Production Board!', 'success');
          } else {
            showToast(`Task status updated to ${newStatus}`, 'success');
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Failed to update task status. Reverting...', 'error');
          await fetchInitialData();
        }
      } catch (err) {
        console.error(err);
        showToast('Connection error. Reverting task status...', 'error');
        await fetchInitialData();
      }
    }
  };

  const updateTask = async (taskId: string, updates: Partial<TaskItem>) => {
    const oldTask = tasks.find((t) => t.id === taskId);
    if (!oldTask) return;
    
    const postingDateVal = updates.postingDate !== undefined ? updates.postingDate : oldTask.postingDate;
    const deadlineVal = updates.deadline !== undefined ? updates.deadline : oldTask.deadline;
    const statusVal = updates.status !== undefined ? updates.status : oldTask.status;

    if (updates.deadline !== undefined || updates.postingDate !== undefined || updates.status !== undefined) {
      updates.priority = calculatePriority(deadlineVal, statusVal as any, postingDateVal);
    }

    if (updates.postingDate !== undefined) {
      const dateObj = new Date(updates.postingDate || '');
      if (!isNaN(dateObj.getTime())) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        if (updates.month === undefined) updates.month = monthNames[dateObj.getMonth()];
        if (updates.year === undefined) updates.year = dateObj.getFullYear();
      }
    }

    const computedScore = updates.stages
      ? getTaskScore({ ...oldTask, ...updates })
      : (updates.score !== undefined ? updates.score : oldTask.score);

    const updatedTaskData = {
      ...updates,
      score: computedScore,
      cogs: calculateCOGS(computedScore),
    };

    // Optimistic local state update first so UI updates immediately
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? normalizeTask({ ...t, ...updatedTaskData, updatedAt: new Date().toISOString() }) : t))
    );

    // If there is a matching worklog, update it in local state and sync to DB
    const contentIdVal = updates.contentId || oldTask.contentId;
    if (contentIdVal) {
      const matchingWorklogs = worklogs.filter((w) => w.contentId === contentIdVal);
      if (matchingWorklogs.length > 0) {
        setWorklogs((prev) =>
          prev.map((w) =>
            w.contentId === contentIdVal
              ? normalizeWorklog({
                  ...w,
                  contentTitle: updatedTaskData.title || w.contentTitle,
                  clientId: updatedTaskData.clientId || w.clientId,
                  clientName: updatedTaskData.clientName || w.clientName,
                  score: updatedTaskData.score,
                  taskType: updatedTaskData.taskType || w.taskType,
                  format: updatedTaskData.format || w.format,
                  stages: updatedTaskData.stages || w.stages,
                  date: updatedTaskData.postingDate || w.date,
                })
              : w
          )
        );

        // Sync matching worklogs in database
        for (const mw of matchingWorklogs) {
          try {
            const wlHeaders: HeadersInit = { 'Content-Type': 'application/json' };
            if (currentUser) {
              wlHeaders['X-User-Id'] = currentUser.id;
              wlHeaders['X-User-Role'] = currentUser.roles.join(',');
            }
            await fetch('/api/worklogs', {
              method: 'POST',
              headers: wlHeaders,
              body: JSON.stringify({
                ...mw,
                contentTitle: updatedTaskData.title || mw.contentTitle,
                clientId: updatedTaskData.clientId || mw.clientId,
                clientName: updatedTaskData.clientName || mw.clientName,
                score: updatedTaskData.score,
                taskType: updatedTaskData.taskType || mw.taskType,
                format: updatedTaskData.format || mw.format,
                stages: updatedTaskData.stages || mw.stages,
                date: updatedTaskData.postingDate || mw.date,
              }),
            });
          } catch (err) {
            console.error('Failed to sync matching worklog on task update:', err);
          }
        }
      }
    }

    if (currentUser) {
      try {
        const res = await fetch(`/api/tasks?id=${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUser.id,
            'X-User-Role': currentUser.roles.join(','),
          },
          body: JSON.stringify(updatedTaskData),
        });
        if (res.ok) {
          const saved = await res.json();
          setTasks((prev) => prev.map((t) => (t.id === taskId ? normalizeTask(saved) : t)));
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Failed to save changes. Reverting...', 'error');
          await fetchInitialData();
        }
      } catch (err) {
        console.error(err);
        showToast('Connection error. Reverting changes...', 'error');
        await fetchInitialData();
      }
    }
  };

  const deleteTask = (taskId: string) => {
    const oldTask = tasks.find((t) => t.id === taskId);
    if (oldTask) {
      const score = oldTask.score || 0;
      setClients((prev) =>
        prev.map((c) =>
          c.id === oldTask.clientId
            ? {
                ...c,
                usedPoint: c.usedPoint - score,
                remainingPoint: c.monthlyPointBudget - (c.usedPoint - score),
              }
            : c
        )
      );
    }

    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    if (currentUser) {
      fetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.roles.join(','),
        },
      }).catch(console.error);
    }
  };

  const addWorklog = async (log: Partial<WorklogItem>) => {
    const score = log.score || 10;
    const clientObj = clients.find((c) => c.id === log.clientId) || clients[0];

    const dateVal = log.date || new Date().toISOString();
    const dateObj = new Date(dateVal);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const detectedMonth = !isNaN(dateObj.getTime()) ? monthNames[dateObj.getMonth()] : 'July';
    const detectedYear = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : 2026;

    const item: WorklogItem = {
      id: `wl-${Date.now()}-${Math.random()}`,
      date: dateVal,
      userId: log.userId || currentUser?.id || 'u-anggi',
      userName: log.userName || currentUser?.name || 'Anggi',
      clientId: log.clientId || clientObj?.id || '',
      clientName: log.clientName || clientObj?.name || 'Baking Empire Gading Serpong',
      contentTitle: log.contentTitle || 'Untitled Content',
      taskType: log.taskType || 'Editing',
      format: log.format || 'Single Foto',
      qty: log.qty || 1,
      score,
      cogs: calculateCOGS(score),
      status: normalizeStatusForPipeline(
        log.status || (isStrategicPipeline((log as any).category, log.taskType) ? 'Completed' : 'Posted'),
        (log as any).category,
        log.taskType
      ),
      source: log.source || 'Manual',
      previewLink: log.previewLink || '',
      stages: log.stages || null,
      month: log.month || detectedMonth,
      year: log.year ? Number(log.year) : detectedYear,
      contentId: log.contentId || `content-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      isArchived: log.isArchived || false,
    };

    setWorklogs((prev) => [normalizeWorklog(item), ...prev]);

    const parsedStages = item.stages ? (typeof item.stages === 'string' ? JSON.parse(item.stages) : item.stages) : [];
    const assignedStageIds = parsedStages.map((s: any) => s.userId).filter(Boolean);
    const assignedUserIds = Array.from(new Set([...(assignedStageIds || []), item.userId].filter(Boolean)));

    const matchedClient = rawClients.find((c) => c.id === item.clientId);
    const targetWorkspaceId = matchedClient?.workspaceId || currentWorkspace.id;
    const existingTask = rawTasks.find((t) => t.contentId === item.contentId && item.contentId);

    const mergedAssignedUserIds = existingTask
      ? Array.from(new Set([...(typeof existingTask.assignedUserIds === 'string' ? JSON.parse(existingTask.assignedUserIds) : existingTask.assignedUserIds || []), ...assignedUserIds]))
      : assignedUserIds;

    const existingStages = existingTask
      ? (existingTask.stages ? (typeof existingTask.stages === 'string' ? JSON.parse(existingTask.stages) : existingTask.stages) : [])
      : [];
    const mergedStages = [...existingStages];
    for (const stage of parsedStages) {
      if (!mergedStages.some((s: any) => s.id === stage.id || (s.userId === stage.userId && s.role === stage.role && s.taskType === stage.taskType))) {
        mergedStages.push(stage);
      }
    }

    const isStrategic = isStrategicPipeline(undefined, item.taskType);
    const targetCategory = isStrategic ? 'Strategic' : (item.taskType === 'Scheduling' ? 'Scheduler' : 'Editor');
    let taskStatus = normalizeStatusForPipeline(item.status || (isStrategic ? 'Completed' : 'Posted'), targetCategory, item.taskType);

    const newTask: TaskItem = {
      id: existingTask ? existingTask.id : `task-${item.id}`,
      title: item.contentTitle,
      description: 'Automatically synchronized task from manual worklog.',
      category: targetCategory,
      taskType: item.taskType,
      format: item.format,
      qty: item.qty,
      priority: 'Low',
      status: taskStatus as any,
      clientId: item.clientId,
      workspaceId: targetWorkspaceId,
      postingDate: item.date,
      deadline: item.date,
      assignedUserIds: mergedAssignedUserIds,
      score: item.score,
      cogs: item.cogs,
      driveLink: item.previewLink || '',
      previewLink: taskStatus === 'Posted' ? (item.previewLink || '') : '',
      checklist: [],
      comments: [],
      stages: mergedStages,
      month: item.month,
      year: item.year,
      contentId: item.contentId,
      isArchived: item.isArchived,
      createdAt: existingTask ? existingTask.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingTask) {
      setTasks((prev) => prev.map((t) => (t.contentId === item.contentId ? normalizeTask(newTask) : t)));
    } else {
      setTasks((prev) => [normalizeTask(newTask), ...prev]);
    }

    if (item.clientId || item.clientName) {
      setClients((prev) =>
        prev.map((c) => {
          if (c.id === item.clientId || c.name === item.clientName) {
            const newUsed = c.usedPoint + item.score;
            return {
              ...c,
              usedPoint: newUsed,
              remainingPoint: c.monthlyPointBudget - newUsed,
            };
          }
          return c;
        })
      );
    }

    try {
      const wlHeaders: HeadersInit = { 'Content-Type': 'application/json' };
      if (currentUser) {
        wlHeaders['X-User-Id'] = currentUser.id;
        wlHeaders['X-User-Role'] = currentUser.roles.join(',');
      }
      await fetch('/api/worklogs', {
        method: 'POST',
        headers: wlHeaders,
        body: JSON.stringify(item),
      });

      await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || 'u-system',
          'X-User-Role': currentUser?.roles.join(',') || '',
        },
        body: JSON.stringify(newTask),
      });
    } catch (e) {
      console.error('Failed to sync manual worklog and task to database:', e);
    }
  };

  const updateWorklog = async (updatedItem: WorklogItem) => {
    // Optimistic local state updates for immediate UI reaction
    setWorklogs((prev) => prev.map((w) => (w.id === updatedItem.id ? normalizeWorklog(updatedItem) : w)));
    const updatedAssignedIds = updatedItem.stages
      ? Array.from(new Set([
          ...(Array.isArray(updatedItem.stages) ? updatedItem.stages.map((s: any) => s.userId).filter(Boolean) : []),
          updatedItem.userId,
        ].filter(Boolean)))
      : updatedItem.userId
      ? [updatedItem.userId]
      : undefined;

    const cleanTaskId = updatedItem.id.startsWith('worklog-task-')
      ? updatedItem.id.replace(/^worklog-task-/, '')
      : updatedItem.id;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === cleanTaskId || t.id === `task-${cleanTaskId}` || (updatedItem.contentId && t.contentId === updatedItem.contentId)
          ? normalizeTask({
              ...t,
              title: updatedItem.contentTitle,
              clientId: updatedItem.clientId,
              clientName: updatedItem.clientName,
              score: updatedItem.score,
              taskType: updatedItem.taskType,
              format: updatedItem.format,
              stages: updatedItem.stages,
              assignedUserIds: updatedAssignedIds !== undefined ? updatedAssignedIds : t.assignedUserIds,
              status: updatedItem.status === 'In Progress' ? 'Editing' : (updatedItem.status as any),
              postingDate: updatedItem.date,
              deadline: updatedItem.date,
            })
          : t
      )
    );

    try {
      const isVirtual = updatedItem.id.startsWith('worklog-task-');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (currentUser) {
        headers['X-User-Id'] = currentUser.id;
        headers['X-User-Role'] = currentUser.roles.join(',');
      }

      let res;
      if (isVirtual) {
        res = await fetch('/api/worklogs', {
          method: 'POST',
          headers,
          body: JSON.stringify(updatedItem),
        });
      } else {
        res = await fetch(`/api/worklogs?id=${updatedItem.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updatedItem),
        });
      }

      if (res.ok) {
        await fetchInitialData();
      }
    } catch (e) {
      console.error('Failed to sync updated worklog:', e);
    }
  };

  const deleteWorklog = async (worklogId: string) => {
    const cleanId = worklogId.replace(/^worklog-task-/, '');

    const targetWl = worklogs.find((w) => w.id === worklogId || w.id === cleanId || w.contentId === worklogId || w.contentId === cleanId);
    const targetScore = targetWl?.score || 0;
    const targetClientId = targetWl?.clientId;
    const targetClientName = targetWl?.clientName;
    const targetContentId = targetWl?.contentId;

    const matchingTaskIds = new Set<string>();
    if (targetContentId) {
      tasks.forEach((t) => {
        if (t.contentId === targetContentId) matchingTaskIds.add(t.id);
      });
    }
    if (cleanId) {
      matchingTaskIds.add(cleanId);
    }

    if (targetScore > 0 && (targetClientId || targetClientName)) {
      setClients((prev) =>
        prev.map((c) => {
          if (c.id === targetClientId || c.name === targetClientName) {
            const newUsed = Math.max(0, c.usedPoint - targetScore);
            return {
              ...c,
              usedPoint: newUsed,
              remainingPoint: c.monthlyPointBudget - newUsed,
            };
          }
          return c;
        })
      );
    }

    setWorklogs((prev) =>
      prev.filter(
        (w) =>
          w.id !== worklogId &&
          w.id !== cleanId &&
          (w.contentId ? w.contentId !== worklogId && w.contentId !== cleanId && w.contentId !== targetContentId : true)
      )
    );

    setTasks((prev) =>
      prev.filter((t) => {
        if (matchingTaskIds.has(t.id)) return false;
        if (targetContentId && t.contentId === targetContentId) return false;
        return t.id !== worklogId && t.id !== cleanId && (t.contentId ? t.contentId !== worklogId && t.contentId !== cleanId : true);
      })
    );

    try {
      const requests = [];
      const headers: HeadersInit = {};
      if (currentUser) {
        headers['X-User-Id'] = currentUser.id;
        headers['X-User-Role'] = currentUser.roles.join(',');
      }

      if (!worklogId.startsWith('worklog-task-')) {
        requests.push(
          fetch(`/api/worklogs?id=${cleanId}`, {
            method: 'DELETE',
            headers,
          })
        );
      }
      matchingTaskIds.forEach((taskId) => {
        requests.push(
          fetch(`/api/tasks?id=${taskId}`, {
            method: 'DELETE',
            headers,
          })
        );
      });
      const responses = await Promise.all(requests);

      let hasError = false;
      for (const res of responses) {
        if (!res.ok) {
          hasError = true;
          const errText = await res.text();
          console.error('Failed to delete resource on server:', errText);
        }
      }
      if (hasError) {
        showToast('Gagal menghapus beberapa item di server', 'error');
        await fetchInitialData();
      }
    } catch (e) {
      console.error('Failed to delete worklog:', e);
      showToast('Gagal menghapus worklog', 'error');
      await fetchInitialData();
    }
  };

  const importWorklogs = async (newLogs: Partial<WorklogItem>[]) => {
    const formatted: WorklogItem[] = newLogs.map((log, i) => {
      const score = log.score || 10;
      const dateVal = log.date || new Date().toISOString();
      const dateObj = new Date(dateVal);
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const detectedMonth = !isNaN(dateObj.getTime()) ? monthNames[dateObj.getMonth()] : 'August';
      const detectedYear = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : 2026;

      const matchedClient = rawClients.find((c) => c.id === log.clientId || c.name.toLowerCase() === log.clientName?.toLowerCase());
      const defaultClientOfWorkspace = rawClients.find((c) => c.workspaceId === currentWorkspace.id);

      const defaultStageRole = log.taskType === 'Content Plan' ? 'Strategist' : log.taskType === 'Scheduling' ? 'Scheduler' : 'Editor';
      const fallbackStage = [
        {
          id: `stage-import-${Date.now()}-${i}`,
          role: defaultStageRole as any,
          userId: log.userId || currentUser?.id || 'u-devi',
          userName: log.userName || currentUser?.name || 'Devi',
          taskType: log.taskType || 'Editing',
          format: log.format || 'Single Foto',
          qty: log.qty || 1,
          score,
        },
      ];

      const uniqueSuffix = `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`;

      return {
        id: log.id || `import-${uniqueSuffix}`,
        date: dateVal,
        userId: log.userId || currentUser?.id || 'u-devi',
        userName: log.userName || currentUser?.name || 'Devi',
        clientId: log.clientId || matchedClient?.id || defaultClientOfWorkspace?.id || rawClients[0]?.id || '',
        clientName: log.clientName || matchedClient?.name || defaultClientOfWorkspace?.name || 'Baking Empire Gading Serpong',
        contentTitle: log.contentTitle || 'Imported Task',
        taskType: log.taskType || 'Editing',
        format: log.format || 'Single Foto',
        qty: log.qty || 1,
        score,
        cogs: log.cogs || calculateCOGS(score),
        status: normalizeStatusForPipeline(
          log.status || (isStrategicPipeline((log as any).category, log.taskType) ? 'Completed' : 'Posted'),
          (log as any).category,
          log.taskType
        ),
        source: log.source || 'Imported',
        previewLink: log.previewLink || '',
        stages: log.stages || fallbackStage,
        month: log.month || detectedMonth,
        year: log.year ? Number(log.year) : detectedYear,
        contentId: log.contentId || `content-import-${uniqueSuffix}`,
        isArchived: log.isArchived || false,
      };
    });

    const formattedTasks: TaskItem[] = formatted.map((item) => {
      const parsedStages = item.stages ? (typeof item.stages === 'string' ? JSON.parse(item.stages) : item.stages) : [];
      const assignedUserIds = parsedStages.map((s: any) => s.userId).filter(Boolean);
      const matchedClientForTask = rawClients.find((c) => c.id === item.clientId);
      const targetWorkspaceId = matchedClientForTask?.workspaceId || currentWorkspace.id;
      const categoryVal = isStrategicPipeline(undefined, item.taskType) ? 'Strategic' : (item.taskType === 'Scheduling' ? 'Scheduler' : 'Editor');

      return {
        id: `task-${item.id}`,
        title: item.contentTitle,
        description: 'Automatically synchronized task from imported worklog.',
        category: categoryVal,
        taskType: item.taskType,
        format: item.format,
        qty: item.qty,
        priority: 'Low',
        status: normalizeStatusForPipeline(item.status, categoryVal, item.taskType) as any,
        clientId: item.clientId,
        workspaceId: targetWorkspaceId,
        postingDate: item.date,
        deadline: item.date,
        assignedUserIds: assignedUserIds,
        score: item.score,
        cogs: item.cogs,
        driveLink: item.previewLink || '',
        previewLink: (item.status === 'Posted' || item.status === 'Completed') ? (item.previewLink || '') : '',
        checklist: [],
        comments: [],
        stages: parsedStages,
        month: item.month,
        year: item.year,
        contentId: item.contentId,
        isArchived: item.isArchived,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    setWorklogs((prev) => [...formatted.map(normalizeWorklog), ...prev]);
    setTasks((prev) => [...formattedTasks.map(normalizeTask), ...prev]);

    setClients((prev) => {
      const clientAddedPoints: Record<string, number> = {};
      for (const item of formatted) {
        const key = item.clientId || item.clientName;
        if (key) {
          clientAddedPoints[key] = (clientAddedPoints[key] || 0) + (item.score || 0);
        }
      }
      return prev.map((c) => {
        const added = clientAddedPoints[c.id] || clientAddedPoints[c.name] || 0;
        if (added > 0) {
          const newUsed = c.usedPoint + added;
          return {
            ...c,
            usedPoint: newUsed,
            remainingPoint: c.monthlyPointBudget - newUsed,
          };
        }
        return c;
      });
    });

    for (let j = 0; j < formatted.length; j++) {
      const log = formatted[j];
      const tsk = formattedTasks[j];
      try {
        const wlHeaders: HeadersInit = { 'Content-Type': 'application/json' };
        if (currentUser) {
          wlHeaders['X-User-Id'] = currentUser.id;
          wlHeaders['X-User-Role'] = currentUser.roles.join(',');
        }
        await fetch('/api/worklogs', {
          method: 'POST',
          headers: wlHeaders,
          body: JSON.stringify(log),
        });

        await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUser?.id || 'u-system',
            'X-User-Role': currentUser?.roles.join(',') || '',
          },
          body: JSON.stringify(tsk),
        });
      } catch (err) {
        console.error('Failed to save imported worklog/task:', err);
      }
    }
  };

  const clockIn = async (userId: string, locationMode: 'OFFICE' | 'REMOTE' | 'GPS'): Promise<{ success: boolean; reused?: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, locationMode }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.attendance) {
        const saved = data.attendance;
        setAttendances((prev) => {
          const withoutDup = prev.filter((a) => a.id !== saved.id);
          return [saved, ...withoutDup];
        });
        if (data.reused) {
          showToast('Sudah Clock In hari ini. Sesi dilanjutkan.', 'success');
        } else {
          showToast('Clock In successful!', 'success');
        }
        return { success: true, reused: !!data.reused };
      } else {
        showToast(data.error || 'Failed to Clock In', 'error');
        return { success: false, error: data.error || 'Failed to Clock In' };
      }
    } catch (e) {
      console.error('Error clocking in:', e);
      showToast('Connection error. Failed to Clock In.', 'error');
      return { success: false, error: 'Connection error' };
    }
  };

  const clockOut = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.attendance) {
        const saved = data.attendance;
        setAttendances((prev) =>
          prev.map((a) => (a.id === saved.id ? saved : a))
        );
        showToast('Clock Out successful!', 'success');
        return { success: true };
      } else {
        showToast(data.error || 'Failed to Clock Out', 'error');
        return { success: false, error: data.error || 'Failed to Clock Out' };
      }
    } catch (e) {
      console.error('Error clocking out:', e);
      showToast('Connection error. Failed to Clock Out.', 'error');
      return { success: false, error: 'Connection error' };
    }
  };

  const submitLeave = async (leave: Partial<LeaveRequestItem>) => {
    const item: LeaveRequestItem = {
      id: `leave-${Date.now()}`,
      userId: leave.userId || currentUser?.id || 'u-priska',
      userName: leave.userName || currentUser?.name || 'Priska',
      startDate: leave.startDate || new Date().toISOString().split('T')[0],
      endDate: leave.endDate || new Date().toISOString().split('T')[0],
      reason: leave.reason || 'Personal leave',
      type: leave.type || 'ANNUAL',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    setLeaveRequests((prev) => [item, ...prev]);

    try {
      const res = await fetch('/api/leave-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        const saved = await res.json();
        setLeaveRequests((prev) =>
          prev.map((l) => (l.id === item.id ? saved : l))
        );
      }
    } catch (e) {
      console.error('Failed to save leave request:', e);
    }
  };

  const approveLeave = async (leaveId: string, approvedByUserId: string) => {
    setLeaveRequests((prev) =>
      prev.map((l) => (l.id === leaveId ? { ...l, status: 'APPROVED', approvedByUserId } : l))
    );

    try {
      const res = await fetch('/api/leave-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leaveId, status: 'APPROVED', approvedByUserId }),
      });
      if (res.ok) {
        const saved = await res.json();
        setLeaveRequests((prev) =>
          prev.map((l) => (l.id === leaveId ? saved : l))
        );
      }
    } catch (e) {
      console.error('Failed to approve leave request:', e);
    }
  };

  const approveTask = async (taskId: string, nextStage: string, reviewerId: string, notes?: string) => {
    await updateTaskStatus(taskId, (nextStage || 'Scheduling') as TaskItem['status']);
    addActivity(reviewerId || currentUser?.id || 'u-system', 'TASK', taskId, 'APPROVED', `Approved task and moved to ${nextStage || 'Scheduling'}`);
  };

  const addActivity = (
    userId: string,
    entityType: string,
    entityId: string,
    action: string,
    details: string
  ) => {
    const item: ActivityLogItem = {
      id: `act-${Date.now()}`,
      userId,
      entityType,
      entityId,
      action,
      details,
      createdAt: new Date().toISOString(),
    };
    setActivities((prev) => [item, ...prev]);
  };

  const addNotification = async (notif: { userId: string; type: string; title: string; message: string; link?: string }) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notif),
      });
      if (res.ok) {
        const saved = await res.json();
        setNotifications((prev) => [saved, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  };

  const updateCompanySettings = async (updates: any) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const saved = await res.json();
        setCompanySettings(saved);
        await fetchInitialData();
      }
    } catch (err) {
      console.error('Failed to update company settings:', err);
    }
  };

  const saveClientBudget = async (clientId: string, month: string, budget: number) => {
    try {
      const res = await fetch('/api/client-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, month, budget }),
      });
      if (res.ok) {
        const saved = await res.json();
        setBudgets((prev) => {
          const exists = prev.some((b) => b.clientId === clientId && b.month === month);
          if (exists) {
            return prev.map((b) => (b.clientId === clientId && b.month === month ? saved : b));
          } else {
            return [...prev, saved];
          }
        });
        return saved;
      } else {
        console.error('Failed to save monthly budget on server');
      }
    } catch (e) {
      console.error('Error saving client budget:', e);
    }
  };

  return (
    <DataContext.Provider
      value={{
        tasks,
        clients,
        worklogs,
        attendances,
        leaveRequests,
        budgets,
        setBudgets,
        masterScores,
        activities,
        notifications,
        addNotification,
        companySettings,
        updateCompanySettings,
        loading,
        addTask,
        updateTaskStatus,
        updateTask,
        deleteTask,
        addWorklog,
        updateWorklog,
        deleteWorklog,
        importWorklogs,
        clockIn,
        clockOut,
        submitLeave,
        approveLeave,
        approveTask,
        addActivity,
        saveClientBudget,
        refreshData: fetchInitialData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
