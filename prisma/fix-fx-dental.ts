import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const anggi = await prisma.user.findFirst({ where: { name: { equals: 'Anggi', mode: 'insensitive' } } });
  const dinda = await prisma.user.findFirst({ where: { name: { equals: 'Dinda', mode: 'insensitive' } } });

  console.log('Anggi ID:', anggi?.id);
  console.log('Dinda ID:', dinda?.id);

  // 1. Fix FX Dental Photoshoot Asset tasks
  const fxTasks = await prisma.task.findMany({
    where: {
      OR: [
        { title: { contains: 'FX Dental', mode: 'insensitive' } },
        { title: { contains: 'Photoshoot Asset', mode: 'insensitive' } },
        { title: { contains: 'Shooting FX Dental', mode: 'insensitive' } }
      ]
    }
  });

  for (const t of fxTasks) {
    console.log('Fixing FX Task:', t.id, t.title);
    let stages = t.stages ? (typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages) : [];
    // Remove any scheduler stage from production task
    stages = Array.isArray(stages) ? stages.filter((s: any) => s.role !== 'Scheduler' && s.taskType !== 'Scheduling') : [];

    await prisma.task.update({
      where: { id: t.id },
      data: {
        status: 'Completed',
        category: 'Production',
        stages: JSON.stringify(stages),
      }
    });

    // Create/update Worklog for this task so points appear in Worklogs & Score Summary
    const contentIdVal = t.contentId || `content-${t.id}`;
    const existingWl = await prisma.worklog.findFirst({
      where: { OR: [{ contentId: contentIdVal }, { contentTitle: t.title }] }
    });

    if (existingWl) {
      await prisma.worklog.update({
        where: { id: existingWl.id },
        data: {
          status: 'Completed',
          score: t.score || 1600,
          cogs: (t.score || 1600) * 250,
          stages: JSON.stringify(stages),
          month: t.month || 'September',
          year: t.year || 2026,
        }
      });
    } else {
      await prisma.worklog.create({
        data: {
          date: t.postingDate || new Date(),
          userId: anggi?.id || '07b1dcff-92a9-4b94-a850-23dda97c98dd',
          clientId: t.clientId,
          contentTitle: t.title,
          taskType: 'Production Assistant',
          format: t.format || '8 Jam',
          qty: t.qty || 1,
          score: t.score || 1600,
          cogs: (t.score || 1600) * 250,
          status: 'Completed',
          source: 'Automated Task Completion',
          deadline: t.deadline,
          previewLink: t.previewLink || t.driveLink || '',
          stages: JSON.stringify(stages),
          month: t.month || 'September',
          year: t.year || 2026,
          contentId: contentIdVal,
          isArchived: false,
        }
      });
    }
  }

  console.log('Done fixing FX Dental tasks & worklogs!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
