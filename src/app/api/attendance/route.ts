import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, locationMode } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const now = new Date();
    // Check if clocked in today already
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const existingAtt = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingAtt) {
      return NextResponse.json({
        ...existingAtt,
        userName: existingAtt.user.name,
        date: existingAtt.date.toISOString(),
        clockIn: existingAtt.clockIn.toISOString(),
        clockOut: existingAtt.clockOut ? existingAtt.clockOut.toISOString() : null,
      });
    }

    // Determine status (Late if clocked in after 09:00 AM)
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hours > 9 || (hours === 9 && minutes > 0);
    const status = isLate ? 'LATE' : 'ON_TIME';

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        date: now,
        clockIn: now,
        locationMode: locationMode || 'OFFICE',
        status,
        workingHours: 0.0,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({
      ...attendance,
      userName: attendance.user.name,
      date: attendance.date.toISOString(),
      clockIn: attendance.clockIn.toISOString(),
      clockOut: null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const activeAtt = await prisma.attendance.findFirst({
      where: {
        userId,
        clockOut: null,
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        user: true,
      },
    });

    if (!activeAtt) {
      return NextResponse.json({ error: 'No active clock-in found for today' }, { status: 404 });
    }

    const clockInTime = new Date(activeAtt.clockIn).getTime();
    const clockOutTime = now.getTime();
    const workingHours = Math.max(0.1, Math.round(((clockOutTime - clockInTime) / (1000 * 60 * 60)) * 10) / 10);

    const updated = await prisma.attendance.update({
      where: { id: activeAtt.id },
      data: {
        clockOut: now,
        workingHours,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({
      ...updated,
      userName: updated.user.name,
      date: updated.date.toISOString(),
      clockIn: updated.clockIn.toISOString(),
      clockOut: updated.clockOut ? updated.clockOut.toISOString() : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
