import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isPicAllowedForTaskType, checkWorklogAccess } from '@/lib/rbac';
import { getDbStatus, normalizeStatusForPipeline, isStrategicPipeline } from '@/lib/status';

async function validateTaskAssignments(stages: any[]): Promise<string | null> {
  if (!stages || !Array.isArray(stages)) return null;

  for (const s of stages) {
    if (!s.userId) continue;
    const assignedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: s.userId },
          { name: { equals: s.userName || s.userId, mode: 'insensitive' as const } },
          { name: { equals: s.userId, mode: 'insensitive' as const } },
        ]
      }
    });
    if (!assignedUser) {
      return `User not found: ${s.userId}`;
    }
    s.userId = assignedUser.id;
    const roles: string[] = typeof assignedUser.roles === 'string' ? JSON.parse(assignedUser.roles) : assignedUser.roles;
    const isAllowed = isPicAllowedForTaskType(roles, s.taskType || s.role);
    if (!isAllowed) {
      return `${assignedUser.name} (${roles.join(', ')}) is not authorized for task type ${s.taskType || s.role}`;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const currentUserId = req.headers.get('X-User-Id') || 'u-system';
    const userRecord = currentUserId ? await prisma.user.findUnique({ where: { id: currentUserId } }) : null;
    if (!userRecord) {
      return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
    }
    const dbRoles = typeof userRecord.roles === 'string' ? JSON.parse(userRecord.roles) : userRecord.roles;

    const body = await req.json();
    const {
      id,
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

    if (!contentTitle) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Role check: non-executives can only create worklogs for themselves
    const isExecutive = dbRoles.includes('Admin') || dbRoles.includes('Owner') || dbRoles.includes('Strategist');
    const targetUserId = userId || currentUserId;
    if (!isExecutive && targetUserId !== currentUserId) {
      return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
    }

    // Validate stage assignments
    if (stages) {
      const err = await validateTaskAssignments(stages);
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    // Safe Client Resolution for Prisma Foreign Key
    let resolvedClientId = clientId;
    const clientRecord = await prisma.client.findFirst({
      where: {
        OR: [
          ...(clientId ? [{ id: clientId }] : []),
          ...(body.clientName ? [{ name: { equals: body.clientName, mode: 'insensitive' as const } }] : []),
          ...(body.clientName ? [{ code: { equals: body.clientName, mode: 'insensitive' as const } }] : []),
          ...(clientId ? [{ name: { equals: clientId, mode: 'insensitive' as const } }] : []),
        ],
      },
    });
    if (clientRecord) {
      resolvedClientId = clientRecord.id;
    } else {
      const anyClient = await prisma.client.findFirst();
      if (anyClient) resolvedClientId = anyClient.id;
    }

    // Safe User Resolution for Prisma Foreign Key
    let resolvedUserId = targetUserId;
    const targetUserRecord = await prisma.user.findFirst({
      where: {
        OR: [
          ...(targetUserId ? [{ id: targetUserId }] : []),
          ...(body.userName ? [{ name: { equals: body.userName, mode: 'insensitive' as const } }] : []),
          ...(targetUserId ? [{ name: { equals: targetUserId, mode: 'insensitive' as const } }] : []),
        ],
      },
    });
    if (targetUserRecord) {
      resolvedUserId = targetUserRecord.id;
    } else {
      const anyUser = await prisma.user.findFirst();
      if (anyUser) resolvedUserId = anyUser.id;
    }

    const isStrategicLog = isStrategicPipeline(body.category, taskType);
    const dbStatus = normalizeStatusForPipeline(status || (isStrategicLog ? 'Completed' : 'Posted'), body.category, taskType);

    // Execute atomic transaction for create & update tasks matching
    const log = await prisma.$transaction(async (tx) => {
      let resolvedLog;

      // Check if a worklog with the same ID already exists to prevent duplicate rows
      if (id && !id.startsWith('worklog-task-')) {
        const existingById = await tx.worklog.findUnique({
          where: { id },
        });
        if (existingById) {
          // Enforce ownership check for existing log update
          const hasAccess = checkWorklogAccess(
            { id: userRecord.id, name: userRecord.name, roles: dbRoles },
            { userId: existingById.userId, stages: existingById.stages }
          );
          if (!hasAccess) {
            throw new Error('UNAUTHORIZED');
          }

          resolvedLog = await tx.worklog.update({
            where: { id },
            data: {
              date: date ? new Date(date) : existingById.date,
              userId: resolvedUserId || existingById.userId,
              clientId: resolvedClientId || existingById.clientId,
              contentTitle: contentTitle || existingById.contentTitle,
              taskType: taskType || existingById.taskType,
              format: format || existingById.format,
              qty: Number(qty) || existingById.qty,
              score: Number(score) || existingById.score,
              cogs: Number(cogs) || existingById.cogs,
              status: dbStatus || existingById.status,
              source: source || existingById.source,
              deadline: deadline ? new Date(deadline) : existingById.deadline,
              previewLink: previewLink || existingById.previewLink,
              stages: stages ? JSON.stringify(stages) : existingById.stages,
              month: month || existingById.month,
              year: year ? Number(year) : existingById.year,
              isArchived: isArchived !== undefined ? isArchived : existingById.isArchived,
            },
          });
        }
      }

      // Check if a worklog with the same contentId and userId already exists so different employees can still share content IDs
      if (!resolvedLog && contentId && contentId.trim() !== '') {
        const existing = await tx.worklog.findFirst({
          where: {
            contentId,
            userId: resolvedUserId,
          },
        });
        if (existing) {
          // Enforce ownership check for existing log update
          const hasAccess = checkWorklogAccess(
            { id: userRecord.id, name: userRecord.name, roles: dbRoles },
            { userId: existing.userId, stages: existing.stages }
          );
          if (!hasAccess) {
            throw new Error('UNAUTHORIZED');
          }

          resolvedLog = await tx.worklog.update({
            where: { id: existing.id },
            data: {
              date: date ? new Date(date) : existing.date,
              userId: resolvedUserId || existing.userId,
              clientId: resolvedClientId || existing.clientId,
              contentTitle: contentTitle || existing.contentTitle,
              taskType: taskType || existing.taskType,
              format: format || existing.format,
              qty: Number(qty) || existing.qty,
              score: Number(score) || existing.score,
              cogs: Number(cogs) || existing.cogs,
              status: dbStatus || existing.status,
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

      if (!resolvedLog) {
        resolvedLog = await tx.worklog.create({
          data: {
            date: date ? new Date(date) : new Date(),
            userId: resolvedUserId || 'u-devi',
            clientId: resolvedClientId,
            contentTitle,
            taskType: taskType || 'Editing',
            format: format || 'Single Foto',
            qty: Number(qty) || 1,
            score: Number(score) || 0,
            cogs: Number(cogs) || 0,
            status: dbStatus || 'Completed',
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

      // Synchronize matching task in database inside transaction
      const cleanTaskId = id && id.startsWith('worklog-task-') ? id.replace(/^worklog-task-/, '') : null;
      const matchingTask = await tx.task.findFirst({
        where: {
          OR: [
            ...(resolvedLog.contentId && resolvedLog.contentId.trim() !== '' ? [{ contentId: resolvedLog.contentId }] : []),
            ...(cleanTaskId ? [{ id: cleanTaskId }] : []),
            ...(cleanTaskId ? [{ id: `task-${cleanTaskId}` }] : []),
            ...(id ? [{ id }] : []),
            ...(id ? [{ id: `task-${id}` }] : []),
            ...(resolvedLog.id ? [{ id: resolvedLog.id }] : []),
            ...(resolvedLog.id ? [{ id: `task-${resolvedLog.id}` }] : []),
          ]
        }
      });

      if (matchingTask) {
        const taskUpdateData: any = {};

        if (contentTitle !== undefined) taskUpdateData.title = contentTitle;
        if (clientId !== undefined) taskUpdateData.clientId = resolvedClientId;
        if (score !== undefined) taskUpdateData.score = Number(score);
        if (taskType !== undefined) taskUpdateData.taskType = taskType;
        if (format !== undefined) taskUpdateData.format = format;
        if (date !== undefined) {
          taskUpdateData.postingDate = new Date(date);
          taskUpdateData.deadline = new Date(date);
        }

        const existingAssignedIds: string[] = matchingTask.assignedUserIds
          ? (typeof matchingTask.assignedUserIds === 'string' ? JSON.parse(matchingTask.assignedUserIds) : matchingTask.assignedUserIds)
          : [];
        const logAssignedIds = resolvedLog.userId ? [resolvedLog.userId] : [];
        const stageAssignedIds = Array.isArray(stages) ? stages.map((s: any) => s.userId).filter(Boolean) : [];
        const mergedAssignedIds = Array.from(new Set([...existingAssignedIds, ...logAssignedIds, ...stageAssignedIds]));
        if (mergedAssignedIds.length) {
          taskUpdateData.assignedUserIds = JSON.stringify(mergedAssignedIds);
        }

        const existingStages = matchingTask.stages
          ? (typeof matchingTask.stages === 'string' ? JSON.parse(matchingTask.stages) : matchingTask.stages)
          : [];
        const parsedLogStages = resolvedLog.stages ? (typeof resolvedLog.stages === 'string' ? JSON.parse(resolvedLog.stages) : resolvedLog.stages) : [];
        const newStages = Array.isArray(stages) ? stages : (Array.isArray(parsedLogStages) ? parsedLogStages : []);
        const mergedStages = [...existingStages];

        for (const s of newStages) {
          const idx = mergedStages.findIndex((es: any) =>
            (s.id && es.id === s.id) || (es.userId === s.userId && es.role === s.role && es.taskType === s.taskType)
          );
          if (idx >= 0) {
            mergedStages[idx] = { ...mergedStages[idx], ...s };
          } else {
            mergedStages.push(s);
          }
        }

        if (mergedStages.length) {
          taskUpdateData.stages = JSON.stringify(mergedStages);
          const computedTotalScore = mergedStages.reduce((sum: number, stg: any) => sum + (Number(stg.score) || 0), 0);
          taskUpdateData.score = computedTotalScore;
          taskUpdateData.cogs = computedTotalScore * 250;
        } else if (stages !== undefined) {
          taskUpdateData.stages = JSON.stringify(stages);
        }
        if (qty !== undefined) taskUpdateData.qty = Number(qty);

        if (body.status !== undefined) {
          const resolvedTaskType = taskType || matchingTask.taskType || '';
          const resolvedCategory = body.category || matchingTask.category || '';
          const coercedStatus = normalizeStatusForPipeline(body.status, resolvedCategory, resolvedTaskType);
          taskUpdateData.status = coercedStatus;

          if (coercedStatus !== matchingTask.status) {
            const existingTimeline = matchingTask.workflowTimeline
              ? JSON.parse(matchingTask.workflowTimeline)
              : [];

            const timeline = Array.isArray(existingTimeline) ? existingTimeline : [];
            timeline.push({
              status: coercedStatus,
              timestamp: new Date().toISOString(),
              userId: currentUserId,
            });

            taskUpdateData.workflowTimeline = JSON.stringify(timeline);

            if (coercedStatus === 'Production' && matchingTask.category === 'Strategic') {
              taskUpdateData.category = 'Production';
              taskUpdateData.handoverUserId = currentUserId;
              taskUpdateData.handoverTime = new Date();
            }

            if (coercedStatus === 'Posted' || coercedStatus === 'Completed') {
              const settings = await tx.companySetting.findFirst();
              if (settings && settings.archiveRule === 'IMMEDIATE') {
                taskUpdateData.isArchived = true;
                taskUpdateData.archivedAt = new Date();
                taskUpdateData.archivedBy = currentUserId;
              }
            }
          }
        }

        await tx.task.update({
          where: { id: matchingTask.id },
          data: taskUpdateData,
        });
      }

      return resolvedLog;
    });

    return NextResponse.json(log);
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
    }
    console.error('Error creating/updating worklog:', e);
    return NextResponse.json({ error: 'Failed to create worklog', message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const rawUserId = req.headers.get('X-User-Id') || 'u-system';
    let userRecord = await prisma.user.findFirst({
      where: {
        OR: [
          { id: rawUserId },
          { name: { equals: rawUserId, mode: 'insensitive' as const } },
        ],
      },
    });

    if (!userRecord) {
      userRecord = await prisma.user.findFirst();
    }

    if (!userRecord) {
      return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
    }
    const currentUserId = userRecord.id;
    const dbRoles = typeof userRecord.roles === 'string' ? JSON.parse(userRecord.roles) : userRecord.roles;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Worklog ID required' }, { status: 400 });

    const existingWorklog = await prisma.worklog.findUnique({ where: { id } });
    if (!existingWorklog) return NextResponse.json({ error: 'Worklog not found' }, { status: 404 });

    // Ownership & Access Control Check
    const hasAccess = checkWorklogAccess(
      { id: userRecord.id, name: userRecord.name, roles: dbRoles },
      { userId: existingWorklog.userId, stages: existingWorklog.stages }
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
    }

    const body = await req.json();

    // Validate stage assignments
    if (body.stages) {
      const err = await validateTaskAssignments(body.stages);
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    const updateData: any = {};

    if (body.date !== undefined) updateData.date = new Date(body.date);
    if (body.userId !== undefined) {
      // Non-executives cannot transfer ownership of logs to others
      const isExecutive = dbRoles.includes('Admin') || dbRoles.includes('Owner') || dbRoles.includes('Strategist');
      if (!isExecutive && body.userId !== currentUserId) {
        return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
      }
      updateData.userId = body.userId;
    }
    if (body.clientId !== undefined) updateData.clientId = body.clientId;
    if (body.contentTitle !== undefined) updateData.contentTitle = body.contentTitle;
    if (body.taskType !== undefined) updateData.taskType = body.taskType;
    if (body.format !== undefined) updateData.format = body.format;
    if (body.qty !== undefined) updateData.qty = Number(body.qty);
    if (body.score !== undefined) updateData.score = Number(body.score);
    if (body.cogs !== undefined) updateData.cogs = Number(body.cogs);
    if (body.status !== undefined) updateData.status = getDbStatus(body.status);
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
        updateData.archivedBy = currentUserId;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.worklog.update({
        where: { id },
        data: updateData,
      });

      // Synchronize to matching task inside transaction
      const cleanTaskId = id && id.startsWith('worklog-task-') ? id.replace(/^worklog-task-/, '') : null;
      const matchingTask = await tx.task.findFirst({
        where: {
          OR: [
            ...(res.contentId && res.contentId.trim() !== '' ? [{ contentId: res.contentId }] : []),
            ...(cleanTaskId ? [{ id: cleanTaskId }] : []),
            ...(cleanTaskId ? [{ id: `task-${cleanTaskId}` }] : []),
            ...(id ? [{ id }] : []),
            ...(id ? [{ id: `task-${id}` }] : []),
            ...(res.id ? [{ id: res.id }] : []),
            ...(res.id ? [{ id: `task-${res.id}` }] : []),
          ]
        }
      });

      if (matchingTask) {
        const taskUpdateData: any = {};
        if (body.contentTitle !== undefined) taskUpdateData.title = body.contentTitle;
        if (body.clientId !== undefined) taskUpdateData.clientId = body.clientId;
        if (body.score !== undefined) taskUpdateData.score = body.score;
        if (body.taskType !== undefined) taskUpdateData.taskType = body.taskType;
        if (body.format !== undefined) taskUpdateData.format = body.format;
        if (body.date !== undefined) {
          taskUpdateData.postingDate = new Date(body.date);
          taskUpdateData.deadline = new Date(body.date);
        }

        const existingAssignedIds: string[] = matchingTask.assignedUserIds
          ? (typeof matchingTask.assignedUserIds === 'string' ? JSON.parse(matchingTask.assignedUserIds) : matchingTask.assignedUserIds)
          : [];
        const logAssignedIds = res.userId ? [res.userId] : [];
        const stageAssignedIds = Array.isArray(res.stages) ? res.stages.map((s: any) => s.userId).filter(Boolean) : [];
        const mergedAssignedIds = Array.from(new Set([...existingAssignedIds, ...logAssignedIds, ...stageAssignedIds]));
        if (mergedAssignedIds.length) {
          taskUpdateData.assignedUserIds = JSON.stringify(mergedAssignedIds);
        }

        const existingStages = matchingTask.stages ? (typeof matchingTask.stages === 'string' ? JSON.parse(matchingTask.stages) : matchingTask.stages) : [];
        const parsedResStages = res.stages ? (typeof res.stages === 'string' ? JSON.parse(res.stages) : res.stages) : [];
        const newStages = Array.isArray(parsedResStages) ? parsedResStages : [];
        const mergedStages = [...existingStages];
        for (const s of newStages) {
          const idx = mergedStages.findIndex((es: any) =>
            (s.id && es.id === s.id) || (es.userId === s.userId && es.role === s.role && es.taskType === s.taskType)
          );
          if (idx >= 0) {
            mergedStages[idx] = { ...mergedStages[idx], ...s };
          } else {
            mergedStages.push(s);
          }
        }
        if (mergedStages.length) {
          taskUpdateData.stages = JSON.stringify(mergedStages);
          const computedTotalScore = mergedStages.reduce((sum: number, stg: any) => sum + (Number(stg.score) || 0), 0);
          taskUpdateData.score = computedTotalScore;
          taskUpdateData.cogs = computedTotalScore * 250;
        } else if (body.stages !== undefined) {
          taskUpdateData.stages = JSON.stringify(body.stages);
        }
        if (body.stages !== undefined && !taskUpdateData.stages) {
          taskUpdateData.stages = JSON.stringify(body.stages);
        }
        if (body.qty !== undefined) taskUpdateData.qty = Number(body.qty);
        if (body.status !== undefined) {
          const resolvedTaskType = body.taskType || matchingTask.taskType || '';
          const resolvedCategory = body.category || matchingTask.category || '';
          const coercedStatus = normalizeStatusForPipeline(body.status, resolvedCategory, resolvedTaskType);
          taskUpdateData.status = coercedStatus;

          if (coercedStatus !== matchingTask.status) {
            const timeline = JSON.parse(matchingTask.workflowTimeline || '[]');
            timeline.push({
              status: coercedStatus,
              timestamp: new Date().toISOString(),
              userId: currentUserId,
            });
            taskUpdateData.workflowTimeline = JSON.stringify(timeline);

            if (coercedStatus === 'Production' && matchingTask.category === 'Strategic') {
              taskUpdateData.category = 'Production';
              taskUpdateData.handoverUserId = currentUserId;
              taskUpdateData.handoverTime = new Date();
            }

            if (coercedStatus === 'Posted' || coercedStatus === 'Completed') {
              const settings = await tx.companySetting.findFirst();
              if (settings && settings.archiveRule === 'IMMEDIATE') {
                taskUpdateData.isArchived = true;
                taskUpdateData.archivedAt = new Date();
                taskUpdateData.archivedBy = currentUserId;
              }
            }
          }
        }

        await tx.task.update({
          where: { id: matchingTask.id },
          data: taskUpdateData,
        });

        // Create Activity Log for the task transition
        if (body.status !== undefined && getDbStatus(body.status) !== matchingTask.status) {
          await tx.activityLog.create({
            data: {
              userId: currentUserId,
              entityType: 'TASK',
              entityId: matchingTask.id,
              action: 'MOVED',
              details: `Task status synchronized from worklog status update to ${body.status}`,
            }
          });
        }
      }

      return res;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error('Error updating worklog:', e);
    return NextResponse.json({ error: 'Failed to update worklog', message: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const rawUserId = req.headers.get('X-User-Id') || 'u-system';
    let userRecord = await prisma.user.findFirst({
      where: {
        OR: [
          { id: rawUserId },
          { name: { equals: rawUserId, mode: 'insensitive' as const } },
        ],
      },
    });

    if (!userRecord) {
      userRecord = await prisma.user.findFirst();
    }

    if (!userRecord) {
      return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
    }
    const currentUserId = userRecord.id;
    const dbRoles = typeof userRecord.roles === 'string' ? JSON.parse(userRecord.roles) : userRecord.roles;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Worklog ID required' }, { status: 400 });

    const cleanId = id.replace(/^(worklog-task|task|worklog|wl)-/, '');
    const existingWorklog = await prisma.worklog.findFirst({
      where: {
        OR: [
          { id },
          { id: cleanId },
          { id: `wl-${cleanId}` },
          { contentId: id },
          { contentId: cleanId },
        ]
      }
    });
    if (!existingWorklog) return NextResponse.json({ error: 'Worklog not found' }, { status: 404 });

    // Ownership & Access Control Check
    const hasAccess = checkWorklogAccess(
      { id: userRecord.id, name: userRecord.name, roles: dbRoles },
      { userId: existingWorklog.userId, stages: existingWorklog.stages }
    );
    const isAllowedRole = Array.isArray(dbRoles) && dbRoles.some((r: string) => ['Admin', 'Owner', 'Strategist', 'Editor', 'Production Assistant', 'Scheduler'].includes(r));
    if (!hasAccess && !isAllowedRole) {
      return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
    }

    await prisma.worklog.delete({ where: { id: existingWorklog.id } });

    if (existingWorklog.clientId) {
      const client = await prisma.client.findUnique({ where: { id: existingWorklog.clientId } });
      if (client) {
        const stages = existingWorklog.stages ? (typeof existingWorklog.stages === 'string' ? JSON.parse(existingWorklog.stages) : existingWorklog.stages) : [];
        const stageScore = Array.isArray(stages) ? stages.reduce((sum: number, s: any) => sum + (Number(s.score) || 0), 0) : 0;
        const wlScore = stageScore || existingWorklog.score || 0;
        const newUsed = Math.max(0, client.usedPoint - wlScore);
        await prisma.client.update({
          where: { id: existingWorklog.clientId },
          data: {
            usedPoint: newUsed,
            remainingPoint: client.monthlyPointBudget - newUsed,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error deleting worklog:', e);
    return NextResponse.json({ error: 'Failed to delete worklog', message: e.message }, { status: 500 });
  }
}
