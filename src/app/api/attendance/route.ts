import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

async function cleanupStaleSessions(userId: string, targetDate: Date) {
  try {
    const staleActive = await prisma.attendance.findMany({
      where: {
        userId,
        clockOut: null,
        date: { lt: targetDate },
      },
      orderBy: { clockIn: 'desc' },
    });

    for (const stale of staleActive) {
      try {
        const staleIn = new Date(stale.clockIn).getTime();
        const autoClose = new Date(staleIn + 10 * 60 * 60 * 1000);
        const wMin = Math.max(0, Math.floor((autoClose.getTime() - staleIn) / 60000));
        const wHr = Math.round((wMin / 60.0) * 100) / 100;

        await prisma.attendance.update({
          where: { id: stale.id },
          data: {
            clockOut: autoClose,
            workingMinutes: wMin,
            workingHours: wHr,
            status: 'AUTO_CLOSED',
          },
        });

        await prisma.activityLog.create({
          data: {
            userId,
            entityType: 'ATTENDANCE',
            entityId: stale.id,
            action: 'AUTO_CLOCK_OUT',
            details: `Auto-closed stale session from previous day. Duration: ${wMin} mins (${wHr} hrs)`,
          },
        });
      } catch (innerErr) {
        console.error(`Failed to cleanup stale session ${stale.id}:`, innerErr);
      }
    }
  } catch (outerErr) {
    console.error('Stale session cleanup failed, continuing anyway:', outerErr);
  }
}

async function cleanupDuplicateActiveSessions(userId: string, excludeId: string) {
  try {
    const duplicates = await prisma.attendance.findMany({
      where: {
        userId,
        clockOut: null,
        NOT: { id: excludeId },
      },
      orderBy: { clockIn: 'desc' },
    });

    for (const dup of duplicates) {
      try {
        const dupIn = new Date(dup.clockIn).getTime();
        const autoOut = new Date(dupIn + 10 * 60 * 60 * 1000);
        const dupMin = Math.max(0, Math.floor((autoOut.getTime() - dupIn) / 60000));
        const dupHr = Math.round((dupMin / 60.0) * 100) / 100;

        await prisma.attendance.update({
          where: { id: dup.id },
          data: {
            clockOut: autoOut,
            workingMinutes: dupMin,
            workingHours: dupHr,
            status: 'AUTO_CLOSED',
          },
        });

        await prisma.activityLog.create({
          data: {
            userId,
            entityType: 'ATTENDANCE',
            entityId: dup.id,
            action: 'AUTO_CLOCK_OUT',
            details: `Auto-closed duplicate active session. Duration: ${dupMin} mins (${dupHr} hrs)`,
          },
        });
      } catch (innerErr) {
        console.error(`Failed to cleanup duplicate session ${dup.id}:`, innerErr);
      }
    }
  } catch (outerErr) {
    console.error('Duplicate session cleanup failed, continuing anyway:', outerErr);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, locationMode } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const now = new Date();

    const jakartaDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const targetDate = new Date(`${jakartaDateStr}T00:00:00.000Z`);
    const nextDate = new Date(targetDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    await cleanupStaleSessions(userId, targetDate);

    const preCheckActive = await prisma.attendance.findFirst({
      where: { userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });

    if (preCheckActive) {
      const activeDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(preCheckActive.clockIn);

      if (activeDateStr === jakartaDateStr) {
        await cleanupDuplicateActiveSessions(userId, preCheckActive.id);
        const refreshed = await prisma.attendance.findUnique({
          where: { id: preCheckActive.id },
          include: { user: true },
        });
        if (refreshed) {
          return NextResponse.json({
            success: true,
            reused: true,
            attendance: {
              ...refreshed,
              userName: refreshed.user?.name || 'Unknown User',
              date: refreshed.date.toISOString(),
              clockIn: refreshed.clockIn.toISOString(),
              clockOut: refreshed.clockOut ? refreshed.clockOut.toISOString() : null,
            },
          });
        }
      }
    }

    const todayAtt = await prisma.attendance.findFirst({
      where: { userId, date: { gte: targetDate, lt: nextDate } },
      orderBy: { clockIn: 'desc' },
    });

    if (todayAtt && todayAtt.clockOut) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      return NextResponse.json({
        success: true,
        reused: true,
        attendance: {
          ...todayAtt,
          userName: user?.name || 'Unknown User',
          date: todayAtt.date.toISOString(),
          clockIn: todayAtt.clockIn.toISOString(),
          clockOut: todayAtt.clockOut ? todayAtt.clockOut.toISOString() : null,
        },
      });
    }

    if (todayAtt && !todayAtt.clockOut) {
      await cleanupDuplicateActiveSessions(userId, todayAtt.id);
      const refreshed = await prisma.attendance.findUnique({
        where: { id: todayAtt.id },
        include: { user: true },
      });
      if (refreshed) {
        return NextResponse.json({
          success: true,
          reused: true,
          attendance: {
            ...refreshed,
            userName: refreshed.user?.name || 'Unknown User',
            date: refreshed.date.toISOString(),
            clockIn: refreshed.clockIn.toISOString(),
            clockOut: refreshed.clockOut ? refreshed.clockOut.toISOString() : null,
          },
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const settings = await tx.companySetting.findFirst();
      const workStart = settings?.workStart || '09:00';
      const gracePeriod = settings?.gracePeriod !== undefined ? settings.gracePeriod : 15;

      const [startHour, startMinute] = workStart.split(':').map(Number);
      const workStartMinutes = startHour * 60 + startMinute;

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
        include: { user: true },
      });

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
      reused: false,
      attendance: {
        ...result,
        userName: result.user?.name || 'Unknown User',
        date: result.date.toISOString(),
        clockIn: result.clockIn.toISOString(),
        clockOut: result.clockOut ? result.clockOut.toISOString() : null,
      },
    });
  } catch (err: any) {
    console.error('Clock In POST error:', err);
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

    const activeAttList = await prisma.attendance.findMany({
      where: { userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });

    if (!activeAttList || activeAttList.length === 0) {
      throw new Error('Tidak ada sesi attendance aktif.');
    }

    const activeAtt = activeAttList[0];

    if (activeAttList.length > 1) {
      const duplicates = activeAttList.slice(1);
      for (const dup of duplicates) {
        try {
          const dupIn = new Date(dup.clockIn).getTime();
          const autoOut = new Date(dupIn + 10 * 60 * 60 * 1000);
          const dupMin = Math.max(0, Math.floor((autoOut.getTime() - dupIn) / 60000));
          const dupHr = Math.round((dupMin / 60.0) * 100) / 100;

          await prisma.attendance.update({
            where: { id: dup.id },
            data: {
              clockOut: autoOut,
              workingMinutes: dupMin,
              workingHours: dupHr,
              status: 'AUTO_CLOSED',
            },
          });

          await prisma.activityLog.create({
            data: {
              userId,
              entityType: 'ATTENDANCE',
              entityId: dup.id,
              action: 'AUTO_CLOCK_OUT',
              details: `Auto-closed duplicate active session during clock out. Duration: ${dupMin} mins (${dupHr} hrs)`,
            },
          });
        } catch (innerErr) {
          console.error(`Failed to cleanup duplicate session ${dup.id} during clock out:`, innerErr);
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const clockInTime = new Date(activeAtt.clockIn).getTime();
      const clockOutTime = now.getTime();

      if (clockOutTime < clockInTime) {
        throw new Error('Waktu clock out mendahului waktu clock in.');
      }

      const workingMinutes = Math.max(0, Math.floor((clockOutTime - clockInTime) / 60000));
      const workingHours = Math.round((workingMinutes / 60.0) * 100) / 100;

      const updated = await tx.attendance.update({
        where: { id: activeAtt.id },
        data: {
          clockOut: now,
          workingMinutes,
          workingHours,
          status: 'COMPLETED',
        },
        include: { user: true },
      });

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
        userName: result.user?.name || 'Unknown User',
        date: result.date.toISOString(),
        clockIn: result.clockIn.toISOString(),
        clockOut: result.clockOut ? result.clockOut.toISOString() : null,
      },
    });
  } catch (err: any) {
    console.error('Clock Out PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Failed to Clock Out' }, { status: 400 });
  }
}
