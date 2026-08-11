import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/users/[id] — fetch single user
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requesterId = req.headers.get('X-User-Id') || '';
    if (!requesterId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requesterRoles: string[] =
      typeof requester.roles === 'string' ? JSON.parse(requester.roles) : requester.roles;
    const isAdmin = requesterRoles.includes('Admin') || requesterRoles.includes('Owner');

    // Non-admin can only fetch their own profile
    if (!isAdmin && requesterId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    console.error('GET /api/users/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/users/[id] — update user profile (name, avatar)
// Password is not stored in DB — handled client-side in localStorage
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requesterId = req.headers.get('X-User-Id') || '';
    if (!requesterId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requesterRoles: string[] =
      typeof requester.roles === 'string' ? JSON.parse(requester.roles) : requester.roles;
    const isAdmin = requesterRoles.includes('Admin') || requesterRoles.includes('Owner');

    // Non-admin can only update their own profile
    if (!isAdmin && requesterId !== id) {
      return NextResponse.json({ error: 'Forbidden — you can only update your own profile' }, { status: 403 });
    }

    const body = await req.json();
    const { name, avatar, roles, monthlyCapacity, hourlyPoint, costPerPoint, active } = body;

    // Build update payload — only allow name/avatar for self-update
    const updateData: Record<string, any> = {};

    if (name !== undefined && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (avatar !== undefined) {
      updateData.avatar = avatar; // Can be base64 URL or empty string
    }

    // Admin-only fields
    if (isAdmin) {
      if (roles !== undefined && Array.isArray(roles)) {
        updateData.roles = JSON.stringify(roles);
      }
      if (monthlyCapacity !== undefined) {
        updateData.monthlyCapacity = Number(monthlyCapacity);
      }
      if (hourlyPoint !== undefined) {
        updateData.hourlyPoint = Number(hourlyPoint);
      }
      if (costPerPoint !== undefined) {
        updateData.costPerPoint = Number(costPerPoint);
      }
      if (active !== undefined) {
        updateData.active = Boolean(active);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('PATCH /api/users/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to update user', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
