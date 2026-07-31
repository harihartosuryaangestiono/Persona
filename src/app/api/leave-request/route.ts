import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(leaves);
  } catch (e: any) {
    console.error('Error fetching leave requests:', e);
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let targetUserId = body.userId || 'u-priska';
    // Verify user exists in database, or find matching user by name/id
    const userMatch = await prisma.user.findFirst({
      where: {
        OR: [
          { id: targetUserId },
          { name: { equals: body.userName, mode: 'insensitive' } },
        ],
      },
    });

    if (userMatch) {
      targetUserId = userMatch.id;
    } else {
      // Fallback to first user in db if not found
      const firstUser = await prisma.user.findFirst();
      if (firstUser) targetUserId = firstUser.id;
    }

    const created = await prisma.leaveRequest.create({
      data: {
        userId: targetUserId,
        startDate: new Date(body.startDate || Date.now()),
        endDate: new Date(body.endDate || Date.now()),
        reason: body.reason || 'Personal leave',
        type: body.type || 'ANNUAL',
        status: body.status || 'PENDING',
      },
      include: { user: true },
    });

    return NextResponse.json({
      ...created,
      userName: created.user.name,
      startDate: created.startDate.toISOString().split('T')[0],
      endDate: created.endDate.toISOString().split('T')[0],
    });
  } catch (e: any) {
    console.error('Error creating leave request:', e);
    return NextResponse.json({ error: 'Failed to create leave request', message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, approvedByUserId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Leave request ID required' }, { status: 400 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status || 'APPROVED',
        approvedByUserId: approvedByUserId || null,
      },
      include: { user: true },
    });

    return NextResponse.json({
      ...updated,
      userName: updated.user.name,
      startDate: updated.startDate.toISOString().split('T')[0],
      endDate: updated.endDate.toISOString().split('T')[0],
    });
  } catch (e: any) {
    console.error('Error updating leave request:', e);
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
  }
}
