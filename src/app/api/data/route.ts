import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
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
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.client.findMany(),
      prisma.task.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.worklog.findMany({ orderBy: { date: 'desc' } }),
      prisma.attendance.findMany({ orderBy: { date: 'desc' } }),
      prisma.leaveRequest.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.clientMonthlyBudget.findMany(),
      prisma.masterScore.findMany(),
      prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    // Parse JSON fields in tasks
    const formattedTasks = tasks.map((t) => ({
      ...t,
      clientName: clients.find((c) => c.id === t.clientId)?.name || 'Unknown Client',
      clientColor: clients.find((c) => c.id === t.clientId)?.clientColor || '#3B82F6',
      assignedUserIds: t.assignedUserIds ? JSON.parse(t.assignedUserIds) : [],
      files: t.files ? JSON.parse(t.files) : [],
      checklist: t.checklist ? JSON.parse(t.checklist) : [],
      comments: t.comments ? JSON.parse(t.comments) : [],
      postingDate: t.postingDate ? t.postingDate.toISOString().split('T')[0] : null,
      deadline: t.deadline.toISOString().split('T')[0],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    const formattedWorklogs = worklogs.map((w) => ({
      ...w,
      clientName: clients.find((c) => c.id === w.clientId)?.name || 'Unknown Client',
      userName: users.find((u) => u.id === w.userId)?.name || 'Unknown User',
      date: w.date.toISOString(),
    }));

    const formattedBudgets = budgets.map((b) => ({
      ...b,
      clientName: clients.find((c) => c.id === b.clientId)?.name || 'Unknown Client',
    }));

    return NextResponse.json({
      users: users.map((u) => ({ ...u, roles: JSON.parse(u.roles) })),
      clients,
      tasks: formattedTasks,
      worklogs: formattedWorklogs,
      attendances: attendances.map((a) => ({
        ...a,
        userName: users.find((u) => u.id === a.userId)?.name || 'Unknown User',
        date: a.date.toISOString(),
        clockIn: a.clockIn.toISOString(),
        clockOut: a.clockOut ? a.clockOut.toISOString() : null,
      })),
      leaveRequests: leaveRequests.map((l) => ({
        ...l,
        userName: users.find((u) => u.id === l.userId)?.name || 'Unknown User',
        startDate: l.startDate.toISOString().split('T')[0],
        endDate: l.endDate.toISOString().split('T')[0],
        createdAt: l.createdAt.toISOString(),
      })),
      budgets: formattedBudgets,
      masterScores,
      activities: activities.map((act) => ({
        ...act,
        userName: users.find((u) => u.id === act.userId)?.name || 'System',
        createdAt: act.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching data from Prisma:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
