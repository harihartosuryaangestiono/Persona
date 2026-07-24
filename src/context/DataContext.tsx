'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from './UserContext';
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
import { MASTER_SCORES_STATIC, calculateCOGS } from '@/lib/score-calculator';

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
  loading: boolean;
  addTask: (task: Partial<TaskItem>) => Promise<TaskItem>;
  updateTaskStatus: (taskId: string, newStatus: TaskItem['status']) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  deleteTask: (taskId: string) => void;
  addWorklog: (log: Partial<WorklogItem>) => Promise<void>;
  deleteWorklog: (worklogId: string) => Promise<void>;
  importWorklogs: (logs: Partial<WorklogItem>[]) => void;
  clockIn: (userId: string, locationMode: 'OFFICE' | 'REMOTE' | 'GPS') => void;
  clockOut: (userId: string) => void;
  submitLeave: (leave: Partial<LeaveRequestItem>) => void;
  approveLeave: (leaveId: string, approvedByUserId: string) => void;
  approveTask: (taskId: string, nextStage: string, reviewerId: string, notes?: string) => void;
  addActivity: (userId: string, entityType: string, entityId: string, action: string, details: string) => void;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [worklogs, setWorklogs] = useState<WorklogItem[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [budgets, setBudgets] = useState<ClientMonthlyBudgetItem[]>([]);
  const [masterScores, setMasterScores] = useState<MasterScoreItem[]>([]);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { syncUsers, currentUser } = useUser();

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
        setTasks(json.tasks || []);
        setClients(json.clients || []);
        setWorklogs(json.worklogs || []);
        setAttendances(json.attendances || []);
        setLeaveRequests(json.leaveRequests || []);
        setBudgets(json.budgets || []);
        setMasterScores(json.masterScores || []);
        setActivities(json.activities || []);
      }
    } catch (e) {
      console.error('Failed to fetch data from API:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [currentUser]);

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
    const created: TaskItem = {
      id: `task-${Date.now()}`,
      clientId: newTaskData.clientId || clientObj?.id || 'client-1',
      clientName: newTaskData.clientName || clientObj?.name || 'Baking Empire Gading Serpong',
      clientColor: newTaskData.clientColor || clientObj?.clientColor || '#3B82F6',
      workspaceId: newTaskData.workspaceId || clientObj?.workspaceId || 'ws-team-anggi',
      title: newTaskData.title || 'Untitled Task',
      description: newTaskData.description || '',
      category: newTaskData.category || 'Editor',
      taskType: newTaskData.taskType || 'Editing',
      format: newTaskData.format || 'Reels',
      qty: newTaskData.qty || 1,
      priority: newTaskData.priority || 'Medium',
      postingDate: newTaskData.postingDate || new Date().toISOString().split('T')[0],
      deadline: newTaskData.deadline || new Date().toISOString().split('T')[0],
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
    };

    setTasks((prev) => [created, ...prev]);

    // Update Client Budget remaining (allow negative)
    setClients((prev) =>
      prev.map((c) =>
        c.id === created.clientId
          ? {
              ...c,
              usedPoint: c.usedPoint + score,
              remainingPoint: c.monthlyPointBudget - (c.usedPoint + score),
            }
          : c
      )
    );

    addActivity(currentUser?.id || 'u-system', 'TASK', created.id, 'CREATED', `Created task "${created.title}"`);

    // Sync to backend asynchronously
    if (currentUser) {
      fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.roles.join(','),
        },
        body: JSON.stringify(created),
      }).catch(console.error);
    }

    return created;
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskItem['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t))
    );
    addActivity(currentUser?.id || 'u-system', 'TASK', taskId, 'MOVED', `Moved task to stage ${newStatus}`);

    if (currentUser) {
      fetch(`/api/tasks?id=${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.roles.join(','),
        },
        body: JSON.stringify({ status: newStatus }),
      }).catch(console.error);
    }
  };

  const updateTask = (taskId: string, updates: Partial<TaskItem>) => {
    const oldTask = tasks.find((t) => t.id === taskId);
    if (oldTask) {
      const oldScore = oldTask.score || 0;
      const newScore = updates.stages ? getTaskScore(updates) : (updates.score !== undefined ? Number(updates.score) : oldScore);
      const scoreDiff = newScore - oldScore;
      const oldClientId = oldTask.clientId;
      const newClientId = updates.clientId || oldClientId;

      // Adjust client usage
      setClients((prev) =>
        prev.map((c) => {
          if (oldClientId === newClientId) {
            if (c.id === oldClientId) {
              const updatedUsed = c.usedPoint + scoreDiff;
              return {
                ...c,
                usedPoint: updatedUsed,
                remainingPoint: c.monthlyPointBudget - updatedUsed,
              };
            }
          } else {
            if (c.id === oldClientId) {
              const updatedUsed = c.usedPoint - oldScore;
              return {
                ...c,
                usedPoint: updatedUsed,
                remainingPoint: c.monthlyPointBudget - updatedUsed,
              };
            }
            if (c.id === newClientId) {
              const updatedUsed = c.usedPoint + newScore;
              return {
                ...c,
                usedPoint: updatedUsed,
                remainingPoint: c.monthlyPointBudget - updatedUsed,
              };
            }
          }
          return c;
        })
      );
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );

    if (currentUser) {
      fetch(`/api/tasks?id=${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.roles.join(','),
        },
        body: JSON.stringify({
          ...updates,
          score: updates.stages ? getTaskScore(updates) : updates.score,
        }),
      }).catch(console.error);
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
    const item: WorklogItem = {
      id: `wl-${Date.now()}-${Math.random()}`,
      date: log.date || new Date().toISOString(),
      userId: log.userId || 'u-jabin',
      clientId: log.clientId || clientObj?.id || '',
      clientName: log.clientName || clientObj?.name || 'Baking Empire Gading Serpong',
      contentTitle: log.contentTitle || 'Untitled Content',
      taskType: log.taskType || 'Editing',
      format: log.format || 'Single Foto',
      qty: log.qty || 1,
      score,
      cogs: calculateCOGS(score),
      status: 'Completed',
      source: log.source || 'Manual',
      previewLink: log.previewLink || '',
      stages: log.stages || null,
    };

    setWorklogs((prev) => [item, ...prev]);

    try {
      await fetch('/api/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    } catch (e) {
      console.error('Failed to sync worklog to database:', e);
    }
  };

  const deleteWorklog = async (worklogId: string) => {
    setWorklogs((prev) => prev.filter((w) => w.id !== worklogId));
    try {
      await fetch(`/api/worklogs?id=${worklogId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete worklog:', e);
    }
  };

  const importWorklogs = async (newLogs: Partial<WorklogItem>[]) => {
    const formatted: WorklogItem[] = newLogs.map((log, i) => {
      const score = log.score || 10;
      return {
        id: `import-${Date.now()}-${i}`,
        date: log.date || new Date().toISOString(),
        userId: log.userId || 'u-jabin',
        clientId: log.clientId || clients[0]?.id || '',
        clientName: log.clientName || 'Baking Empire Gading Serpong',
        contentTitle: log.contentTitle || 'Imported Task',
        taskType: log.taskType || 'Editing',
        format: log.format || 'Single Foto',
        qty: log.qty || 1,
        score,
        cogs: calculateCOGS(score),
        status: 'Completed',
        source: 'Imported',
        previewLink: log.previewLink || '',
        stages: log.stages || null,
      };
    });

    setWorklogs((prev) => [...formatted, ...prev]);

    for (const log of formatted) {
      try {
        await fetch('/api/worklogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log),
        });
      } catch (err) {
        console.error('Failed to save imported worklog:', err);
      }
    }
  };

  const clockIn = async (userId: string, locationMode: 'OFFICE' | 'REMOTE' | 'GPS') => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, locationMode }),
      });
      if (res.ok) {
        const saved = await res.json();
        setAttendances((prev) => [
          saved,
          ...prev.filter((a) => a.userId !== userId || new Date(a.date).toDateString() !== new Date(saved.date).toDateString())
        ]);
      } else {
        console.error('Failed to Clock In on server');
      }
    } catch (e) {
      console.error('Error clocking in:', e);
    }
  };

  const clockOut = async (userId: string) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const saved = await res.json();
        setAttendances((prev) =>
          prev.map((a) => (a.userId === userId && new Date(a.date).toDateString() === new Date(saved.date).toDateString() ? saved : a))
        );
      } else {
        console.error('Failed to Clock Out on server');
      }
    } catch (e) {
      console.error('Error clocking out:', e);
    }
  };

  const submitLeave = (leave: Partial<LeaveRequestItem>) => {
    const item: LeaveRequestItem = {
      id: `leave-${Date.now()}`,
      userId: leave.userId || 'u-priska',
      startDate: leave.startDate || new Date().toISOString(),
      endDate: leave.endDate || new Date().toISOString(),
      reason: leave.reason || 'Personal leave',
      type: leave.type || 'ANNUAL',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    setLeaveRequests((prev) => [item, ...prev]);
  };

  const approveLeave = (leaveId: string, approvedByUserId: string) => {
    setLeaveRequests((prev) =>
      prev.map((l) => (l.id === leaveId ? { ...l, status: 'APPROVED', approvedByUserId } : l))
    );
  };

  const approveTask = (taskId: string, nextStage: string, reviewerId: string, notes?: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: nextStage as any,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
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
        loading,
        addTask,
        updateTaskStatus,
        updateTask,
        deleteTask,
        addWorklog,
        deleteWorklog,
        importWorklogs,
        clockIn,
        clockOut,
        submitLeave,
        approveLeave,
        approveTask,
        addActivity,
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
