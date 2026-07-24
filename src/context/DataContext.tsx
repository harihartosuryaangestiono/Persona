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
  addWorklog: (log: Partial<WorklogItem>) => void;
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
  const { syncUsers } = useUser();

  const fetchInitialData = async () => {
    try {
      const res = await fetch('/api/data');
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
  }, []);

  const addTask = async (newTaskData: Partial<TaskItem>): Promise<TaskItem> => {
    const score = newTaskData.score || 100;
    const cogs = calculateCOGS(score);
    const created: TaskItem = {
      id: `task-${Date.now()}`,
      clientId: newTaskData.clientId || clients[0]?.id || 'client-1',
      clientName: newTaskData.clientName || 'Baking Empire Gading Serpong',
      clientColor: newTaskData.clientColor || '#3B82F6',
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTasks((prev) => [created, ...prev]);

    // Update Client Budget remaining
    setClients((prev) =>
      prev.map((c) =>
        c.id === created.clientId
          ? {
              ...c,
              usedPoint: c.usedPoint + score,
              remainingPoint: Math.max(0, c.remainingPoint - score),
            }
          : c
      )
    );

    addActivity('u-system', 'TASK', created.id, 'CREATED', `Created task "${created.title}"`);

    // Sync to backend asynchronously
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(created),
    }).catch(console.error);

    return created;
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskItem['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t))
    );
    addActivity('u-system', 'TASK', taskId, 'MOVED', `Moved task to stage ${newStatus}`);

    fetch(`/api/tasks?id=${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch(console.error);
  };

  const updateTask = (taskId: string, updates: Partial<TaskItem>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );
    fetch(`/api/tasks?id=${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(console.error);
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' }).catch(console.error);
  };

  const addWorklog = (log: Partial<WorklogItem>) => {
    const score = log.score || 10;
    const item: WorklogItem = {
      id: `wl-${Date.now()}-${Math.random()}`,
      date: log.date || new Date().toISOString(),
      userId: log.userId || 'u-jabin',
      clientId: log.clientId || clients[0]?.id || '',
      clientName: log.clientName || 'Baking Empire Gading Serpong',
      contentTitle: log.contentTitle || 'Untitled Content',
      taskType: log.taskType || 'Editing',
      format: log.format || 'Single Foto',
      qty: log.qty || 1,
      score,
      cogs: calculateCOGS(score),
      status: 'Completed',
      source: log.source || 'Manual',
      previewLink: log.previewLink || '',
    };

    setWorklogs((prev) => [item, ...prev]);
  };

  const importWorklogs = (newLogs: Partial<WorklogItem>[]) => {
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
      };
    });

    setWorklogs((prev) => [...formatted, ...prev]);
  };

  const clockIn = (userId: string, locationMode: 'OFFICE' | 'REMOTE' | 'GPS') => {
    const now = new Date();
    const isLate = now.getHours() >= 9 && now.getMinutes() > 0;
    const newAtt: AttendanceItem = {
      id: `att-${Date.now()}`,
      userId,
      date: now.toISOString(),
      clockIn: now.toISOString(),
      locationMode,
      status: isLate ? 'LATE' : 'ON_TIME',
      workingHours: 0,
    };
    setAttendances((prev) => [newAtt, ...prev.filter((a) => a.userId !== userId || new Date(a.date).toDateString() !== now.toDateString())]);
  };

  const clockOut = (userId: string) => {
    const now = new Date();
    setAttendances((prev) =>
      prev.map((a) => {
        if (a.userId === userId && !a.clockOut) {
          const hours = (now.getTime() - new Date(a.clockIn).getTime()) / (1000 * 60 * 60);
          return {
            ...a,
            clockOut: now.toISOString(),
            workingHours: Math.min(12, Math.round(hours * 10) / 10),
          };
        }
        return a;
      })
    );
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
