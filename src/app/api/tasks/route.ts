import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculatePriority } from '@/lib/score-calculator';

function checkAuth(req: Request, allowedRoles: string[]): boolean {
  const userRoleHeader = req.headers.get('X-User-Role') || '';
  if (!userRoleHeader) return true; // Fallback if header is omitted
  const roles = userRoleHeader.split(',').map((r) => r.trim());
  if (roles.includes('Admin') || roles.includes('Owner')) return true;
  return roles.some((role) => allowedRoles.includes(role));
}

export async function POST(req: Request) {
  try {
    const userRoleHeader = req.headers.get('X-User-Role') || '';
    const currentUserId = req.headers.get('X-User-Id') || 'u-system';
    const roles = userRoleHeader.split(',').map((r) => r.trim());
    const isAdmin = roles.includes('Admin') || roles.includes('Owner');

    const body = await req.json();
    const category = body.category || 'Editor';

    // Role restrictions on creation (Requirement 7 & 8)
    if (!isAdmin) {
      if (category === 'Strategic' && !roles.includes('Strategist')) {
        return NextResponse.json({ error: 'Only Strategists can create Strategic tasks' }, { status: 403 });
      }
      if (category === 'Production' && roles.includes('Scheduler') && !roles.includes('Strategist')) {
        return NextResponse.json({ error: 'Schedulers cannot create Production tasks' }, { status: 403 });
      }
      const isAllowedCreator = roles.some((r) =>
        ['Strategist', 'Editor', 'Scheduler', 'Production Assistant'].includes(r)
      );
      if (!isAllowedCreator) {
        return NextResponse.json({ error: 'Unauthorized role to create tasks' }, { status: 403 });
      }
    }

    // Force starting status based on category (Requirement 8)
    let defaultStatus = 'Brief';
    if (category === 'Strategic') defaultStatus = 'Brief';
    else if (category === 'Production') defaultStatus = 'Production';
    else if (category === 'Editing') defaultStatus = 'Editing';
    else if (category === 'Scheduling') defaultStatus = 'Scheduling';

    const deadline = new Date(body.deadline || Date.now());
    const computedPriority = calculatePriority(deadline, defaultStatus, body.postingDate);

    // Initial timeline
    const timeline = [
      {
        status: defaultStatus,
        timestamp: new Date().toISOString(),
        userId: currentUserId,
      }
    ];

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title: body.title,
          description: body.description || '',
          category,
          taskType: body.taskType || 'Editing',
          format: body.format || 'Reels',
          qty: body.qty || 1,
          priority: computedPriority,
          status: defaultStatus,
          clientId: body.clientId,
          workspaceId: body.workspaceId || null,
          postingDate: body.postingDate ? new Date(body.postingDate) : null,
          deadline,
          assignedUserIds: JSON.stringify(body.assignedUserIds || []),
          score: body.score || 0,
          cogs: body.cogs || 0,
          driveLink: body.driveLink || '',
          previewLink: body.previewLink || '',
          checklist: JSON.stringify(body.checklist || []),
          comments: JSON.stringify(body.comments || []),
          stages: body.stages ? JSON.stringify(body.stages) : null,
          month: body.month || 'July',
          year: body.year ? Number(body.year) : 2026,
          contentId: body.contentId || `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          isArchived: body.isArchived || false,
          workflowTimeline: JSON.stringify(timeline),
        },
      });

      // Sync Client Budget and Score Leaderboard inside transaction (Requirement 10)
      const tasks = await tx.task.findMany({ where: { clientId: body.clientId, isArchived: false } });
      const usedPoint = tasks.reduce((sum, t) => sum + (t.score || 0), 0);
      const client = await tx.client.findUnique({ where: { id: body.clientId } });
      if (client) {
        await tx.client.update({
          where: { id: body.clientId },
          data: {
            usedPoint,
            remainingPoint: client.monthlyPointBudget - usedPoint,
          },
        });
      }

      return created;
    });

    return NextResponse.json(task);
  } catch (e) {
    console.error('Error creating task:', e);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userRoleHeader = req.headers.get('X-User-Role') || '';
    const roles = userRoleHeader.split(',').map((r) => r.trim());
    const isAdmin = roles.includes('Admin') || roles.includes('Owner');
    const currentUserId = req.headers.get('X-User-Id') || 'u-system';

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const assignedIds = JSON.parse(existingTask.assignedUserIds || '[]');
    const isAssigned = assignedIds.includes(currentUserId);

    // Enforce role-based edit permissions (Requirement 7)
    if (!isAdmin) {
      if (roles.includes('Production Assistant') && existingTask.category === 'Production' && !isAssigned) {
        return NextResponse.json({ error: 'You can only update your own Production tasks' }, { status: 403 });
      }
      if (roles.includes('Editor') && (existingTask.category === 'Editing' || existingTask.category === 'Editor') && !isAssigned) {
        return NextResponse.json({ error: 'You can only update your own Editing tasks' }, { status: 403 });
      }
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.taskType !== undefined) updateData.taskType = body.taskType;
    if (body.format !== undefined) updateData.format = body.format;
    if (body.qty !== undefined) updateData.qty = Number(body.qty);
    if (body.clientId !== undefined) updateData.clientId = body.clientId;
    if (body.workspaceId !== undefined) updateData.workspaceId = body.workspaceId || null;
    if (body.month !== undefined) updateData.month = body.month;
    if (body.year !== undefined) updateData.year = Number(body.year);
    if (body.contentId !== undefined) updateData.contentId = body.contentId;

    if (body.postingDate !== undefined) {
      updateData.postingDate = body.postingDate ? new Date(body.postingDate) : null;
    }

    // Set stage status and track transition log (Requirement 7)
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status !== existingTask.status) {
        const timeline = JSON.parse(existingTask.workflowTimeline || '[]');
        timeline.push({
          status: body.status,
          timestamp: new Date().toISOString(),
          userId: currentUserId,
        });
        updateData.workflowTimeline = JSON.stringify(timeline);

        // Check if hand-off from Strategic to Production occurs (Requirement 1 & 6)
        if (body.status === 'Production' && existingTask.category === 'Strategic') {
          updateData.category = 'Production';
          updateData.handoverUserId = currentUserId;
          updateData.handoverTime = new Date();
        }
      }
    }

    if (body.isArchived !== undefined) {
      updateData.isArchived = body.isArchived;
      if (body.isArchived) {
        updateData.archivedAt = new Date();
        updateData.archivedBy = currentUserId;
      }
    }

    const postingDateVal = body.postingDate !== undefined ? body.postingDate : existingTask.postingDate;
    const deadlineVal = body.deadline !== undefined ? new Date(body.deadline) : existingTask.deadline;
    const statusVal = body.status !== undefined ? body.status : existingTask.status;

    if (body.deadline !== undefined) {
      updateData.deadline = deadlineVal;
    }

    // Recompute priority using posting date and stage (Requirement 3)
    updateData.priority = calculatePriority(deadlineVal, statusVal, postingDateVal);

    // Assignment restrictions (Requirement 7)
    if (body.assignedUserIds !== undefined) {
      const newAssignedIds = Array.isArray(body.assignedUserIds) ? body.assignedUserIds : JSON.parse(body.assignedUserIds || '[]');
      if (!isAdmin && !roles.includes('Strategist')) {
        const isSelfAssign = newAssignedIds.length <= 1 && (newAssignedIds.length === 0 || newAssignedIds[0] === currentUserId);
        const noChange = JSON.stringify(newAssignedIds.sort()) === JSON.stringify(assignedIds.sort());
        if (!isSelfAssign && !noChange) {
          return NextResponse.json({ error: 'You are not authorized to assign other employees' }, { status: 403 });
        }
      }
      updateData.assignedUserIds = JSON.stringify(newAssignedIds);
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

    // Execute atomic transaction to sync task changes and client budget usage (Requirement 10)
    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.task.update({
        where: { id },
        data: updateData,
      });

      const syncId = body.clientId || existingTask.clientId;
      const tasks = await tx.task.findMany({ where: { clientId: syncId, isArchived: false } });
      const usedPoint = tasks.reduce((sum, t) => sum + (t.score || 0), 0);
      const client = await tx.client.findUnique({ where: { id: syncId } });
      if (client) {
        await tx.client.update({
          where: { id: syncId },
          data: {
            usedPoint,
            remainingPoint: client.monthlyPointBudget - usedPoint,
          },
        });
      }

      if (body.clientId && body.clientId !== existingTask.clientId) {
        const oldTasks = await tx.task.findMany({ where: { clientId: existingTask.clientId, isArchived: false } });
        const oldUsedPoint = oldTasks.reduce((sum, t) => sum + (t.score || 0), 0);
        const oldClient = await tx.client.findUnique({ where: { id: existingTask.clientId } });
        if (oldClient) {
          await tx.client.update({
            where: { id: existingTask.clientId },
            data: {
              usedPoint: oldUsedPoint,
              remainingPoint: oldClient.monthlyPointBudget - oldUsedPoint,
            },
          });
        }
      }

      return res;
    });

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
      await prisma.client.update({
        where: { id: oldTask.clientId },
        data: {
          usedPoint: { decrement: oldTask.score },
          remainingPoint: { increment: oldTask.score },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting task:', e);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
