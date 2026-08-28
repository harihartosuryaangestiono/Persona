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

export async function GET(req: Request) {
  try {
    const userIdHeader = req.headers.get('X-User-Id') || '';
    
    // Authenticate and fetch user from DB to identify roles with transient retry
    let userRecord = null;
    if (userIdHeader) {
      try {
        userRecord = await prisma.user.findUnique({ where: { id: userIdHeader } });
      } catch (err) {
        console.warn('Prisma user lookup transient retry:', err);
        await new Promise((r) => setTimeout(r, 400));
        userRecord = await prisma.user.findUnique({ where: { id: userIdHeader } }).catch(() => null);
      }
    }
    const dbRoles: string[] = userRecord ? (typeof userRecord.roles === 'string' ? JSON.parse(userRecord.roles) : userRecord.roles) : [];
    
    let tasksQuery: any = { orderBy: { createdAt: 'desc' } };
    let worklogsQuery: any = { orderBy: { date: 'desc' } };
    let attendancesQuery: any = { orderBy: { date: 'desc' } };

    if (userRecord) {
      const isExecutive = dbRoles.includes('Admin') || dbRoles.includes('Owner') || dbRoles.includes('Strategist');
      if (!isExecutive) {
        const nameLower = userRecord.name.toLowerCase();
        const orClauses: any[] = [
          { assignedUserIds: { contains: userRecord.id } },
          { assignedUserIds: { contains: userRecord.name } },
          { stages: { contains: userRecord.id } },
          { stages: { contains: userRecord.name } },
          { handoverUserId: userRecord.id },
          { handoverUserId: userRecord.name },
        ];

        // Add alias fallbacks for permanent team members
        if (nameLower.includes('dinda')) {
          orClauses.push({ assignedUserIds: { contains: 'u-dindong' } });
          orClauses.push({ assignedUserIds: { contains: 'dinda' } });
          orClauses.push({ stages: { contains: 'u-dindong' } });
          orClauses.push({ stages: { contains: 'dinda' } });
        } else if (nameLower.includes('anggi')) {
          orClauses.push({ assignedUserIds: { contains: 'u-anggi' } });
          orClauses.push({ assignedUserIds: { contains: 'anggi' } });
          orClauses.push({ stages: { contains: 'u-anggi' } });
          orClauses.push({ stages: { contains: 'anggi' } });
        } else if (nameLower.includes('devi')) {
          orClauses.push({ assignedUserIds: { contains: 'u-devi' } });
          orClauses.push({ assignedUserIds: { contains: 'devi' } });
          orClauses.push({ stages: { contains: 'u-devi' } });
          orClauses.push({ stages: { contains: 'devi' } });
        } else if (nameLower.includes('gigi')) {
          orClauses.push({ assignedUserIds: { contains: 'u-gigie' } });
          orClauses.push({ assignedUserIds: { contains: 'gigi' } });
          orClauses.push({ stages: { contains: 'u-gigie' } });
          orClauses.push({ stages: { contains: 'gigi' } });
        } else if (nameLower.includes('jabin')) {
          orClauses.push({ assignedUserIds: { contains: 'u-jabin' } });
          orClauses.push({ assignedUserIds: { contains: 'jabin' } });
          orClauses.push({ stages: { contains: 'u-jabin' } });
          orClauses.push({ stages: { contains: 'jabin' } });
        } else if (nameLower.includes('prisca') || nameLower.includes('priska')) {
          orClauses.push({ assignedUserIds: { contains: 'u-priska' } });
          orClauses.push({ assignedUserIds: { contains: 'prisca' } });
          orClauses.push({ assignedUserIds: { contains: 'priska' } });
          orClauses.push({ stages: { contains: 'u-priska' } });
          orClauses.push({ stages: { contains: 'prisca' } });
          orClauses.push({ stages: { contains: 'priska' } });
        }

        // If user has Scheduler role, also include scheduling-stage tasks or tasks that mention Scheduler role
        const userIsScheduler = dbRoles.includes('Scheduler');
        if (userIsScheduler) {
          orClauses.push({ status: 'Scheduling' });
          orClauses.push({ status: 'Ready to Post' });
          orClauses.push({ status: 'Posted' });
          orClauses.push({ stages: { contains: 'Scheduler' } });
          // also include any stage entries that mention scheduling in taskType
          orClauses.push({ stages: { contains: 'scheduling' } });
        }

        tasksQuery.where = { OR: orClauses };

        worklogsQuery.where = {
          OR: [
            { userId: userRecord.id },
            { stages: { contains: userRecord.id } },
            { stages: { contains: userRecord.name } }
          ]
        };

        attendancesQuery.where = { userId: userRecord.id };
      }
    }

    // 1. Fetch all dataset collections in parallel for maximum speed
    const [
      settings,
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
      prisma.companySetting.findFirst(),
      prisma.user.findMany(),
      prisma.client.findMany(),
      prisma.task.findMany(tasksQuery),
      prisma.worklog.findMany(worklogsQuery),
      prisma.attendance.findMany(attendancesQuery),
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
      users: users.map((u: User) => ({
        ...u,
        monthlyCapacity: u.monthlyCapacity === 12000 || !u.monthlyCapacity ? 16000 : u.monthlyCapacity,
        roles: typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles,
      })),
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
      companySettings: settings || { monthlyCapacity: 16000, archiveRule: 'END_OF_MONTH' },
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
