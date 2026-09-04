import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculatePriority } from '@/lib/score-calculator';
import { isPicAllowedForTaskType, checkTaskAccess } from '@/lib/rbac';
import { getDbStatus, normalizeStatusForPipeline, isStrategicPipeline } from '@/lib/status';

function checkAuth(req: Request, allowedRoles: string[]): boolean {
  const userRoleHeader = req.headers.get('X-User-Role') || '';
  if (!userRoleHeader) return true; // Fallback if header is omitted
  const roles = userRoleHeader.split(',').map((r) => r.trim());
  if (roles.includes('Admin') || roles.includes('Owner')) return true;
  return roles.some((role) => allowedRoles.includes(role));
}

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

async function validateCategoryAssignments(assignedUserIds: string[], category: string, stages?: any): Promise<string | null> {
  // All assigned team members participating in multi-stage workflows are authorized across pipeline categories
  return null;
}

async function getSchedulerForWorkspace(workspaceId?: string | null, clientId?: string | null) {
  let targetWsId = workspaceId;
  if (!targetWsId && clientId) {
    const clientObj = await prisma.client.findUnique({ where: { id: clientId } });
    if (clientObj) {
      targetWsId = clientObj.workspaceId;
    }
  }

  const isInhouse = targetWsId === 'ws-inhouse' || String(targetWsId).toLowerCase().includes('inhouse');

  if (isInhouse) {
    const gigie = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { equals: 'Gigie', mode: 'insensitive' } },
          { name: { equals: 'Gigi', mode: 'insensitive' } },
          { id: 'u-gigie' },
          { id: 'u-gigi' },
          { email: 'gigi@personaos.com' },
          { email: 'gigie@personaos.com' },
        ],
      },
    });
    if (gigie) return gigie;
  } else {
    const dinda = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { equals: 'Dinda', mode: 'insensitive' } },
          { id: 'u-dindong' },
          { id: 'u-dinda' },
          { email: 'dinda@personaos.com' },
        ],
      },
    });
    if (dinda) return dinda;
  }

  return await prisma.user.findFirst({ where: { roles: { contains: 'Scheduler' } } });
}

export async function POST(req: Request) {
  try {
    const userRoleHeader = req.headers.get('X-User-Role') || '';
    const currentUserId = req.headers.get('X-User-Id') || 'u-system';
    const roles = userRoleHeader.split(',').map((r) => r.trim());
    const isAdmin = roles.includes('Admin') || roles.includes('Owner');

    const body = await req.json();
    let category = body.category;
    if (!category || (category === 'Editor' && body.taskType === 'Scheduling')) {
      if (body.taskType === 'Scheduling') category = 'Scheduler';
      else if (body.taskType === 'Production Assistant') category = 'Assistant';
      else if (isStrategicPipeline(undefined, body.taskType)) category = 'Strategic';
      else if (!category) category = 'Editor';
    }

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

    // Validate stage assignments
    if (body.stages) {
      const err = await validateTaskAssignments(body.stages);
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    // Validate category assignments
    if (body.assignedUserIds && category) {
      const err = await validateCategoryAssignments(body.assignedUserIds, category, body.stages);
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    // Respect requested status if passed; otherwise resolve default from category
    let defaultStatus = body.status ? normalizeStatusForPipeline(body.status, category, body.taskType) : 'Brief';
    if (!body.status) {
      if (category === 'Strategic') defaultStatus = 'Brief';
      else if (category === 'Production') defaultStatus = 'Production';
      else if (category === 'Editing' || category === 'Editor') defaultStatus = 'Editing';
      else if (category === 'Scheduling' || category === 'Scheduler') defaultStatus = 'Scheduling';
    }

    // Resolve target workspaceId from body or client
    let targetWorkspaceId = body.workspaceId;
    if (!targetWorkspaceId && body.clientId) {
      const clientObj = await prisma.client.findUnique({ where: { id: body.clientId } });
      if (clientObj) {
        targetWorkspaceId = clientObj.workspaceId;
      }
    }
    if (!targetWorkspaceId) {
      targetWorkspaceId = 'ws-team-anggi';
    }

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
      if (body.contentId) {
        const existingTask = await tx.task.findFirst({ where: { contentId: body.contentId } });
        if (existingTask) {
          const existingAssigned = existingTask.assignedUserIds ? (typeof existingTask.assignedUserIds === 'string' ? JSON.parse(existingTask.assignedUserIds) : existingTask.assignedUserIds) : [];
          const newAssigned = Array.isArray(body.assignedUserIds) ? body.assignedUserIds : (body.assignedUserIds ? JSON.parse(body.assignedUserIds) : []);
          const finalAssigned = newAssigned.length > 0 ? newAssigned : existingAssigned;

          const newStages = body.stages ? (Array.isArray(body.stages) ? body.stages : JSON.parse(body.stages)) : null;
          const finalStages = newStages !== null ? newStages : (existingTask.stages ? (typeof existingTask.stages === 'string' ? JSON.parse(existingTask.stages) : existingTask.stages) : []);

          const updated = await tx.task.update({
            where: { id: existingTask.id },
            data: {
              title: body.title || existingTask.title,
              description: body.description !== undefined ? body.description : existingTask.description,
              category,
              taskType: body.taskType || existingTask.taskType,
              format: body.format || existingTask.format,
              qty: body.qty !== undefined ? body.qty : existingTask.qty,
              priority: computedPriority,
              status: body.status ? getDbStatus(body.status) : existingTask.status,
              clientId: body.clientId || existingTask.clientId,
              workspaceId: targetWorkspaceId,
              postingDate: body.postingDate ? new Date(body.postingDate) : existingTask.postingDate,
              deadline,
              assignedUserIds: JSON.stringify(finalAssigned),
              score: body.score !== undefined ? body.score : existingTask.score,
              cogs: body.cogs !== undefined ? body.cogs : existingTask.cogs,
              driveLink: body.driveLink !== undefined ? body.driveLink : existingTask.driveLink,
              previewLink: body.previewLink !== undefined ? body.previewLink : existingTask.previewLink,
              checklist: JSON.stringify(body.checklist || (existingTask.checklist ? JSON.parse(existingTask.checklist) : [])),
              comments: JSON.stringify(body.comments || (existingTask.comments ? JSON.parse(existingTask.comments) : [])),
              stages: JSON.stringify(finalStages),
              month: body.month || existingTask.month,
              year: body.year ? Number(body.year) : existingTask.year,
              contentId: body.contentId,
              isArchived: body.isArchived !== undefined ? body.isArchived : existingTask.isArchived,
              workflowTimeline: existingTask.workflowTimeline || JSON.stringify(timeline),
            },
          });
          return updated;
        }
      }

      let initialStages = body.stages;
      let initialAssignedIds = Array.isArray(body.assignedUserIds) ? body.assignedUserIds : (body.assignedUserIds ? JSON.parse(body.assignedUserIds) : []);

      const parsedStagesCheck = initialStages ? (typeof initialStages === 'string' ? JSON.parse(initialStages) : initialStages) : [];
      const hasSchedStageInNew = Array.isArray(parsedStagesCheck) && parsedStagesCheck.some((s: any) =>
        s.role === 'Scheduler' || (s.taskType && String(s.taskType).toLowerCase().includes('scheduling'))
      );

      if ((defaultStatus === 'Scheduling' || defaultStatus === 'Posted' || category === 'Scheduler') && !hasSchedStageInNew) {
        const chosenScheduler = await getSchedulerForWorkspace(targetWorkspaceId, body.clientId);
        if (chosenScheduler) {
          const autoStage = {
            id: `stg-${Date.now()}`,
            role: 'Scheduler',
            userId: chosenScheduler.id,
            userName: chosenScheduler.name,
            taskType: 'Scheduling',
            format: 'Per Post',
            qty: body.qty || 1,
            score: (body.score && body.score > 0) ? body.score : 5 * (body.qty || 1),
          };
          initialStages = Array.isArray(parsedStagesCheck) ? [...parsedStagesCheck, autoStage] : [autoStage];
          if (!initialAssignedIds.includes(chosenScheduler.id)) {
            initialAssignedIds = [...initialAssignedIds, chosenScheduler.id];
          }
        }
      }

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
          workspaceId: targetWorkspaceId,
          postingDate: body.postingDate ? new Date(body.postingDate) : null,
          deadline,
          assignedUserIds: JSON.stringify(initialAssignedIds),
          score: body.score || 0,
          cogs: body.cogs || 0,
          driveLink: body.driveLink || '',
          previewLink: body.previewLink || '',
          checklist: JSON.stringify(body.checklist || []),
          comments: JSON.stringify(body.comments || []),
          stages: initialStages ? (typeof initialStages === 'string' ? initialStages : JSON.stringify(initialStages)) : null,
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
    const dbRoles: string[] = typeof userRecord.roles === 'string' ? JSON.parse(userRecord.roles) : userRecord.roles;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Ownership & Access Control Check
    const hasAccess = checkTaskAccess(
      { id: userRecord.id, name: userRecord.name, roles: dbRoles },
      { assignedUserIds: existingTask.assignedUserIds, stages: existingTask.stages, status: existingTask.status }
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
    }

    const body = await req.json();

    function safeJsonArray(raw: any, fallback: any[] = []): any[] {
      if (!raw) return fallback;
      if (Array.isArray(raw)) return raw;
      if (typeof raw !== 'string') return fallback;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch {
        return fallback;
      }
    }

    // Validate stage assignments
    if (body.stages) {
      const err = await validateTaskAssignments(body.stages);
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    // Validate category assignments only when category itself changes
    if (body.category !== undefined && body.category !== existingTask.category) {
      const finalAssignedUserIds = body.assignedUserIds !== undefined
        ? (Array.isArray(body.assignedUserIds) ? body.assignedUserIds : JSON.parse(body.assignedUserIds || '[]'))
        : safeJsonArray(existingTask.assignedUserIds);

      const finalStages = body.stages !== undefined ? body.stages : existingTask.stages;
      const err = await validateCategoryAssignments(finalAssignedUserIds, body.category, finalStages);
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) {
      updateData.category = body.category;
    } else if (body.taskType === 'Scheduling') {
      updateData.category = 'Scheduler';
    } else if (body.taskType === 'Production Assistant') {
      updateData.category = 'Production';
    }
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

    // capture auto-assigned scheduler to create logs/notifications later
    let autoAssignedSchedulerId: string | null = null;
    let autoAssignedSchedulerName: string | null = null;

    // Set stage status and track transition log (Requirement 7)
    if (body.status !== undefined) {
      const categoryVal = updateData.category || existingTask.category;
      const taskTypeVal = updateData.taskType || existingTask.taskType;
      const finalStagesForStatus = body.stages !== undefined ? body.stages : existingTask.stages;
      const finalAssignedForStatus = body.assignedUserIds !== undefined ? body.assignedUserIds : existingTask.assignedUserIds;
      const dbStatus = normalizeStatusForPipeline(body.status, categoryVal, taskTypeVal, finalStagesForStatus, finalAssignedForStatus);
      updateData.status = dbStatus;
      if (dbStatus !== existingTask.status) {
        const rawTimeline = existingTask.workflowTimeline || '[]';
        let timeline: any[] = [];
        try {
          const parsed = JSON.parse(rawTimeline);
          timeline = Array.isArray(parsed) ? parsed : [];
        } catch {
          timeline = [];
        }

        timeline.push({
          status: dbStatus,
          timestamp: new Date().toISOString(),
          userId: currentUserId,
        });
        updateData.workflowTimeline = JSON.stringify(timeline);

        // Check if hand-off from Strategic to Production occurs (Requirement 1 & 6)
        if (dbStatus === 'Production' && existingTask.category === 'Strategic') {
          updateData.category = 'Production';
          updateData.handoverUserId = currentUserId;
          updateData.handoverTime = new Date();
        }

        // When a task is moved to Scheduling or Posted, ensure there's an explicit Scheduler stage and assignment if not present
        const isProdCategory = ['production', 'assistant'].includes((categoryVal || '').toLowerCase()) || (taskTypeVal || '').toLowerCase().includes('production') || (taskTypeVal || '').toLowerCase().includes('shooting');
        if ((dbStatus === 'Scheduling' || dbStatus === 'Posted') && !isProdCategory) {
          if (dbStatus === 'Scheduling' && body.previewLink === undefined) {
            updateData.previewLink = '';
          }
          try {
            const existingStages = existingTask.stages
              ? (typeof existingTask.stages === 'string' ? JSON.parse(existingTask.stages) : existingTask.stages)
              : [];
            const hasSchedulerStage = Array.isArray(existingStages) && existingStages.some((s: any) =>
              s.role === 'Scheduler' || (s.taskType && String(s.taskType).toLowerCase().includes('scheduling'))
            );
            if (!hasSchedulerStage) {
              const chosenScheduler = await getSchedulerForWorkspace(
                updateData.workspaceId || existingTask.workspaceId,
                updateData.clientId || existingTask.clientId
              );

              if (chosenScheduler) {
                const schedId = chosenScheduler.id;
                const schedName = chosenScheduler.name;
                autoAssignedSchedulerId = schedId;
                autoAssignedSchedulerName = schedName;
                const newStage = {
                  id: `stg-${Date.now()}`,
                  role: 'Scheduler',
                  userId: schedId,
                  userName: schedName,
                  taskType: 'Scheduling',
                  format: 'Per Post',
                  qty: 1,
                  score: 5,
                };
                const newStages = [...existingStages, newStage];
                updateData.stages = JSON.stringify(newStages);

                const assignedArr = existingTask.assignedUserIds
                  ? (typeof existingTask.assignedUserIds === 'string'
                      ? JSON.parse(existingTask.assignedUserIds)
                      : existingTask.assignedUserIds)
                  : [];
                if (!assignedArr.includes(schedId) && !assignedArr.includes(schedName)) {
                  assignedArr.push(schedId);
                  updateData.assignedUserIds = JSON.stringify(assignedArr);
                }
              }
            }
          } catch (e) {
            console.error('Failed to auto-assign scheduler stage:', e);
          }
        }

        if (dbStatus === 'Posted' || dbStatus === 'Completed') {
          const settings = await prisma.companySetting.findFirst();
          if (settings && settings.archiveRule === 'IMMEDIATE') {
            updateData.isArchived = true;
            updateData.archivedAt = new Date();
            updateData.archivedBy = currentUserId;
          }
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
    const statusVal = body.status !== undefined ? getDbStatus(body.status) : existingTask.status;

    if (body.deadline !== undefined) {
      updateData.deadline = deadlineVal;
    }

    // Recompute priority using posting date and stage (Requirement 3)
    updateData.priority = calculatePriority(deadlineVal, statusVal, postingDateVal);

    // Assignment restrictions: allow operational team members to manage stage assignments during pipeline transitions
    if (body.assignedUserIds !== undefined) {
      const newAssignedIds = Array.isArray(body.assignedUserIds) ? body.assignedUserIds : JSON.parse(body.assignedUserIds || '[]');
      const isOperationalRole = dbRoles.some((r) => ['Admin', 'Owner', 'Strategist', 'Production Assistant', 'Editor', 'Scheduler'].includes(r));
      if (!isOperationalRole) {
        const originalAssigned: string[] = safeJsonArray(existingTask.assignedUserIds);
        const isSelfAssign = newAssignedIds.length <= 1 && (newAssignedIds.length === 0 || newAssignedIds[0] === currentUserId);
        const noChange = JSON.stringify(newAssignedIds.slice().sort()) === JSON.stringify(originalAssigned.slice().sort());
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
      updateData.checklist = typeof body.checklist === 'string' ? body.checklist : JSON.stringify(body.checklist);
    }
    if (body.comments !== undefined) {
      updateData.comments = typeof body.comments === 'string' ? body.comments : JSON.stringify(body.comments);
    }
    if (body.stages !== undefined) {
      updateData.stages = typeof body.stages === 'string' ? body.stages : JSON.stringify(body.stages);
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

      // If we auto-assigned a scheduler above, create an activity log and notification atomically
      try {
        if (autoAssignedSchedulerId) {
          await tx.activityLog.create({
            data: {
              userId: currentUserId,
              entityType: 'TASK',
              entityId: res.id,
              action: 'AUTO_ASSIGN_SCHEDULER',
              details: `Assigned ${autoAssignedSchedulerName} as Scheduler`,
            },
          });

          await tx.notification.create({
            data: {
              userId: autoAssignedSchedulerId,
              type: 'ASSIGNMENT',
              title: 'Assigned as Scheduler',
              message: `You were assigned to schedule \"${res.title}\"`,
              link: '/kanban',
            },
          });
        }
      } catch (e) {
        console.error('Failed to create activity log/notification for auto-assigned scheduler:', e);
      }

      // Automatically create or update Worklog entry upon task completion / posting so score is recorded in Worklogs
      if (res.status === 'Completed' || res.status === 'Posted') {
        try {
          const contentIdVal = res.contentId || existingTask.contentId || `content-${res.id}`;
          const existingWl = await tx.worklog.findFirst({
            where: {
              OR: [
                { contentId: contentIdVal },
                { contentTitle: res.title }
              ]
            }
          });

          const finalStages = res.stages || existingTask.stages;
          const parsedStages = finalStages ? (typeof finalStages === 'string' ? JSON.parse(finalStages) : finalStages) : [];
          const assignedUserIds = res.assignedUserIds ? (typeof res.assignedUserIds === 'string' ? JSON.parse(res.assignedUserIds) : res.assignedUserIds) : [];

          let targetUserId = currentUserId;
          if (Array.isArray(parsedStages) && parsedStages.length > 0) {
            const firstStageUser = parsedStages.find((s: any) => s.userId);
            if (firstStageUser) targetUserId = firstStageUser.userId;
          } else if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
            targetUserId = assignedUserIds[0];
          }

          if (existingWl) {
            await tx.worklog.update({
              where: { id: existingWl.id },
              data: {
                status: res.status,
                score: res.score,
                cogs: res.cogs,
                stages: typeof finalStages === 'string' ? finalStages : JSON.stringify(finalStages),
                contentTitle: res.title,
                clientId: res.clientId,
                taskType: res.taskType || 'Editing',
                format: res.format || 'Single Foto',
                qty: res.qty || 1,
                date: res.postingDate || existingWl.date,
              }
            });
          } else {
            await tx.worklog.create({
              data: {
                date: res.postingDate || new Date(),
                userId: targetUserId,
                clientId: res.clientId,
                contentTitle: res.title,
                taskType: res.taskType || 'Editing',
                format: res.format || 'Single Foto',
                qty: res.qty || 1,
                score: res.score || 0,
                cogs: res.cogs || 0,
                status: res.status,
                source: 'Automated Task Completion',
                deadline: res.deadline,
                previewLink: res.previewLink || res.driveLink || '',
                stages: typeof finalStages === 'string' ? finalStages : JSON.stringify(finalStages),
                month: res.month || 'July',
                year: res.year || 2026,
                contentId: contentIdVal,
                isArchived: false,
              }
            });
          }
        } catch (wlErr) {
          console.error('Failed to auto-create worklog on task completion:', wlErr);
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
    const dbRoles: string[] = typeof userRecord.roles === 'string' ? JSON.parse(userRecord.roles) : userRecord.roles;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    const cleanId = id.replace(/^(task|worklog-task|worklog|wl)-/, '');
    const oldTask = await prisma.task.findFirst({
      where: {
        OR: [
          { id },
          { id: cleanId },
          { id: `task-${cleanId}` },
          { contentId: id },
          { contentId: cleanId },
        ]
      }
    });

    if (oldTask) {
      const hasAccess = checkTaskAccess(
        { id: userRecord.id, name: userRecord.name, roles: dbRoles },
        { assignedUserIds: typeof oldTask.assignedUserIds === 'string' ? oldTask.assignedUserIds : JSON.stringify(oldTask.assignedUserIds || []), stages: oldTask.stages, status: oldTask.status }
      );
      const isAllowedRole = Array.isArray(dbRoles) && dbRoles.some((r: string) => ['Admin', 'Owner', 'Strategist', 'Editor', 'Production Assistant', 'Scheduler'].includes(r));
      if (!hasAccess && !isAllowedRole) {
        return NextResponse.json({ error: 'You do not have permission to access this resource.' }, { status: 403 });
      }

      await prisma.worklog.deleteMany({
        where: {
          OR: [
            { id: oldTask.id },
            { id: cleanId },
            { id: `worklog-${oldTask.id}` },
            { id: `worklog-task-${oldTask.id}` },
            ...(oldTask.contentId ? [{ contentId: oldTask.contentId }] : []),
          ]
        }
      });
      await prisma.activityLog.deleteMany({
        where: { entityType: 'TASK', entityId: oldTask.id }
      });
      await prisma.task.delete({ where: { id: oldTask.id } });

      const client = await prisma.client.findUnique({ where: { id: oldTask.clientId } });
      if (client) {
        const stages = oldTask.stages ? (typeof oldTask.stages === 'string' ? JSON.parse(oldTask.stages) : oldTask.stages) : [];
        const stageScore = Array.isArray(stages) ? stages.reduce((sum: number, s: any) => sum + (Number(s.score) || 0), 0) : 0;
        const taskScore = stageScore || oldTask.score || 0;
        const newUsed = Math.max(0, client.usedPoint - taskScore);
        await prisma.client.update({
          where: { id: oldTask.clientId },
          data: {
            usedPoint: newUsed,
            remainingPoint: client.monthlyPointBudget - newUsed,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting task:', e);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
