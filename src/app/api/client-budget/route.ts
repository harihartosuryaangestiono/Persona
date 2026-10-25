import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeRoles } from '@/lib/rbac';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'You do not have permission to manage client budgets.' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      return NextResponse.json({ error: 'You do not have permission to manage client budgets.' }, { status: 403 });
    }

    let userRoles: string[] | string;
    try {
      const parsedRoles: unknown = JSON.parse(user.roles);
      userRoles = Array.isArray(parsedRoles)
        ? parsedRoles.filter((role): role is string => typeof role === 'string')
        : user.roles;
    } catch {
      userRoles = user.roles.split(',');
    }

    if (!normalizeRoles(userRoles).some((role) => role === 'Admin' || role === 'Owner')) {
      return NextResponse.json({ error: 'Only Admin and Owner can manage client budgets.' }, { status: 403 });
    }

    const body = await req.json();
    const { clientId, month, budget } = body;

    if (typeof clientId !== 'string' || !clientId || typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json({ error: 'A valid clientId and month (YYYY-MM) are required.' }, { status: 400 });
    }

    const budgetVal = Number(budget);
    if (!Number.isSafeInteger(budgetVal) || budgetVal < 0) {
      return NextResponse.json({ error: 'Budget must be a non-negative whole number.' }, { status: 400 });
    }

    const existing = await prisma.clientMonthlyBudget.findUnique({
      where: { clientId_month: { clientId, month } }
    });

    const usedVal = existing ? existing.used : 0;
    const remainingVal = budgetVal - usedVal;

    const upserted = await prisma.clientMonthlyBudget.upsert({
      where: {
        clientId_month: {
          clientId,
          month
        }
      },
      update: {
        budget: budgetVal,
        remaining: remainingVal
      },
      create: {
        clientId,
        month,
        budget: budgetVal,
        used: 0,
        remaining: budgetVal
      }
    });

    const targetClient = await prisma.client.findUnique({ where: { id: clientId } });
    if (targetClient) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          monthlyPointBudget: Math.max(targetClient.monthlyPointBudget || 0, budgetVal),
          remainingPoint: Math.max(0, budgetVal - targetClient.usedPoint),
        }
      });
    }

    return NextResponse.json({
      ...upserted,
      clientName: targetClient?.name || 'Unknown Client',
    });
  } catch (e: any) {
    console.error('Error saving monthly budget:', e);
    return NextResponse.json({ error: 'Failed to save monthly budget', message: e.message }, { status: 500 });
  }
}
