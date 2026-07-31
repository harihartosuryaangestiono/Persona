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
import { MASTER_SCORES_STATIC, calculateCOGS, calculatePriority } from '@/lib/score-calculator';

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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
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
      workspaceId: newTaskData.workspaceId || clientObj?.workspaceId || 'ws-team-anggi',
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
          setTasks((prev) => [saved, ...prev]);
          await fetchInitialData();
          return saved;
        }
      } catch (err) {
        console.error(err);
      }
    }

    setTasks((prev) => [created, ...prev]);
    return created;
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskItem['status']) => {
    // Optimistic local state update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t))
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
          setTasks((prev) => prev.map((t) => (t.id === taskId ? saved : t)));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const updateTask = async (taskId: string, updates: Partial<TaskItem>) => {
    const oldTask = tasks.find((t) => t.id === taskId);
    
    const postingDateVal = updates.postingDate !== undefined ? updates.postingDate : (oldTask ? oldTask.postingDate : '');
    const deadlineVal = updates.deadline !== undefined ? updates.deadline : (oldTask ? oldTask.deadline : '');
    const statusVal = updates.status !== undefined ? updates.status : (oldTask ? oldTask.status : 'Brief');

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

    // Optimistic local state update first so UI updates immediately
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );

    if (currentUser) {
      try {
        const res = await fetch(`/api/tasks?id=${taskId}`, {
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
        });
        if (res.ok) {
          const saved = await res.json();
          setTasks((prev) => prev.map((t) => (t.id === taskId ? saved : t)));
          return;
        }
      } catch (err) {
        console.error(err);
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
      month: log.month || detectedMonth,
      year: log.year ? Number(log.year) : detectedYear,
      contentId: log.contentId || '',
      isArchived: log.isArchived || false,
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
      const dateVal = log.date || new Date().toISOString();
      const dateObj = new Date(dateVal);
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const detectedMonth = !isNaN(dateObj.getTime()) ? monthNames[dateObj.getMonth()] : 'July';
      const detectedYear = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : 2026;

      return {
        id: `import-${Date.now()}-${i}`,
        date: dateVal,
        userId: log.userId || 'u-jabin',
        clientId: log.clientId || clients[0]?.id || '',
        clientName: 'Baking Empire Gading Serpong',
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
        month: log.month || detectedMonth,
        year: log.year ? Number(log.year) : detectedYear,
        contentId: log.contentId || '',
        isArchived: log.isArchived || false,
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
      await fetch('/api/leave-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leaveId, status: 'APPROVED', approvedByUserId }),
      });
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
