import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId, month, budget } = body;

    if (!clientId || !month) {
      return NextResponse.json({ error: 'clientId and month are required' }, { status: 400 });
    }

    const budgetVal = Number(budget) || 0;

    const upserted = await prisma.clientMonthlyBudget.upsert({
      where: {
        clientId_month: {
          clientId,
          month
        }
      },
      update: {
        budget: budgetVal,
        remaining: budgetVal
      },
      create: {
        clientId,
        month,
        budget: budgetVal,
        used: 0,
        remaining: budgetVal
      }
    });

    return NextResponse.json(upserted);
  } catch (e: any) {
    console.error('Error saving monthly budget:', e);
    return NextResponse.json({ error: 'Failed to save monthly budget', message: e.message }, { status: 500 });
  }
}
