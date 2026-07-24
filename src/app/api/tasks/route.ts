import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function checkAuth(req: Request, allowedRoles: string[]): boolean {
  const userRoleHeader = req.headers.get('X-User-Role') || '';
  if (!userRoleHeader) return true; // Fallback if header is omitted
  const roles = userRoleHeader.split(',').map((r) => r.trim());
  if (roles.includes('Admin') || roles.includes('Owner')) return true;
  return roles.some((role) => allowedRoles.includes(role));
}

async function syncClientPoints(clientId: string) {
  try {
    const tasks = await prisma.task.findMany({ where: { clientId } });
    const usedPoint = tasks.reduce((sum, t) => sum + (t.score || 0), 0);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (client) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          usedPoint,
          remainingPoint: client.monthlyPointBudget - usedPoint,
        },
      });
    }
  } catch (err) {
    console.error('Error syncing client points:', err);
  }
}

export async function POST(req: Request) {
  try {
    if (!checkAuth(req, ['Strategist'])) {
      return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
    }

    const body = await req.json();
    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description || '',
        category: body.category || 'Editor',
        taskType: body.taskType || 'Editing',
        format: body.format || 'Reels',
        qty: body.qty || 1,
        priority: body.priority || 'Medium',
        status: body.status || 'Brief',
        clientId: body.clientId,
        workspaceId: body.workspaceId || null,
        postingDate: body.postingDate ? new Date(body.postingDate) : null,
        deadline: new Date(body.deadline || Date.now()),
        assignedUserIds: JSON.stringify(body.assignedUserIds || []),
        score: body.score || 0,
        cogs: body.cogs || 0,
        driveLink: body.driveLink || '',
        previewLink: body.previewLink || '',
        checklist: JSON.stringify(body.checklist || []),
        comments: JSON.stringify(body.comments || []),
        stages: body.stages ? JSON.stringify(body.stages) : null,
      },
    });

    await syncClientPoints(body.clientId);

    return NextResponse.json(task);
  } catch (e) {
    console.error('Error creating task:', e);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!checkAuth(req, ['Strategist', 'Editor', 'Production Assistant', 'Scheduler'])) {
      return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    const body = await req.json();
    const updateData: any = {};
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.taskType !== undefined) updateData.taskType = body.taskType;
    if (body.format !== undefined) updateData.format = body.format;
    if (body.qty !== undefined) updateData.qty = Number(body.qty);
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.clientId !== undefined) updateData.clientId = body.clientId;
    if (body.workspaceId !== undefined) updateData.workspaceId = body.workspaceId || null;
    
    if (body.postingDate !== undefined) {
      updateData.postingDate = body.postingDate ? new Date(body.postingDate) : null;
    }
    if (body.deadline !== undefined) {
      updateData.deadline = new Date(body.deadline);
    }
    if (body.assignedUserIds !== undefined) {
      updateData.assignedUserIds = JSON.stringify(body.assignedUserIds);
    }
    
    if (body.score !== undefined) updateData.score = Number(body.score);
    if (body.cogs !== undefined) updateData.cogs = Number(body.cogs);
    if (body.driveLink !== undefined) updateData.driveLink = body.driveLink;
    if (body.previewLink !== undefined) updateData.previewLink = body.previewLink;
    
    if (body.checklist !== undefined) {
      updateData.checklist = JSON.stringify(body.checklist);
    }
    if (body.comments !== undefined) {
      updateData.comments = JSON.stringify(body.comments);
    }
    if (body.stages !== undefined) {
      updateData.stages = JSON.stringify(body.stages);
    }

    // Get old clientId before update
    const oldTask = await prisma.task.findUnique({ where: { id } });

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    if (oldTask) {
      await syncClientPoints(oldTask.clientId);
      if (body.clientId && body.clientId !== oldTask.clientId) {
        await syncClientPoints(body.clientId);
      }
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error('Error updating task:', e);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!checkAuth(req, [])) { // Only Admin or Owner allowed
      return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    const oldTask = await prisma.task.findUnique({ where: { id } });

    await prisma.task.delete({ where: { id } });

    if (oldTask) {
      await syncClientPoints(oldTask.clientId);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting task:', e);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
