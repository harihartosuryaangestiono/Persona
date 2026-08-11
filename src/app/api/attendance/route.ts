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

    // 1. Get Jakarta Date String for the current server timestamp
    const jakartaDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const targetDate = new Date(`${jakartaDateStr}T00:00:00.000Z`);

    // 2. Perform Atomic Operations using Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check for any active attendance session (clockOut is null)
      const activeAtt = await tx.attendance.findFirst({
        where: {
          userId,
          clockOut: null,
        },
      });

      if (activeAtt) {
        throw new Error('Anda masih memiliki sesi attendance yang aktif.');
      }

      // Check if user already has any attendance record today (completed or active)
      const todayAtt = await tx.attendance.findFirst({
        where: {
          userId,
          date: targetDate,
        },
      });

      if (todayAtt) {
        throw new Error('Anda sudah melakukan absensi hari ini.');
      }

      // 3. Fetch Company Settings dynamically
      const settings = await tx.companySetting.findFirst();
      const workStart = settings?.workStart || '09:00';
      const gracePeriod = settings?.gracePeriod !== undefined ? settings.gracePeriod : 15;

      const [startHour, startMinute] = workStart.split(':').map(Number);
      const workStartMinutes = startHour * 60 + startMinute;

      // 4. Calculate if late based on Asia/Jakarta timezone
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });

      const formattedTime = timeFormatter.format(now);
      const [hour, minute] = formattedTime.split(':').map(Number);
      const clockInMinutes = hour * 60 + minute;

      const diff = clockInMinutes - workStartMinutes;
      const isLate = diff > gracePeriod;
      const lateMinutes = isLate ? diff : 0;

      // 5. Create new attendance session
      const attendance = await tx.attendance.create({
        data: {
          userId,
          date: targetDate,
          clockIn: now,
          clockOut: null,
          locationMode: locationMode || 'OFFICE',
          status: 'ACTIVE',
          workingHours: 0.0,
          workingMinutes: 0,
          isLate,
          lateMinutes,
        },
        include: {
          user: true,
        },
      });

      // 6. Log the event
      await tx.activityLog.create({
        data: {
          userId,
          entityType: 'ATTENDANCE',
          entityId: attendance.id,
          action: 'CLOCK_IN',
          details: `Clocked in via ${locationMode || 'OFFICE'}${isLate ? ` (Late ${lateMinutes}m)` : ''}`,
        },
      });

      return attendance;
    });

    return NextResponse.json({
      success: true,
      attendance: {
        ...result,
        userName: result.user.name,
        date: result.date.toISOString(),
        clockIn: result.clockIn.toISOString(),
        clockOut: null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to Clock In' }, { status: 400 });
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

    // Perform Atomic Operations using Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find the first active attendance record for this user (where clockOut is null)
      const activeAtt = await tx.attendance.findFirst({
        where: {
          userId,
          clockOut: null,
        },
      });

      if (!activeAtt) {
        throw new Error('Tidak ada sesi attendance aktif.');
      }

      const clockInTime = new Date(activeAtt.clockIn).getTime();
      const clockOutTime = now.getTime();

      if (clockOutTime < clockInTime) {
        throw new Error('Waktu clock out mendahului waktu clock in.');
      }

      const workingMinutes = Math.max(0, Math.floor((clockOutTime - clockInTime) / 60000));
      const workingHours = Math.round((workingMinutes / 60.0) * 100) / 100;

      // Update session to COMPLETED
      const updated = await tx.attendance.update({
        where: { id: activeAtt.id },
        data: {
          clockOut: now,
          workingMinutes,
          workingHours,
          status: 'COMPLETED',
        },
        include: {
          user: true,
        },
      });

      // Log the event
      await tx.activityLog.create({
        data: {
          userId,
          entityType: 'ATTENDANCE',
          entityId: updated.id,
          action: 'CLOCK_OUT',
          details: `Clocked out. Duration: ${workingMinutes} mins (${workingHours} hrs)`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      attendance: {
        ...result,
        userName: result.user.name,
        date: result.date.toISOString(),
        clockIn: result.clockIn.toISOString(),
        clockOut: result.clockOut ? result.clockOut.toISOString() : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to Clock Out' }, { status: 400 });
  }
}
