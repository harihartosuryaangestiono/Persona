import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    let settings = await prisma.companySetting.findFirst();
    if (!settings) {
      settings = await prisma.companySetting.create({ data: {} });
    }
    return NextResponse.json(settings);
  } catch (err: any) {
    console.error('Failed to get settings:', err);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    let settings = await prisma.companySetting.findFirst();
    if (!settings) {
      settings = await prisma.companySetting.create({ data: {} });
    }

    const updated = await prisma.companySetting.update({
      where: { id: settings.id },
      data: {
        effectiveWorkingHrs: body.effectiveWorkingHrs !== undefined ? Number(body.effectiveWorkingHrs) : undefined,
        workingDaysPerWeek: body.workingDaysPerWeek !== undefined ? Number(body.workingDaysPerWeek) : undefined,
        workdaysPerMonth: body.workdaysPerMonth !== undefined ? Number(body.workdaysPerMonth) : undefined,
        pointPerHour: body.pointPerHour !== undefined ? Number(body.pointPerHour) : undefined,
        monthlyCapacity: body.monthlyCapacity !== undefined ? Number(body.monthlyCapacity) : undefined,
        costPerPoint: body.costPerPoint !== undefined ? Number(body.costPerPoint) : undefined,
        defaultDeadlineOffsetDays: body.defaultDeadlineOffsetDays !== undefined ? Number(body.defaultDeadlineOffsetDays) : undefined,
        archiveRule: body.archiveRule !== undefined ? body.archiveRule : undefined,
        workStart: body.workStart !== undefined ? body.workStart : undefined,
        gracePeriod: body.gracePeriod !== undefined ? Number(body.gracePeriod) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Failed to update settings:', err);
    return NextResponse.json({ error: 'Failed to update settings', details: err?.message || String(err) }, { status: 500 });
  }
}
