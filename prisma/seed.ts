import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Executing Refactored 2-Workspace Database Seed (with Roles and Master Scores)...');

  // 1. Company Settings
  await prisma.companySetting.deleteMany();
  await prisma.companySetting.create({
    data: {
      effectiveWorkingHrs: 6,
      workingDaysPerWeek: 5,
      workdaysPerMonth: 20,
      pointPerHour: 100,
      monthlyCapacity: 16000,
      costPerPoint: 250,
      defaultDeadlineOffsetDays: -3,
    },
  });

  // 2. Permanent Users
  await prisma.user.deleteMany();
  const usersData = [
    {
      name: 'Devi',
      email: 'devi@personaos.com',
      roles: JSON.stringify(['Admin', 'Owner', 'Strategist']),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Anggi',
      email: 'anggi@personaos.com',
      roles: JSON.stringify(['Strategist', 'Production Assistant']),
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Gigie',
      email: 'gigie@personaos.com',
      roles: JSON.stringify(['Strategist', 'Production Assistant']),
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Dinda',
      email: 'dinda@personaos.com',
      roles: JSON.stringify(['Production Assistant', 'Editor', 'Scheduler']),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Jabin',
      email: 'jabin@personaos.com',
      roles: JSON.stringify(['Production Assistant', 'Editor']),
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Priska',
      email: 'priska@personaos.com',
      roles: JSON.stringify(['Production Assistant', 'Editor']),
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        roles: u.roles,
        avatar: u.avatar,
        monthlyCapacity: 16000,
        hourlyPoint: 100,
        costPerPoint: 250,
      },
    });
    createdUsers[u.name] = user;
  }

  // 2.2. Master Score Table
  await prisma.masterScore.deleteMany();
  const masterScoresData = [
    { category: 'Editor', taskType: 'Editing', format: 'Single Foto', score: 10 },
    { category: 'Editor', taskType: 'Editing', format: 'Grafis', score: 25 },
    { category: 'Editor', taskType: 'Editing', format: 'Story Video', score: 33 },
    { category: 'Editor', taskType: 'Editing', format: 'Paket Static', score: 75 },
    { category: 'Editor', taskType: 'Editing', format: 'Carousel', score: 150 },
    { category: 'Editor', taskType: 'Editing', format: 'Reels', score: 150 },
    { category: 'Editor', taskType: 'Revisi', format: 'Minor', score: 10 },
    { category: 'Editor', taskType: 'Revisi', format: 'Medium', score: 25 },
    { category: 'Editor', taskType: 'Revisi', format: 'Major', score: 50 },
    { category: 'Assistant', taskType: 'Production Assistant', format: '4 Jam', score: 400 },
    { category: 'Assistant', taskType: 'Production Assistant', format: '8 Jam', score: 800 },
    { category: 'Strategic', taskType: 'Content Plan', format: '4 Jam', score: 400 },
    { category: 'Strategic', taskType: 'Content Plan', format: '8 Jam', score: 800 },
    { category: 'Strategic', taskType: 'Production Lead', format: '4 Jam', score: 400 },
    { category: 'Strategic', taskType: 'Production Lead', format: '8 Jam', score: 800 },
    { category: 'Strategic', taskType: 'Editing Plan', format: 'Per Item', score: 25 },
    { category: 'Strategic', taskType: 'Supervisi', format: 'Per Check', score: 50 },
    { category: 'Strategic', taskType: 'Presentasi', format: 'Per Session', score: 100 },
    { category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', score: 5 },
  ];
  for (const ms of masterScoresData) {
    await prisma.masterScore.create({ data: ms });
  }

  // 2.5. Workspaces (Exactly Two: Team Anggi & Inhouse)
  await prisma.workspace.deleteMany();
  const workspacesData = [
    { id: 'ws-team-anggi', name: 'Persona OS - Team Anggi', slug: 'persona-os-team-anggi', ownerId: 'u-devi', billingPlan: 'ENTERPRISE' },
    { id: 'ws-inhouse', name: 'Persona OS - Inhouse', slug: 'persona-os-inhouse', ownerId: 'u-devi', billingPlan: 'ENTERPRISE' },
  ];
  for (const ws of workspacesData) {
    await prisma.workspace.create({ data: ws });
  }

  // 3. Clients Master (Distributed across Anggi vs Inhouse workspaces)
  await prisma.client.deleteMany();
  const clientsData = [
    // Team Anggi = eksternal
    { name: 'Baking Empire Gading Serpong', code: 'BEGS', budget: 5000, used: 3575, remaining: 1425, color: '#3B82F6', workspaceId: 'ws-team-anggi' },
    { name: 'Baking Empire Kelapa Gading', code: 'BEKG', budget: 3000, used: 2709, remaining: 291, color: '#10B981', workspaceId: 'ws-team-anggi' },
    { name: 'Baking Empire Citra 8', code: 'BEC8', budget: 5000, used: 4350, remaining: 650, color: '#F59E0B', workspaceId: 'ws-team-anggi' },
    { name: 'Samazama Japan', code: 'SZJ', budget: 5000, used: 2441, remaining: 2559, color: '#EC4899', workspaceId: 'ws-team-anggi' },
    { name: 'Karihome', code: 'KRM', budget: 5667, used: 1799, remaining: 3868, color: '#8B5CF6', workspaceId: 'ws-team-anggi' },
    // Inhouse
    { name: 'MotoDW', code: 'MDW', budget: 19533, used: 2240, remaining: 17293, color: '#6366F1', workspaceId: 'ws-inhouse' },
    { name: 'Hariharigimmick', code: 'HHG', budget: 5000, used: 0, remaining: 5000, color: '#8B5CF6', workspaceId: 'ws-inhouse' },
    { name: 'Katanya living', code: 'KTL', budget: 5000, used: 0, remaining: 5000, color: '#EF4444', workspaceId: 'ws-inhouse' },
    { name: 'Odi Personal Branding', code: 'OPB', budget: 5000, used: 450, remaining: 4550, color: '#10B981', workspaceId: 'ws-inhouse' },
    { name: 'Nasi Kenyataan', code: 'NKN', budget: 5000, used: 900, remaining: 4100, color: '#F59E0B', workspaceId: 'ws-inhouse' },
    { name: 'SJK', code: 'SJK', budget: 5000, used: 300, remaining: 4700, color: '#3B82F6', workspaceId: 'ws-inhouse' },
  ];

  const createdClients: Record<string, any> = {};
  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: {
        name: c.name,
        code: c.code,
        monthlyPointBudget: c.budget,
        usedPoint: c.used,
        remainingPoint: c.remaining,
        clientColor: c.color,
        workspaceId: c.workspaceId,
      },
    });
    createdClients[c.name] = client;
  }

  // 4. Client Monthly Budgets (Juli & Agustus 2026)
  await prisma.clientMonthlyBudget.deleteMany();
  const officialBudgets = [
    { clientName: 'Baking Empire Gading Serpong', month: '2026-07', budget: 5000, used: 3575, remaining: 1425 },
    { clientName: 'Baking Empire Citra 8', month: '2026-07', budget: 5000, used: 4350, remaining: 650 },
    { clientName: 'Baking Empire Kelapa Gading', month: '2026-07', budget: 3000, used: 2709, remaining: 291 },
    { clientName: 'Samazama Japan', month: '2026-07', budget: 5000, used: 2441, remaining: 2559 },
    { clientName: 'Karihome', month: '2026-07', budget: 5667, used: 1799, remaining: 3868 },
    { clientName: 'MotoDW', month: '2026-07', budget: 19533, used: 2240, remaining: 17293 },
  ];

  for (const b of officialBudgets) {
    const client = createdClients[b.clientName];
    if (client) {
      await prisma.clientMonthlyBudget.create({
        data: {
          clientId: client.id,
          month: b.month,
          budget: b.budget,
          used: b.used,
          remaining: b.remaining,
        },
      });
    }
  }

  // 5. Tasks Ingestion
  await prisma.task.deleteMany();
  const rawTasks = [
    // Kelapa Gading (Anggi Workspace)
    { postingDate: '2026-07-01', pic: 'Jabin', deadline: '2026-06-28', title: 'Foto Produk Osaka', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Dibatalkan', link: 'https://drive.google.com/file/d/1eL5kgR4eK01Ro8ZvlG9ciuN83XcBGnnD/view?usp=sharing', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-03', pic: 'Jabin', deadline: '2026-06-30', title: 'Sometimes, the smallest card', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1JvXwRfPimS2lonXCBDKRVw9sfncYN6fx?usp=drive_link', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-07', pic: 'Jabin', deadline: '2026-07-04', title: 'Update New Menu', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Dibatalkan', link: 'https://drive.google.com/file/d/1QYiC4OXVWXVspqwfw8YicKQ_mDD23D1R/view?usp=sharing', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-09', pic: 'Jabin', deadline: '2026-07-06', title: 'Foto Egg Tart Choco', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/open?id=1baJtQ-jHxDg3iZy_g3oBaa1E7Qq4Y0KZ&usp=drive_copy', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-11', pic: 'Jabin', deadline: '2026-07-08', title: 'Blossom Cake viral ini ada di Bali?', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1KNeXSM51U9m-BJ-8oSBGkyYIpZWVN5Pj?usp=drive_link', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-15', pic: 'Priska', deadline: '2026-07-12', title: 'Pia Rembulan Review', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1cyiTiEylPGCWC_DZQhEzzAKbYzKEU1eh/view?usp=sharing', qty: 1, client: 'Baking Empire Kelapa Gading' },

    // Citra 8 (Anggi Workspace)
    { postingDate: '2026-07-03', pic: 'Jabin', deadline: '2026-06-30', title: 'Di tempat se-estetik Citra 8', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/14ND1AM_dXBotbHm949Yfog3THEnuD4OZ?usp=drive_link', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-23', pic: 'Jabin', deadline: '2026-07-20', title: 'What to order for (update new menu)', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: 'https://drive.google.com/open?id=1Zw_O2gzQcv0UIOsUA62qXQt4qyFVJnUz&usp=drive_copy', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-08', pic: 'Priska', deadline: '2026-07-05', title: 'Oleh-oleh Jakarta', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1gFrByKTlRff5YQTxsBewlQgKfUPKldTD/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },

    // Karihome (Anggi Workspace)
    { postingDate: '2026-08-15', pic: 'Dinda', deadline: '2026-08-12', title: 'Carousel Jangan percaya semua klaim tentang susu kambing.', category: 'Scheduler', taskType: 'Editing', format: 'Carousel', status: 'Posted', link: 'https://drive.google.com/drive/folders/1VeG5CWG-37ebF46MFaOHmQi2G393MSdH?usp=sharing', qty: 1, client: 'Karihome' },
    { postingDate: '2026-08-26', pic: 'Dinda', deadline: '2026-08-23', title: 'Mbex Junior Medan Tgl 31 Juli - 2 Agust', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: 'https://drive.google.com/drive/folders/19656Ve6oRPw4_z-7cXBLv_oILUbCEtGE?usp=sharing', qty: 1, client: 'Karihome' },
    { postingDate: '2026-08-27', pic: 'Dinda', deadline: '2026-08-24', title: 'Mom n Mee', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: 'https://drive.google.com/drive/folders/1Sq8a1sXbm5NB_UsoYzVK6ai9-VV0smcR?usp=', qty: 1, client: 'Karihome' },

    // Tasks ready for Production or active Shooting (Anggi Workspace)
    { postingDate: '2026-07-28', pic: 'Jabin', deadline: '2026-07-25', title: 'Syuting Konten Edukasi Baking', category: 'Production', taskType: 'Production Assistant', format: '4 Jam', status: 'Shooting', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-30', pic: 'Dinda', deadline: '2026-07-27', title: 'Sesi Syuting Reels Review Karihome', category: 'Production', taskType: 'Production Assistant', format: '4 Jam', status: 'Production', link: '', qty: 1, client: 'Karihome' },

    // MotoDW (Inhouse Workspace)
    { postingDate: '2026-07-05', pic: 'Priska', deadline: '2026-07-02', title: 'Coating Showcase MotoDW', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: '', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-29', pic: 'Jabin', deadline: '2026-07-26', title: 'Showcase Event MotoDW Moto3', category: 'Production', taskType: 'Production Assistant', format: '4 Jam', status: 'Shooting', link: '', qty: 1, client: 'MotoDW' },

    // Hariharigimmick (Inhouse Workspace)
    { postingDate: '2026-07-12', pic: 'Dinda', deadline: '2026-07-09', title: 'Carousel Gimmick Funfact', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: '', qty: 1, client: 'Hariharigimmick' },
    { postingDate: '2026-07-15', pic: 'Dinda', deadline: '2026-07-12', title: 'Review Product Harihari', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Posted', link: '', qty: 1, client: 'Hariharigimmick' },
  ];

  for (const t of rawTasks) {
    const clientObj = createdClients[t.client] || createdClients['Baking Empire Gading Serpong'];
    const picObj = createdUsers[t.pic] || createdUsers['Jabin'];

    const formatScoreMap: Record<string, number> = {
      'Reels': 150,
      'Carousel': 150,
      'Single Foto': 10,
      'Grafis': 25,
      'Story Video': 33,
      'Paket Static': 75,
      '4 Jam': 400,
      '8 Jam': 800,
      'Per Post': 5,
    };
    const score = (formatScoreMap[t.format] || 10) * (t.qty || 1);

    await prisma.task.create({
      data: {
        clientId: clientObj.id,
        workspaceId: clientObj.workspaceId,
        title: t.title,
        category: t.category as any || 'Editor',
        taskType: t.taskType || 'Editing',
        format: t.format,
        qty: t.qty || 1,
        postingDate: new Date(t.postingDate),
        deadline: new Date(t.deadline),
        status: ['Brief', 'Content Proposal', 'Script', 'Editorial Plan', 'Production', 'Shooting', 'Editing', 'Revision', 'Approval', 'Scheduling', 'Posted'].includes(t.status)
          ? t.status
          : (t.status === 'Posted' ? 'Posted' : t.status === 'Approved' ? 'Approval' : t.status === 'Dibatalkan' ? 'Brief' : t.status === 'Approval' || t.status === 'Waiting for Approval' ? 'Approval' : t.status === 'In Progress' ? 'Editing' : 'Brief'),
        assignedUserIds: JSON.stringify([picObj ? picObj.id : createdUsers['Jabin'].id]),
        previewLink: t.link,
        score,
        cogs: score * 250,
        stages: JSON.stringify([
          {
            id: `stg-${Date.now()}-${Math.random()}`,
            role: t.category === 'Scheduler' ? 'Scheduler' : (t.category === 'Production' ? 'Production Assistant' : 'Editor'),
            userId: picObj.id,
            userName: picObj.name,
            taskType: t.taskType || 'Editing',
            format: t.format,
            qty: t.qty || 1,
            score,
          }
        ]),
      },
    });
  }

  // 6. Worklog Ingestion
  await prisma.worklog.deleteMany();
  const rawWorklogs = [
    { date: '2026-07-06', name: 'Dinda', client: 'Karihome', title: 'Karihome Funfact', type: 'Scheduling', format: 'Single Foto', qty: 1, score: 5, status: 'Posted', source: 'Karihome - To Do List', deadline: '2026-06-28', link: 'https://drive.google.com/drive/folders/11aXxV5Gh5D60yOTGSe0rkIIS_PAWTqo7?usp=drive_link' },
    { date: '2026-07-08', name: 'Dinda', client: 'Karihome', title: 'Karihome Funfact Video', type: 'Editing', format: 'Story Video', qty: 1, score: 33, status: 'Posted', source: 'Karihome - To Do List', deadline: '2026-06-28', link: 'https://drive.google.com/drive/folders/11aXxV5Gh5D60yOTGSe0rkIIS_PAWTqo7?usp=drive_link' },
    { date: '2026-07-01', name: 'Jabin', client: 'Baking Empire Kelapa Gading', title: 'Foto Produk Osaka', type: 'Editing', format: 'Single Foto', qty: 1, score: 10, status: 'Brief', source: 'BE Kelapa Gading - To Do List', deadline: '2026-06-28', link: 'https://drive.google.com/file/d/1eL5kgR4eK01Ro8ZvlG9ciuN83XcBGnnD/view?usp=sharing' },
    { date: '2026-07-03', name: 'Jabin', client: 'Baking Empire Kelapa Gading', title: 'Sometimes, the smallest card', type: 'Editing', format: 'Carousel', qty: 1, score: 150, status: 'Approval', source: 'BE Kelapa Gading - To Do List', deadline: '2026-06-30', link: 'https://drive.google.com/drive/folders/1JvXwRfPimS2lonXCBDKRVw9sfncYN6fx?usp=drive_link' },
    { date: '2026-07-02', name: 'Jabin', client: 'Baking Empire Citra 8', title: 'Grand Opening Citra 8 Highlight', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Posted', source: 'BE Citra 8 - To Do List', deadline: '2026-06-29', link: 'https://drive.google.com/file/d/16LZ_npqFNrk5GZd48wO2fP5a3u8vmbQO/view?usp=drive_link' },
    { date: '2026-07-04', name: 'Jabin', client: 'Baking Empire Citra 8', title: 'Outlet Tour Ruko Citra 8', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Posted', source: 'BE Citra 8 - To Do List', deadline: '2026-07-01', link: 'https://drive.google.com/file/d/1W5gA77hJ-8y06s5k5J8P6-M0n6a6-N4/view?usp=drive_link' },
    { date: '2026-07-05', name: 'Anggi', client: 'Samazama Japan', title: 'Japanese Dining Experience', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Posted', source: 'Samazama - Content Plan', deadline: '2026-07-02', link: '' },
    { date: '2026-07-01', name: 'Priska', client: 'MotoDW', title: 'Detail Coating Supercar', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Posted', source: 'MotoDW - Content Plan', deadline: '2026-06-28', link: '' },
  ];

  for (const w of rawWorklogs) {
    const userObj = createdUsers[w.name] || createdUsers['Jabin'];
    const clientObj = createdClients[w.client] || createdClients['Baking Empire Gading Serpong'];

    await prisma.worklog.create({
      data: {
        date: new Date(w.date),
        userId: userObj.id,
        clientId: clientObj.id,
        contentTitle: w.title,
        taskType: w.type,
        format: w.format,
        qty: w.qty,
        score: w.score,
        cogs: w.score * 250,
        status: w.status,
        source: w.source,
        deadline: new Date(w.deadline),
        previewLink: w.link,
        stages: JSON.stringify([
          {
            id: `stg-${Date.now()}-${Math.random()}`,
            role: w.type === 'Scheduling' ? 'Scheduler' : 'Editor',
            userId: userObj.id,
            userName: userObj.name,
            taskType: w.type,
            format: w.format,
            qty: w.qty,
            score: w.score,
          }
        ]),
      },
    });
  }

  console.log(`✅ Seeded 2 Workspaces, 11 Clients, ${rawTasks.length} tasks and ${rawWorklogs.length} worklogs successfully!`);
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
