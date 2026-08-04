import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PersonaAIEngine } from '@/lib/services/persona-ai-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, actionType, month = 'August', year = 2026 } = body;

    // Fetch live database records from Prisma / Supabase
    const [worklogs, tasks, clients, users, budgets, attendances, leaves] = await Promise.all([
      prisma.worklog.findMany({ orderBy: { date: 'desc' } }),
      prisma.task.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.client.findMany({ orderBy: { name: 'asc' } }),
      prisma.user.findMany({ orderBy: { name: 'asc' } }),
      prisma.clientMonthlyBudget.findMany(),
      prisma.attendance.findMany({ orderBy: { date: 'desc' } }),
      prisma.leaveRequest.findMany({ orderBy: { startDate: 'desc' } }),
    ]);

    // Map Prisma models to application type format
    const formattedLogs: any[] = worklogs.map((w) => ({
      ...w,
      date: w.date ? w.date.toISOString() : new Date().toISOString(),
      deadline: w.deadline ? w.deadline.toISOString() : '',
      stages: w.stages ? JSON.parse(w.stages) : null,
    }));

    const formattedTasks: any[] = tasks.map((t) => ({
      ...t,
      postingDate: t.postingDate ? t.postingDate.toISOString() : null,
      deadline: t.deadline ? t.deadline.toISOString() : null,
      createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
      stages: t.stages ? JSON.parse(t.stages) : null,
    }));

    const formattedClients: any[] = clients.map((c) => ({
      ...c,
      usedPoint: c.usedPoint || 0,
      monthlyPointBudget: c.monthlyPointBudget || 5000,
    }));

    const formattedUsers: any[] = users.map((u) => ({
      ...u,
      roles: u.roles ? (typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles) : ['Editor'],
    }));

    if (actionType === 'executive-summary') {
      const summary = PersonaAIEngine.getExecutiveSummary(
        formattedLogs,
        formattedTasks,
        formattedClients,
        formattedUsers,
        budgets as any,
        attendances as any,
        leaves as any,
        month,
        year
      );
      return NextResponse.json({ summary });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const response = PersonaAIEngine.processQuery(
      prompt,
      formattedLogs,
      formattedTasks,
      formattedClients,
      formattedUsers,
      budgets as any,
      attendances as any,
      leaves as any
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error executing Persona AI database query:', error);
    return NextResponse.json({ error: 'Failed to process Persona AI query', message: error.message }, { status: 500 });
  }
}
