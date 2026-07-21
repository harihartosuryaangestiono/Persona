import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
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
        postingDate: body.postingDate ? new Date(body.postingDate) : null,
        deadline: new Date(body.deadline || Date.now()),
        assignedUserIds: JSON.stringify(body.assignedUserIds || []),
        score: body.score || 0,
        cogs: body.cogs || 0,
        driveLink: body.driveLink || '',
        previewLink: body.previewLink || '',
        checklist: JSON.stringify(body.checklist || []),
        comments: JSON.stringify(body.comments || []),
      },
    });

    return NextResponse.json(task);
  } catch (e) {
    console.error('Error creating task:', e);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    const body = await req.json();
    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.title) updateData.title = body.title;
    if (body.priority) updateData.priority = body.priority;

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('Error updating task:', e);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting task:', e);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
