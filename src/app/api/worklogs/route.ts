import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      date,
      userId,
      clientId,
      contentTitle,
      taskType,
      format,
      qty,
      score,
      cogs,
      status,
      source,
      deadline,
      previewLink,
      stages,
      month,
      year,
      contentId,
      isArchived,
    } = body;

    if (!clientId || !contentTitle) {
      return NextResponse.json({ error: 'Client and Title are required' }, { status: 400 });
    }

    let log;

    // Check if a worklog with the same contentId already exists to prevent duplicate rows (Requirement 9)
    if (contentId) {
      const existing = await prisma.worklog.findFirst({
        where: { contentId },
      });
      if (existing) {
        log = await prisma.worklog.update({
          where: { id: existing.id },
          data: {
            date: date ? new Date(date) : existing.date,
            userId: userId || existing.userId,
            clientId: clientId || existing.clientId,
            contentTitle: contentTitle || existing.contentTitle,
            taskType: taskType || existing.taskType,
            format: format || existing.format,
            qty: Number(qty) || existing.qty,
            score: Number(score) || existing.score,
            cogs: Number(cogs) || existing.cogs,
            status: status || existing.status,
            source: source || existing.source,
            deadline: deadline ? new Date(deadline) : existing.deadline,
            previewLink: previewLink || existing.previewLink,
            stages: stages ? JSON.stringify(stages) : existing.stages,
            month: month || existing.month,
            year: year ? Number(year) : existing.year,
            isArchived: isArchived !== undefined ? isArchived : existing.isArchived,
          },
        });
      }
    }

    if (!log) {
      log = await prisma.worklog.create({
        data: {
          date: date ? new Date(date) : new Date(),
          userId: userId || 'u-jabin',
          clientId,
          contentTitle,
          taskType: taskType || 'Editing',
          format: format || 'Single Foto',
          qty: Number(qty) || 1,
          score: Number(score) || 0,
          cogs: Number(cogs) || 0,
          status: status || 'Completed',
          source: source || 'Manual',
          deadline: deadline ? new Date(deadline) : null,
          previewLink: previewLink || '',
          stages: stages ? JSON.stringify(stages) : null,
          month: month || 'July',
          year: year ? Number(year) : 2026,
          contentId: contentId || '',
          isArchived: isArchived || false,
        },
      });
    }

    return NextResponse.json(log);
  } catch (e: any) {
    console.error('Error creating/updating worklog:', e);
    return NextResponse.json({ error: 'Failed to create worklog', message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Worklog ID required' }, { status: 400 });

    const body = await req.json();
    const updateData: any = {};

    if (body.date !== undefined) updateData.date = new Date(body.date);
    if (body.userId !== undefined) updateData.userId = body.userId;
    if (body.clientId !== undefined) updateData.clientId = body.clientId;
    if (body.contentTitle !== undefined) updateData.contentTitle = body.contentTitle;
    if (body.taskType !== undefined) updateData.taskType = body.taskType;
    if (body.format !== undefined) updateData.format = body.format;
    if (body.qty !== undefined) updateData.qty = Number(body.qty);
    if (body.score !== undefined) updateData.score = Number(body.score);
    if (body.cogs !== undefined) updateData.cogs = Number(body.cogs);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.source !== undefined) updateData.source = body.source;
    if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.previewLink !== undefined) updateData.previewLink = body.previewLink;
    if (body.stages !== undefined) updateData.stages = JSON.stringify(body.stages);
    if (body.month !== undefined) updateData.month = body.month;
    if (body.year !== undefined) updateData.year = Number(body.year);
    if (body.contentId !== undefined) updateData.contentId = body.contentId;

    if (body.isArchived !== undefined) {
      updateData.isArchived = body.isArchived;
      if (body.isArchived) {
        updateData.archivedAt = new Date();
        updateData.archivedBy = req.headers.get('X-User-Id') || 'u-system';
      }
    }

    const updated = await prisma.worklog.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error('Error updating worklog:', e);
    return NextResponse.json({ error: 'Failed to update worklog', message: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Worklog ID required' }, { status: 400 });

    await prisma.worklog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error deleting worklog:', e);
    return NextResponse.json({ error: 'Failed to delete worklog', message: e.message }, { status: 500 });
  }
}
