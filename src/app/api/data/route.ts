import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  User,
  Client,
  Task,
  Worklog,
  Attendance,
  LeaveRequest,
  ClientMonthlyBudget,
  ActivityLog,
  Notification,
} from '@prisma/client';

export async function GET() {
  try {
    // 1. Fetch or create Company Settings (Requirement 5)
    let settings = await prisma.companySetting.findFirst();
    if (!settings) {
      settings = await prisma.companySetting.create({ data: {} });
    }
    const archiveRule = settings.archiveRule || 'END_OF_MONTH';

    // 2. Perform database-driven archiving check based on setting (Requirement 2 & 5)
    try {
      if (archiveRule === 'END_OF_MONTH') {
        const MONTH_MAP: Record<string, number> = {
          January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
          July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
        };
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const potentialArchiveTasks = await prisma.task.findMany({
          where: {
            status: { in: ['Posted', 'Completed'] },
            isArchived: false,
          }
        });

        const tasksToArchive = potentialArchiveTasks.filter(t => {
          const taskMonthNum = MONTH_MAP[t.month] ?? 0;
          if (t.year < currentYear) return true;
          if (t.year === currentYear && taskMonthNum < currentMonth) return true;
          return false;
        });

        if (tasksToArchive.length > 0) {
          const taskIds = tasksToArchive.map(t => t.id);
          await prisma.task.updateMany({
            where: { id: { in: taskIds } },
            data: { isArchived: true, archivedAt: new Date(), archivedBy: 'u-system' }
          });

          // Also archive associated worklogs
          const contentIds = tasksToArchive.map(t => t.contentId).filter(Boolean);
          if (contentIds.length > 0) {
            await prisma.worklog.updateMany({
              where: { contentId: { in: contentIds }, isArchived: false },
              data: { isArchived: true, archivedAt: new Date(), archivedBy: 'u-system' }
            });
          }
        }
      } else if (archiveRule === 'SEVEN_DAYS') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const tasksToArchive = await prisma.task.findMany({
          where: {
            status: { in: ['Posted', 'Completed'] },
            isArchived: false,
            updatedAt: { lte: sevenDaysAgo }
          }
        });

        if (tasksToArchive.length > 0) {
          const taskIds = tasksToArchive.map(t => t.id);
          await prisma.task.updateMany({
            where: { id: { in: taskIds } },
            data: { isArchived: true, archivedAt: new Date(), archivedBy: 'u-system' }
          });

          // Also archive associated worklogs
          const contentIds = tasksToArchive.map(t => t.contentId).filter(Boolean);
          if (contentIds.length > 0) {
            await prisma.worklog.updateMany({
              where: { contentId: { in: contentIds }, isArchived: false },
              data: { isArchived: true, archivedAt: new Date(), archivedBy: 'u-system' }
            });
          }
        }
      }
    } catch (err) {
      console.error('Error during auto-archiving:', err);
    }

    // 3. Fetch all dataset collections
    const [
      users,
      clients,
      tasks,
      worklogs,
      attendances,
      leaveRequests,
      budgets,
      masterScores,
      activities,
      workspaces,
      notifications,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.client.findMany(),
      prisma.task.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.worklog.findMany({ orderBy: { date: 'desc' } }),
      prisma.attendance.findMany({ orderBy: { date: 'desc' } }),
      prisma.leaveRequest.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.clientMonthlyBudget.findMany(),
      prisma.masterScore.findMany(),
      prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.workspace.findMany(),
      prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);

    // Parse JSON fields in tasks
    const formattedTasks = tasks.map((t: Task) => ({
      ...t,
      clientName: clients.find((c: Client) => c.id === t.clientId)?.name || 'Unknown Client',
      clientColor: clients.find((c: Client) => c.id === t.clientId)?.clientColor || '#3B82F6',
      assignedUserIds: t.assignedUserIds ? JSON.parse(t.assignedUserIds) : [],
      files: t.files ? JSON.parse(t.files) : [],
      checklist: t.checklist ? JSON.parse(t.checklist) : [],
      comments: t.comments ? JSON.parse(t.comments) : [],
      stages: t.stages ? JSON.parse(t.stages) : null,
      postingDate: t.postingDate ? t.postingDate.toISOString().split('T')[0] : null,
      deadline: t.deadline.toISOString().split('T')[0],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      isArchived: t.isArchived,
      archivedAt: t.archivedAt ? t.archivedAt.toISOString() : null,
      archivedBy: t.archivedBy || null,
      handoverUserId: t.handoverUserId || null,
      handoverTime: t.handoverTime ? t.handoverTime.toISOString() : null,
      workflowTimeline: t.workflowTimeline || null,
    }));

    const formattedWorklogs = worklogs.map((w: Worklog) => ({
      ...w,
      clientName: clients.find((c: Client) => c.id === w.clientId)?.name || 'Unknown Client',
      userName: users.find((u: User) => u.id === w.userId)?.name || 'Unknown User',
      date: w.date.toISOString(),
      stages: w.stages ? JSON.parse(w.stages) : null,
      isArchived: w.isArchived,
    }));

    const formattedBudgets = budgets.map((b: ClientMonthlyBudget) => ({
      ...b,
      clientName: clients.find((c: Client) => c.id === b.clientId)?.name || 'Unknown Client',
    }));

    return NextResponse.json({
      users: users.map((u: User) => ({ ...u, roles: JSON.parse(u.roles) })),
      clients,
      tasks: formattedTasks,
      worklogs: formattedWorklogs,
      attendances: attendances.map((a: Attendance) => ({
        ...a,
        userName: users.find((u: User) => u.id === a.userId)?.name || 'Unknown User',
        date: a.date.toISOString(),
        clockIn: a.clockIn.toISOString(),
        clockOut: a.clockOut ? a.clockOut.toISOString() : null,
      })),
      leaveRequests: leaveRequests.map((l: LeaveRequest) => ({
        ...l,
        userName: users.find((u: User) => u.id === l.userId)?.name || 'Unknown User',
        startDate: l.startDate.toISOString().split('T')[0],
        endDate: l.endDate.toISOString().split('T')[0],
        createdAt: l.createdAt.toISOString(),
      })),
      budgets: formattedBudgets,
      masterScores,
      activities: activities.map((act: ActivityLog) => ({
        ...act,
        userName: users.find((u: User) => u.id === act.userId)?.name || 'System',
        createdAt: act.createdAt.toISOString(),
      })),
      workspaces: workspaces.map((w) => ({
        ...w,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
      notifications: notifications.map((n: Notification) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      companySettings: settings,
    });
  } catch (error: any) {
    console.error('Error fetching data from Prisma:', error);
    return NextResponse.json({
      error: 'Failed to fetch data',
      message: error?.message || String(error),
      stack: error?.stack || ''
    }, { status: 500 });
  }
}
