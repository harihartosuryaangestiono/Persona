import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, code, monthlyPointBudget, workspaceId, status, notes, clientColor } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name,
        code,
        monthlyPointBudget: Number(monthlyPointBudget) || 0,
        remainingPoint: Number(monthlyPointBudget) || 0,
        usedPoint: 0,
        workspaceId: workspaceId || null,
        status: status || 'Active',
        active: status === 'Active',
        notes: notes || '',
        clientColor: clientColor || '#3B82F6',
      },
    });

    return NextResponse.json(client);
  } catch (e: any) {
    console.error('Error creating client:', e);
    return NextResponse.json({ error: 'Failed to create client', message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Client ID required' }, { status: 400 });

    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.code !== undefined) updateData.code = body.code;
    if (body.monthlyPointBudget !== undefined) {
      updateData.monthlyPointBudget = Number(body.monthlyPointBudget);
    }
    if (body.workspaceId !== undefined) updateData.workspaceId = body.workspaceId || null;
    if (body.status !== undefined) {
      updateData.status = body.status;
      updateData.active = body.status === 'Active';
    }
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.clientColor !== undefined) updateData.clientColor = body.clientColor;

    // Fetch current client to recalculate remaining points
    const currentClient = await prisma.client.findUnique({ where: { id } });
    if (!currentClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (updateData.monthlyPointBudget !== undefined) {
      updateData.remainingPoint = updateData.monthlyPointBudget - currentClient.usedPoint;
    }

    const updated = await prisma.client.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error('Error updating client:', e);
    return NextResponse.json({ error: 'Failed to update client', message: e.message }, { status: 500 });
  }
}
