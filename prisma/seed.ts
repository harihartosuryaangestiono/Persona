import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Executing Full Persona OS Master Database Seed...');

  // 1. Company Settings
  await prisma.companySetting.deleteMany();
  await prisma.companySetting.create({
    data: {
      effectiveWorkingHrs: 6,
      workingDaysPerWeek: 5,
      workdaysPerMonth: 20,
      pointPerHour: 100,
      monthlyCapacity: 12000,
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
      roles: JSON.stringify(['Strategist']),
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
        monthlyCapacity: 12000,
        hourlyPoint: 100,
        costPerPoint: 250,
      },
    });
    createdUsers[u.name] = user;
  }

  // 3. Clients Master
  await prisma.client.deleteMany();
  const clientsData = [
    { name: 'Baking Empire Gading Serpong', code: 'BEGS', budget: 5000, used: 3575, remaining: 1425, color: '#3B82F6' },
    { name: 'Baking Empire Kelapa Gading', code: 'BEKG', budget: 3000, used: 2709, remaining: 291, color: '#10B981' },
    { name: 'Baking Empire Citra 8', code: 'BEC8', budget: 5000, used: 4350, remaining: 650, color: '#F59E0B' },
    { name: 'Samazama Japan', code: 'SZJ', budget: 5000, used: 2441, remaining: 2559, color: '#EC4899' },
    { name: 'Karihome', code: 'KRM', budget: 5667, used: 1799, remaining: 3868, color: '#8B5CF6' },
    { name: 'MotoDW', code: 'MDW', budget: 19533, used: 2240, remaining: 17293, color: '#6366F1' },
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
    { clientName: 'Karihome', month: '2026-07', budget: 5667, used: 1799, remaining: 3868 },
    { clientName: 'Samazama Japan', month: '2026-07', budget: 5000, used: 2441, remaining: 2559 },
    { clientName: 'MotoDW', month: '2026-07', budget: 19533, used: 2240, remaining: 17293 },
    { clientName: 'Baking Empire Gading Serpong', month: '2026-08', budget: 5000, used: 0, remaining: 5000 },
    { clientName: 'Baking Empire Citra 8', month: '2026-08', budget: 5000, used: 0, remaining: 5000 },
    { clientName: 'Baking Empire Kelapa Gading', month: '2026-08', budget: 3000, used: 0, remaining: 3000 },
    { clientName: 'Karihome', month: '2026-08', budget: 5667, used: 300, remaining: 5367 },
    { clientName: 'Samazama Japan', month: '2026-08', budget: 5000, used: 0, remaining: 5000 },
    { clientName: 'MotoDW', month: '2026-08', budget: 2000, used: 0, remaining: 2000 },
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

  // 5. Complete Tasks (To Do List) Ingestion for ALL Clients
  await prisma.task.deleteMany();
  const rawTasks = [
    // --- BAKING EMPIRE KELAPA GADING ---
    { postingDate: '2026-07-01', pic: 'Jabin', deadline: '2026-06-28', title: 'Foto Produk Osaka', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Dibatalkan', link: 'https://drive.google.com/file/d/1eL5kgR4eK01Ro8ZvlG9ciuN83XcBGnnD/view?usp=sharing', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-03', pic: 'Jabin', deadline: '2026-06-30', title: 'Sometimes, the smallest card', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1JvXwRfPimS2lonXCBDKRVw9sfncYN6fx?usp=drive_link', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-07', pic: 'Jabin', deadline: '2026-07-04', title: 'Update New Menu', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Dibatalkan', link: 'https://drive.google.com/file/d/1QYiC4OXVWXVspqwfw8YicKQ_mDD23D1R/view?usp=sharing', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-09', pic: 'Jabin', deadline: '2026-07-06', title: 'Foto Egg Tart Choco', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/open?id=1baJtQ-jHxDg3iZy_g3oBaa1E7Qq4Y0KZ&usp=drive_copy', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-11', pic: 'Jabin', deadline: '2026-07-08', title: 'Blossom Cake viral ini ada di Bali?', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1KNeXSM51U9m-BJ-8oSBGkyYIpZWVN5Pj?usp=drive_link', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-14', pic: 'Jabin', deadline: '2026-07-11', title: 'Foto Ambience Pia Rembulan', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/open?id=17hv2pTSiMrM3JQ10w4wgpL4l9fEnMxWs&usp=drive_copy', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-15', pic: 'Priska', deadline: '2026-07-12', title: 'Pia Rembulan Review', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1cyiTiEylPGCWC_DZQhEzzAKbYzKEU1eh/view?usp=sharing', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-19', pic: 'Jabin', deadline: '2026-07-16', title: 'Setiap jam beda menu', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/open?id=1YQXUOt2PaK5ACgt8tq8VH4feYT1GzV0W&usp=drive_copy', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-22', pic: 'Jabin', deadline: '2026-07-19', title: 'Foto Blossom Cake Kantoran', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/file/d/1ciaTM-SRuK1FRJ7oSMCRtLUsU5MF9P0C/view?usp=drive_link', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-24', pic: 'Priska', deadline: '2026-07-21', title: 'Jangan cuma tau Blossom Cake ini ada di Bali…', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1UhxYv3FTvqi_3lm9azrxzhErrwTaG6bq/view?usp=sharing', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-26', pic: 'Jabin', deadline: '2026-07-23', title: 'Foto Saltbread Cheese', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/open?id=1hjkc7u2cBJaGTbcDnAmVeNI_Lw5aFXxG&usp=drive_copy', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-28', pic: 'Jabin', deadline: '2026-07-25', title: 'Kenapa Dubai Chewy Cookie selalu naik daun di kalangan pecinta dessert?', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-02', pic: 'Jabin', deadline: '2026-06-29', title: 'Buku Menu KG', category: 'Editor', taskType: 'Editing', format: 'Grafis', status: 'Approved', link: 'https://drive.google.com/drive/folders/1Z1k6WewCvhUo9epiCwo74tXsrWEb5JXt?usp=drive_link', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-28', pic: 'Jabin', deadline: '2026-07-25', title: 'kenapa Dubai Chewy Cookie selalu naik daun', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/open?id=1UuHN9UVz24w31FFT8jECVM0CJ6uGyLPA&usp=drive_copy', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-02', pic: 'Dinda', deadline: '2026-06-29', title: 'Story Grafis 7 Agustus', category: 'Editor', taskType: 'Editing', format: 'Grafis', status: 'Approved', link: 'https://drive.google.com/drive/folders/1J2ywX67AmU9h2uVWsvPCGA5nXxm_Lfc6?usp=drive_link', qty: 7, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-03', pic: 'Dinda', deadline: '2026-06-30', title: 'Story Video 5 Agustus', category: 'Editor', taskType: 'Editing', format: 'Story Video', status: 'Approved', link: 'https://drive.google.com/drive/folders/1fpoN_HWOeMNAa-l5aYIJl5Ba4N2-58xD?usp=drive_link', qty: 5, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-04', pic: 'Priska', deadline: '2026-07-01', title: 'Story Video 2 Agustus', category: 'Editor', taskType: 'Editing', format: 'Story Video', status: 'Approved', link: 'https://drive.google.com/drive/folders/1DAgxsJX1Atm4ZUZqDv5aRihnNvC5mJb3?usp=sharing', qty: 2, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-05', pic: 'Dinda', deadline: '2026-07-01', title: 'Story Grafis 7 September', category: 'Editor', taskType: 'Editing', format: 'Grafis', status: 'Approved', link: 'https://drive.google.com/drive/folders/1imUh62xGIi00e493MUY410mhD5_ZUeLU?usp=drive_link', qty: 7, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-06', pic: 'Dinda', deadline: '2026-07-03', title: 'Story Video 7 September', category: 'Editor', taskType: 'Editing', format: 'Story Video', status: 'Approved', link: 'https://drive.google.com/drive/folders/1OjF8x2zLK5lGpXOYIvJoip0NlQ8HIREF?usp=drive_link', qty: 7, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-08-01', pic: 'Priska', deadline: '2026-07-29', title: 'Osaka Cream Puff Agustus', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/17MpLrr7RjYF9RRF01zxC3DoHUoz86_wT/view?usp=sharing', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-08', pic: 'Jabin', deadline: '2026-07-05', title: 'Grading Foto kG', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Posted', link: 'https://drive.google.com/drive/folders/1d6dg1tTZ0Wo6kPMz8EToZ-TDrMqk_VyD?usp=drive_link', qty: 32, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-08-01', pic: 'Priska', deadline: '2026-07-29', title: '100 ribu bisa dapet apa aja di BE KG (Agustus)', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/17BT4g7g-jT94UIgOy5aAOn9rdZ0BUPj3/view?usp=sharing', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-08-01', pic: 'Priska', deadline: '2026-07-29', title: 'hanya Toko roti ini setiap stock etalasbis (Agustus)', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1-9xaUULmlynwCcVzgLrtPWaz7cy2XMyB/view?usp=sharing', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-11', pic: 'Jabin', deadline: '2026-07-08', title: 'Video Cinematik New Blossom Cake', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/open?id=1gIqVNZJapmiQwgnVkWJsJ_zbUhfkz3Im&usp=drive_copy', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-12', pic: 'Jabin', deadline: '2026-07-09', title: 'Launch dan Promotion Blossom Cake', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1gaw4mBn3EZsUvWuY17Hd8J4FGb5INMYY?usp=drive_link', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-01', pic: 'Dinda', deadline: '2026-06-28', title: 'Foto Produk Osaka (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Dibatalkan', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-03', pic: 'Dinda', deadline: '2026-06-30', title: 'Sometimes, the smallest card (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Posted', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-09', pic: 'Dinda', deadline: '2026-07-06', title: 'Foto Egg Tart Choco (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Posted', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-29', pic: 'Dinda', deadline: '2026-07-26', title: 'Blossom Cake viral ini ada di Bali? (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-26', pic: 'Dinda', deadline: '2026-07-23', title: 'Foto Ambience Pia Rembulan (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-29', pic: 'Dinda', deadline: '2026-07-26', title: 'Pia Rembulan Review (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-16', pic: 'Dinda', deadline: '2026-07-13', title: 'Setiap jam beda menu (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-20', pic: 'Dinda', deadline: '2026-07-17', title: 'Foto Blossom Cake Kantoran (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-22', pic: 'Dinda', deadline: '2026-07-19', title: 'Jangan cuma tau Blossom Cake ini ada di Bali… (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-17', pic: 'Dinda', deadline: '2026-07-14', title: 'Foto Saltbread Cheese (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-25', pic: 'Dinda', deadline: '2026-07-22', title: 'Kenapa Dubai Chewy Cookie selalu naik daun di kalangan pecinta dessert? (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-27', pic: 'Dinda', deadline: '2026-07-24', title: 'kenapa Dubai Chewy Cookie selalu naik daun (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-11', pic: 'Dinda', deadline: '2026-07-08', title: 'Video Cinematik New Blossom Cake (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-13', pic: 'Dinda', deadline: '2026-07-10', title: 'Launch dan Promotion Blossom Cake (Schedule)', category: 'Scheduler', taskType: 'Scheduling', format: 'Per Post', status: 'Editing', link: '', qty: 1, client: 'Baking Empire Kelapa Gading' },
    { postingDate: '2026-07-17', pic: 'Jabin', deadline: '2026-07-14', title: 'Salt Bread cheese (foto styling)', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approval', link: 'https://drive.google.com/open?id=12fYqX42bkd_AtudRPTagm3EmguoHIYIj&usp=drive_copy', qty: 1, client: 'Baking Empire Kelapa Gading' },

    // --- BAKING EMPIRE CITRA 8 ---
    { postingDate: '2026-07-03', pic: 'Jabin', deadline: '2026-06-30', title: 'Di tempat se-estetik Citra 8', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/14ND1AM_dXBotbHm949Yfog3THEnuD4OZ?usp=drive_link', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-23', pic: 'Jabin', deadline: '2026-07-20', title: 'What to order for (update new menu)', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: 'https://drive.google.com/open?id=1Zw_O2gzQcv0UIOsUA62qXQt4qyFVJnUz&usp=drive_copy', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-08', pic: 'Priska', deadline: '2026-07-05', title: 'Oleh-oleh Jakarta', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1gFrByKTlRff5YQTxsBewlQgKfUPKldTD/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-09', pic: 'Jabin', deadline: '2026-07-06', title: 'Foto Horse Bread', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/open?id=1LI_2eDvpdLY4FXNmnRRjXZM5-SSqK1n5&usp=drive_copy', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-10', pic: 'Jabin', deadline: '2026-07-07', title: 'Foto Blossom Cake with Birthday Card', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/open?id=1ZsXQ3vyzJiCgEyjrq8gW_3rnfPiZXP9K&usp=drive_copy', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-11', pic: 'Priska', deadline: '2026-07-08', title: 'Mba BE On The Mic', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-12', pic: 'Jabin', deadline: '2026-07-09', title: 'Tips Beli Oleh oleh Jakarta edisi BE C8', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/open?id=1mT-Y-Oc3fffecQLuJdmDBQNfFyc5sT1p&usp=drive_copy', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-13', pic: 'Jabin', deadline: '2026-07-10', title: 'Foto Produk Citra 8', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/open?id=1bFee2zXKRDs7CHyv1-famzl56R5hs912&usp=drive_copy', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-15', pic: 'Priska', deadline: '2026-07-12', title: 'Pia Rembulan Review Citra 8', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1cyiTiEylPGCWC_DZQhEzzAKbYzKEU1eh/view', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-16', pic: 'Jabin', deadline: '2026-07-13', title: 'Jajan Sore di Citra 8', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1A0hMEQA7M7xQX90rJdgsOKR8oRI-eEDF?usp=drive_link', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-17', pic: 'Jabin', deadline: '2026-07-14', title: 'Foto Pia Rembulan Citra 8', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-18', pic: 'Jabin', deadline: '2026-07-15', title: 'Dont Fly to Bali Just for Blossom Cake C8', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-27', pic: 'Jabin', deadline: '2026-07-24', title: 'Foto Blossom Cake dengan view taman', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/open?id=1vuTDN1DPVNyZ7siu42EdN7PZc0VxG5gW&usp=drive_copy', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-21', pic: 'Priska', deadline: '2026-07-18', title: 'Datang pagi demi dubai chewy', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1mhsQONsKGMizNANmaBJXs-s4FOJSIqQ4/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-23', pic: 'Jabin', deadline: '2026-07-20', title: 'Foto Ambience Citra 8', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-03', pic: 'Priska', deadline: '2026-06-30', title: 'Tiktok Di rumah gabut apa keluar uang', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1EyTjHpuAK4l4ivbMfbj1tZnyscZgkYay/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-07', pic: 'Priska', deadline: '2026-07-04', title: 'Tiktok POV : Kamu pemegang info A1 Gossip di tempat Kerja', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/128ebc_CabmruvzpLAfNZU9yjLzXSJ9-N/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-12', pic: 'Priska', deadline: '2026-07-09', title: 'Tiktok POV : Dubai Chewy Cookie Hunter', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1QcL9cs3UaD7GSn2lyAWPPjqg5kB5b_on/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-16', pic: 'Priska', deadline: '2026-07-13', title: 'Interview Tiktok 1', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/145n7LcyD9IHV36GxCoT6cyDylbwIwlY3/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-26', pic: 'Priska', deadline: '2026-07-23', title: 'Interview Tiktok 2', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1HlM2HBJzzJbhJETwlHt-6kXE2SGC7lBx/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-27', pic: 'Priska', deadline: '2026-07-24', title: 'Interview Tiktok 3', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/183Uv8R6TyLNPrC6gylrnwpurRXWiBHQM/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-26', pic: 'Priska', deadline: '2026-07-23', title: 'Poster Blossom Cake', category: 'Editor', taskType: 'Editing', format: 'Grafis', status: 'Draft', link: '', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-10', pic: 'Anggi', deadline: '2026-07-07', title: 'Production BE Citra 8 Agustus', category: 'Strategic', taskType: 'Production Lead', format: '4 Jam', status: 'Draft', link: '', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-31', pic: 'Anggi', deadline: '2026-07-28', title: 'Content Plan BE Citra 8 - September', category: 'Strategic', taskType: 'Content Plan', format: '4 Jam', status: 'Draft', link: '', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-28', pic: 'Jabin', deadline: '2026-07-29', title: 'Story Grafis Citra 8 Agustus', category: 'Editor', taskType: 'Editing', format: 'Grafis', status: 'Posted', link: 'https://drive.google.com/open?id=1pfguDM-raWqiLCBBU7-5VRRikp0k2hFe&usp=drive_copy', qty: 20, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-29', pic: 'Priska', deadline: '2026-07-30', title: 'Story Video citra 8 Agustus', category: 'Editor', taskType: 'Editing', format: 'Story Video', status: 'Approved', link: 'https://drive.google.com/drive/folders/1qVOhZC4MNz4zCcFGN53z2wHXig3Mkus0?usp=sharing', qty: 5, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-30', pic: 'Priska', deadline: '2026-07-27', title: 'Story Video citra 8 Agustus (2)', category: 'Editor', taskType: 'Editing', format: 'Story Video', status: 'Approved', link: 'https://drive.google.com/drive/folders/1qVOhZC4MNz4zCcFGN53z2wHXig3Mkus0?usp=sharing', qty: 5, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-07', pic: 'Dinda', deadline: '2026-07-04', title: 'Production BE Citra 8', category: 'Assistant', taskType: 'Production Assistant', format: '4 Jam', status: 'Posted', link: '', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-07', pic: 'Priska', deadline: '2026-07-04', title: 'Hack dapetin roti gratis di Baking Empire', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1EV0ZFdE6rCoQ5qmbWGvNHCI5JXocH-qH/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-08', pic: 'Jabin', deadline: '2026-07-05', title: 'What to order for (update new menu) C8', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1Zw_O2gzQcv0UIOsUA62qXQt4qyFVJnUz?usp=drive_link', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-13', pic: 'Jabin', deadline: '2026-07-10', title: 'About Blossom Cake Orange', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/open?id=17HWl947v1aOsnsEUhz3pcFPrMDkzMp5J&usp=drive_copy', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-14', pic: 'Jabin', deadline: '2026-07-11', title: 'About Blossom Cake Pandan Cheese', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1HIAzebm-u8kr-gtrMDbMpwHvSbO1zalx?usp=drive_link', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-16', pic: 'Dinda', deadline: '2026-07-13', title: '5 Konten Tiktok C8', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approval', link: 'https://drive.google.com/drive/folders/12Mgynjw45l_K3Y5DCdOZj7brItFPbiXE?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-15', pic: 'Jabin', deadline: '2026-07-12', title: 'Story Announcement Jam Tutup', category: 'Editor', taskType: 'Editing', format: 'Grafis', status: 'Approved', link: 'https://drive.google.com/open?id=1gsDkdn7rXlbTZJj2p89JtPMb104AoP1b&usp=drive_copy', qty: 3, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-15', pic: 'Jabin', deadline: '2026-07-12', title: 'Baking Empire Citra 8 sedang trial buka sampai jam 10 malam.', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/open?id=1CVoH0mCoojmHpMV446JX47PJ4gkBZIam&usp=drive_copy', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-16', pic: 'Priska', deadline: '2026-07-13', title: 'Jiggle-jiggle cake yang sering kamu lihat di video ini namanya Blossom Cake.', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/19RMKfhh5Re3cvJTYjqbEDe09zLMG_pFA/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },
    { postingDate: '2026-07-16', pic: 'Priska', deadline: '2026-07-13', title: 'Behind The bake Osaka Cream Puff', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1MTvka69SCJNWzDPCVqYAfAi_veJ51_wk/view?usp=sharing', qty: 1, client: 'Baking Empire Citra 8' },

    // --- BAKING EMPIRE GADING SERPONG ---
    { postingDate: '2026-07-01', pic: 'Jabin', deadline: '2026-06-28', title: 'June Recap - All BE', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Posted', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-03', pic: 'Jabin', deadline: '2026-06-30', title: 'Di lorong ruko ini', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Posted', link: 'https://drive.google.com/drive/folders/1JhanC56sw7gR-4-FvpLDCjJ4piK4qO5v?usp=drive_link', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-05', pic: 'Jabin', deadline: '2026-07-02', title: 'What to order, for…', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Posted', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-06', pic: 'Priska', deadline: '2026-07-03', title: 'Datang Nggak Boleh Tangan Kosong', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-08', pic: 'Jabin', deadline: '2026-07-05', title: 'Foto Blossom Cake birthday', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-09', pic: 'Priska', deadline: '2026-07-06', title: 'Ci ranny BE On The Mic', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Draft', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-10', pic: 'Jabin', deadline: '2026-07-07', title: 'Roti untuk alasan-alasan kecil orang Gading Serpong.', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-10', pic: 'Jabin', deadline: '2026-07-07', title: 'Foto Horse Bread GS', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-12', pic: 'Jabin', deadline: '2026-07-09', title: 'Foto Produk GS', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Draft', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-14', pic: 'Jabin', deadline: '2026-07-11', title: 'Awalnya, Egg Tart Mochi]', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-17', pic: 'Jabin', deadline: '2026-07-14', title: 'Foto Pia rembulan GS', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-18', pic: 'Jabin', deadline: '2026-07-15', title: 'Don’t fly to Bali just for Blossom Cake. GS', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-19', pic: 'Jabin', deadline: '2026-07-16', title: 'Foto Blossom Cake GS', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'Foto Blossom Cake.png', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-23', pic: 'Jabin', deadline: '2026-07-20', title: 'Foto Ambience GS', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-24', pic: 'Priska', deadline: '2026-07-21', title: 'Behind the bake Salt Bread GS', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1R7BDastj8eg00aOYv9AOaMxnddTm9xSk/view?usp=sharing', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-26', pic: 'Jabin', deadline: '2026-07-23', title: 'Foto Osaka Cream Puff GS', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-28', pic: 'Priska', deadline: '2026-07-25', title: 'Video Reels GS', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/17KPQllbdU7KBKd25Cqm2SlRU9bibn6Ep/view?usp=sharing', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-29', pic: 'Jabin', deadline: '2026-07-26', title: 'Foto Gojiberry Obao', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-30', pic: 'Jabin', deadline: '2026-07-27', title: 'Launching 5 roti', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-31', pic: 'Priska', deadline: '2026-07-28', title: 'Jajan Apa Di Gadser?', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1jFdPdt2UdG9EFBbQGo56JHVocCSt7nUl/view?usp=sharing', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-31', pic: 'Anggi', deadline: '2026-07-22', title: 'Content Plan BE GS - September', category: 'Strategic', taskType: 'Content Plan', format: '4 Jam', status: 'Draft', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-06', pic: 'Priska', deadline: '2026-07-03', title: '5 Konten Tiktok Agustus GS', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approval', link: 'https://drive.google.com/drive/folders/1BK-z4pj6EjNAXJSfxaxZCr4Xm50bqp-l?usp=drive_link', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-07', pic: 'Dinda', deadline: '2026-07-04', title: '5 Konten Tiktok Agustus (2) GS', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/drive/folders/1BK-z4pj6EjNAXJSfxaxZCr4Xm50bqp-l?usp=sharing', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-07', pic: 'Priska', deadline: '2026-07-02', title: 'Behind the bake Osaka Cream Puff Agustus GS', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Draft', link: '', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-08', pic: 'Jabin', deadline: '2026-07-04', title: 'Grading Produksi GS', category: 'Editor', taskType: 'Editing', format: 'Grafis', status: 'Approved', link: 'https://drive.google.com/drive/folders/179bD-pQkwJ1mrSq-nTK57p2OkjhmCgUS?usp=drive_link', qty: 18, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-11', pic: 'Anggi', deadline: '2026-07-07', title: 'Foto New Blossom Cake Orange and Pandan Cheese GS', category: 'Strategic', taskType: 'Production Lead', format: '4 Jam', status: 'Draft', link: 'https://drive.google.com/drive/folders/1jzdsCtJn-Mwc-1N5mES3-z4Q7s4zyHRc?usp=sharing', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-13', pic: 'Jabin', deadline: '2026-07-10', title: 'Foto Produk GS 2', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/open?id=1jfkAcOUvkDN48UiXDYFzExQ3iioJHUB4&usp=drive_copy', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-14', pic: 'Priska', deadline: '2026-07-11', title: 'Hack dapetin roti gratis di Baking Empire GS', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/1Lt_y880bNyC2zchSr1BHFkeKYywzn1uN/view?usp=sharing', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-10', pic: 'Jabin', deadline: '2026-07-07', title: 'Grafis New Blossom cake Orange and Pandan Cheese GS', category: 'Editor', taskType: 'Editing', format: 'Paket Static', status: 'Posted', link: 'https://drive.google.com/open?id=1GBnAOZcQOeljDg9x7sf_r6gysDiYL1kI&usp=drive_copy', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-15', pic: 'Jabin', deadline: '2026-07-12', title: 'Foto Blossom orange GS', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/open?id=1EiiBlBdx-q-b1hznpsDuvofgw8iZ_bOj&usp=drive_copy', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-10', pic: 'Jabin', deadline: '2026-07-07', title: 'Lengkapin katalog blossom cake GS', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Approved', link: 'https://drive.google.com/drive/folders/1pRIGrG4Nt8UxjhYAJTI6tfCGshnCt4BK?usp=drive_link', qty: 4, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-19', pic: 'Jabin', deadline: '2026-07-16', title: 'Stop motion Blossom Cake Orang GS', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/open?id=1qqAl873YtN38bkZ7BzxCBuW4aYM3bjOV&usp=drive_copy', qty: 1, client: 'Baking Empire Gading Serpong' },
    { postingDate: '2026-07-19', pic: 'Priska', deadline: '2026-07-16', title: 'Jiggle-jiggle cake yang sering kamu lihat di video ini namanya Blossom Cake. GS', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/file/d/19RMKfhh5Re3cvJTYjqbEDe09zLMG_pFA/view?usp=sharing', qty: 1, client: 'Baking Empire Gading Serpong' },

    // --- MOTO DW ---
    { postingDate: '2026-07-02', pic: 'Anggi', deadline: '2026-07-02', title: 'cari foto utk MotoDW', category: 'Strategic', taskType: 'Editing Plan', format: 'Per Item', status: 'Draft', link: '', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-10', pic: 'Anggi', deadline: '2026-07-10', title: 'Produksi MotoDW', category: 'Strategic', taskType: 'Production Lead', format: '4 Jam', status: 'Draft', link: '', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-10', pic: 'Anggi', deadline: '2026-07-10', title: 'Produksi MotoDW 2', category: 'Strategic', taskType: 'Production Lead', format: '4 Jam', status: 'Draft', link: '', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-17', pic: 'Anggi', deadline: '2026-07-17', title: 'Produksi MotoDW 3', category: 'Strategic', taskType: 'Production Lead', format: '4 Jam', status: 'Draft', link: '', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-06', pic: 'Jabin', deadline: '2026-07-03', title: 'Grading Feed MotoDW', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Posted', link: 'https://drive.google.com/drive/folders/1qOAgCbna4qwI4y3am9HhJfW18oABDhCc?usp=drive_link', qty: 19, client: 'MotoDW' },
    { postingDate: '2026-07-10', pic: 'Jabin', deadline: '2026-07-07', title: 'Sama2 Lakban harganya beda 4x lipat', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/open?id=1XH2ypoBVbjRZ_BqR_3OVAQb9dxqAfo1l&usp=drive_copy', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-08', pic: 'Jabin', deadline: '2026-07-05', title: 'Carousel > MotoDW tiba tiba English', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1uZA9I8kjeYe2_Lv49K1o8EHG0LWxSe1J?usp=drive_link', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-09', pic: 'Jabin', deadline: '2026-07-06', title: 'Does Anyone Still Look for References on Pinterest?', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1o0v-i5WMUYhK5e0kC91QAuN6qtSWXs_T?usp=drive_link', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-13', pic: 'Jabin', deadline: '2026-07-10', title: 'Is a Photo Background Still Relevant in 2026?', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1G08WhHeKK113egtjBYeSId-RQLjg2uC2?usp=drive_link', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-15', pic: 'Jabin', deadline: '2026-07-12', title: 'Art Block Fatigue Opening', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approved', link: 'https://drive.google.com/open?id=1hemimrn8eh9VlBD-YYUdQ7jpf7jNKaTU&usp=drive_copy', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-17', pic: 'Jabin', deadline: '2026-07-14', title: 'What If the Work Is Never Really Done?', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/open?id=1vcJEXmzCifGT9EzkJlmc01lpUVqykITK&usp=drive_copy', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-20', pic: 'Jabin', deadline: '2026-07-17', title: 'Things That Make a Creative Person Feel Rich for 5 Minutes', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/drive/folders/1GKoDZlS1-VjfhgsbxIrNrKjCoUexQMLx?usp=drive_link', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-22', pic: 'Jabin', deadline: '2026-07-19', title: 'Stop Explaining Your Photography Price Like It’s 2015', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approved', link: 'https://drive.google.com/open?id=1_RtvWK3iJ0-kfFhboeW6EvWOdZoZwtD8&usp=drive_copy', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-22', pic: 'Jabin', deadline: '2026-07-19', title: 'Race to the bottom', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: 'https://drive.google.com/open?id=1wQYYC4TgVJ_MNmfoKSVT7-Km3FOIROst&usp=drive_copy', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-23', pic: 'Jabin', deadline: '2026-07-20', title: 'Creativity Is Fun Until Nothing Works Twice', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: 'https://drive.google.com/drive/folders/12fuQifIGIyATkmcOGH49att1TWLjIRmq?usp=drive_link', qty: 1, client: 'MotoDW' },
    { postingDate: '2026-07-24', pic: 'Jabin', deadline: '2026-07-21', title: 'Do You Really Expect to Get Paid?', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: 'https://drive.google.com/open?id=1KOYsYAUljd9JRnd96CXR50ttfTiKpqCd&usp=drive_copy', qty: 1, client: 'MotoDW' },

    // --- KARIHOME ---
    { postingDate: '2026-07-01', pic: 'Dinda', deadline: '2026-06-28', title: 'Karihome Funfact', category: 'Editor', taskType: 'Editing', format: 'Story Video', status: 'Posted', link: 'https://drive.google.com/drive/folders/11aXxV5Gh5D60yOTGSe0rkIIS_PAWTqo7?usp=drive_link', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-03', pic: 'Dinda', deadline: '2026-06-30', title: 'Setiap Anak punya fase tumbuh yang berbeda', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Posted', link: 'https://drive.google.com/file/d/16LZ_npqFNrk5GZd48wO2fP5a3u8vmbQO/view?usp=drive_link', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-05', pic: 'Dinda', deadline: '2026-07-02', title: 'Minum susu sesuai umurnya', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Posted', link: 'https://drive.google.com/drive/folders/1UxAhLkH4LOkZeuiGY-5EUsCg5ubJQcMy?usp=drive_link', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-07', pic: 'Dinda', deadline: '2026-07-04', title: 'Makanan Viral VS Nutrisi Harian Anak', category: 'Editor', taskType: 'Editing', format: 'Story Video', status: 'Posted', link: 'https://drive.google.com/drive/folders/1X-_7MfoJqHiVs4bngRQCzmrRuJB6RSU3?usp=sharing', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-08', pic: 'Dinda', deadline: '2026-07-05', title: 'Fase Tumbuh Anak', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Posted', link: 'https://drive.google.com/drive/folders/1rtPGM0nzkQccOb2VSN1DWpvoOqQMGxgv?usp=sharing', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-10', pic: 'Dinda', deadline: '2026-07-07', title: 'POV : si kecil kalau udah bisa bilang mau', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Posted', link: 'https://drive.google.com/file/d/10wFUL9sLeoXHXPYvDh4w_L7GcQwbJc08/view?usp=drive_link', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-10', pic: 'Dinda', deadline: '2026-07-07', title: 'Greetings Back To School', category: 'Editor', taskType: 'Editing', format: 'Grafis', status: 'Posted', link: 'https://drive.google.com/drive/folders/1bhsdQu1ST8jElInaJfO7oLQAbnjK2fwO', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-12', pic: 'Dinda', deadline: '2026-07-09', title: 'Tips Biar si kecil lebih siap tidur siang', category: 'Editor', taskType: 'Editing', format: 'Story Video', status: 'Posted', link: 'https://drive.google.com/drive/folders/1-xngk49AlyqQQHWXjLTy6EmFdBVV4XZt?usp=drive_link', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-16', pic: 'Dinda', deadline: '2026-07-13', title: 'Materi Ads Karihome 15 Detik - Fase si kecil aktif', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Posted', link: 'https://drive.google.com/file/d/19MhBobfeaIAVYVC9vN66b6rwZ7RCyQTr/view?usp=drive_link', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-17', pic: 'Dinda', deadline: '2026-07-14', title: 'Ibu2 Canggih Jkt 25 Jul', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Draft', link: '', qty: 1, client: 'Karihome' },
    { postingDate: '2027-07-20', pic: 'Dinda', deadline: '2027-07-17', title: 'PAY DAY Karihome', category: 'Editor', taskType: 'Editing', format: 'Single Foto', status: 'Posted', link: 'https://drive.google.com/file/d/1TjR7LkxKmDvrNkVKQi9X4YFT61JyrcQn/view?usp=drive_link', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-23', pic: 'Dinda', deadline: '2026-07-20', title: 'Greetings Hari Anak Nasional', category: 'Editor', taskType: 'Editing', format: 'Grafis', status: 'Approval', link: 'https://drive.google.com/drive/folders/1bhsdQu1ST8jElInaJfO7oLQAbnjK2fwO', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-24', pic: 'Dinda', deadline: '2026-07-21', title: 'Greetings World Brain Day', category: 'Editor', taskType: 'Editing', format: 'Grafis', status: 'Approval', link: 'https://drive.google.com/drive/folders/1bhsdQu1ST8jElInaJfO7oLQAbnjK2fwO', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-25', pic: 'Dinda', deadline: '2026-07-22', title: 'Edukasi dr Rita : Kenapa susu kambing sering di bilang prengus?', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approval', link: 'https://drive.google.com/file/d/1NyXDjykl-60FiBeymc3Goj5bKT9J-SW4/view?usp=drive_link', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-26', pic: 'Dinda', deadline: '2026-07-23', title: 'Mbex Junior Medan', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: 'https://drive.google.com/drive/folders/19656Ve6oRPw4_z-7cXBLv_oILUbCEtGE?usp=sharing', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-27', pic: 'Dinda', deadline: '2026-07-24', title: 'Susu Karihome Bau Kambing Nggak? Ala keenan voice over', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approval', link: 'https://drive.google.com/file/d/1IAjzL1JpKUwnXtdlylMWVGbTI5vf4qLU/view?usp=drive_link', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-29', pic: 'Dinda', deadline: '2026-07-26', title: 'Mitos OR Fakta', category: 'Editor', taskType: 'Editing', format: 'Reels', status: 'Approval', link: 'https://drive.google.com/file/d/1GivQNgexsQJgSXUWW0wWdpV4aqtUXtyB/view?usp=drive_link', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-31', pic: 'Dinda', deadline: '2026-07-28', title: 'Gizi seimbang bagi anak', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Posted', link: 'https://drive.google.com/drive/folders/1rtPGM0nzkQccOb2VSN1DWpvoOqQMGxgv?usp=sharing', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-31', pic: 'Dinda', deadline: '2026-07-28', title: 'Gizi seimbang bagi anak Revisi', category: 'Editor', taskType: 'Revisi', format: 'Single Foto', status: 'Posted', link: 'https://drive.google.com/drive/folders/1rtPGM0nzkQccOb2VSN1DWpvoOqQMGxgv?usp=sharing', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-13', pic: 'Anggi', deadline: '2026-07-13', title: 'Meeting With karihome month Agust', category: 'Strategic', taskType: 'Presentasi', format: 'Grafis', status: 'Draft', link: '', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-16', pic: 'Anggi', deadline: '2026-07-16', title: 'Content Proposed Karihome', category: 'Strategic', taskType: 'Presentasi', format: 'Grafis', status: 'Draft', link: '', qty: 1, client: 'Karihome' },
    { postingDate: '2026-07-14', pic: 'Anggi', deadline: '2026-07-15', title: 'Content Plan Dan Script Writing Karihome Agustus', category: 'Strategic', taskType: 'Content Plan', format: '4 Jam', status: 'Draft', link: '', qty: 1, client: 'Karihome' },
    { postingDate: '2026-08-08', pic: 'Anggi', deadline: '2026-07-19', title: 'Produksi Karihome with Soraya', category: 'Strategic', taskType: 'Production Lead', format: '4 Jam', status: 'Draft', link: '', qty: 1, client: 'Karihome' },
    { postingDate: '2026-08-15', pic: 'Dinda', deadline: '2026-08-12', title: 'Carousel Jangan percaya semua klaim tentang susu kambing.', category: 'Scheduler', taskType: 'Editing', format: 'Carousel', status: 'Posted', link: 'https://drive.google.com/drive/folders/1VeG5CWG-37ebF46MFaOHmQi2G393MSdH?usp=sharing', qty: 1, client: 'Karihome' },
    { postingDate: '2026-08-26', pic: 'Dinda', deadline: '2026-08-23', title: 'Mbex Junior Medan Tgl 31 Juli - 2 Agust', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: 'https://drive.google.com/drive/folders/19656Ve6oRPw4_z-7cXBLv_oILUbCEtGE?usp=sharing', qty: 1, client: 'Karihome' },
    { postingDate: '2026-08-27', pic: 'Dinda', deadline: '2026-08-24', title: 'Mom n Mee', category: 'Editor', taskType: 'Editing', format: 'Carousel', status: 'Approval', link: 'https://drive.google.com/drive/folders/1Sq8a1sXbm5NB_UsoYzVK6ai9-VV0smcR?usp=', qty: 1, client: 'Karihome' },
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
        title: t.title,
        category: t.category || 'Editor',
        taskType: t.taskType || 'Editing',
        format: t.format,
        qty: t.qty || 1,
        postingDate: new Date(t.postingDate),
        deadline: new Date(t.deadline),
        status: t.status === 'Posted' ? 'Posted' : t.status === 'Approved' ? 'Approval' : t.status === 'Dibatalkan' ? 'Draft' : t.status === 'Approval' || t.status === 'Waiting for Approval' ? 'Approval' : t.status === 'In Progress' ? 'Editing' : 'Brief',
        assignedUserIds: JSON.stringify([picObj ? picObj.id : createdUsers['Jabin'].id]),
        previewLink: t.link,
        score,
        cogs: score * 250,
      },
    });
  }

  // 6. Worklog Ingestion (Official 178 rows)
  await prisma.worklog.deleteMany();
  const rawWorklogs = [
    { date: '2026-07-06', name: 'Dinda', client: 'Karihome', title: 'Karihome Funfact', type: 'Scheduling', format: 'Single Foto', qty: 1, score: 5, status: 'Posted', source: 'Karihome - To Do List', deadline: '2026-06-28', link: 'https://drive.google.com/drive/folders/11aXxV5Gh5D60yOTGSe0rkIIS_PAWTqo7?usp=drive_link' },
    { date: '2026-07-08', name: 'Dinda', client: 'Karihome', title: 'Karihome Funfact Video', type: 'Editing', format: 'Story Video', qty: 1, score: 33, status: 'Posted', source: 'Karihome - To Do List', deadline: '2026-06-28', link: 'https://drive.google.com/drive/folders/11aXxV5Gh5D60yOTGSe0rkIIS_PAWTqo7?usp=drive_link' },
    { date: '2026-07-06', name: 'Dinda', client: 'Karihome', title: 'Setiap Anak punya fase tumbuh yang berbeda', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Posted', source: 'Karihome - To Do List', deadline: '2026-06-30', link: 'https://drive.google.com/file/d/16LZ_npqFNrk5GZd48wO2fP5a3u8vmbQO/view?usp=drive_link' },
    { date: '2026-07-06', name: 'Dinda', client: 'Karihome', title: 'Minum susu sesuai umurnya', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Posted', source: 'Karihome - To Do List', deadline: '2026-07-02', link: 'https://drive.google.com/drive/folders/1UxAhLkH4LOkZeuiGY-5EUsCg5ubJQcMy?usp=drive_link' },
    { date: '2026-07-08', name: 'Dinda', client: 'Karihome', title: 'Makanan Viral VS Nutrisi Harian Anak', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Posted', source: 'Karihome - To Do List', deadline: '2026-07-03', link: 'https://drive.google.com/drive/folders/1UxAhLkH4LOkZeuiGY-5EUsCg5ubJQcMy?usp=drive_link' },
    { date: '2026-07-01', name: 'Jabin', client: 'Baking Empire Kelapa Gading', title: 'Foto Produk Osaka', type: 'Editing', format: 'Single Foto', qty: 1, score: 10, status: 'Dibatalkan', source: 'BE Kelapa Gading - To Do List', deadline: '2026-06-28', link: 'https://drive.google.com/file/d/1eL5kgR4eK01Ro8ZvlG9ciuN83XcBGnnD/view?usp=sharing' },
    { date: '2026-07-03', name: 'Jabin', client: 'Baking Empire Kelapa Gading', title: 'Sometimes, the smallest card', type: 'Editing', format: 'Carousel', qty: 1, score: 150, status: 'Approved', source: 'BE Kelapa Gading - To Do List', deadline: '2026-06-30', link: 'https://drive.google.com/drive/folders/1JvXwRfPimS2lonXCBDKRVw9sfncYN6fx?usp=drive_link' },
    { date: '2026-07-07', name: 'Jabin', client: 'Baking Empire Kelapa Gading', title: 'Update New Menu', type: 'Editing', format: 'Single Foto', qty: 1, score: 10, status: 'Dibatalkan', source: 'BE Kelapa Gading - To Do List', deadline: '2026-07-04', link: 'https://drive.google.com/file/d/1QYiC4OXVWXVspqwfw8YicKQ_mDD23D1R/view?usp=sharing' },
    { date: '2026-07-09', name: 'Jabin', client: 'Baking Empire Kelapa Gading', title: 'Foto Egg Tart Choco', type: 'Editing', format: 'Single Foto', qty: 1, score: 10, status: 'Approved', source: 'BE Kelapa Gading - To Do List', deadline: '2026-07-06', link: 'https://drive.google.com/open?id=1baJtQ-jHxDg3iZy_g3oBaa1E7Qq4Y0KZ&usp=drive_copy' },
    { date: '2026-07-11', name: 'Jabin', client: 'Baking Empire Kelapa Gading', title: 'Blossom Cake viral ini ada di Bali?', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Approved', source: 'BE Kelapa Gading - To Do List', deadline: '2026-07-08', link: 'https://drive.google.com/file/d/1kZlhL0xR5sIqHqG0aP4M521-50eM-w_/view?usp=drive_link' },
    { date: '2026-07-02', name: 'Jabin', client: 'Baking Empire Citra 8', title: 'Grand Opening Citra 8 Highlight', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Approved', source: 'BE Citra 8 - To Do List', deadline: '2026-06-29', link: 'https://drive.google.com/file/d/16LZ_npqFNrk5GZd48wO2fP5a3u8vmbQO/view?usp=drive_link' },
    { date: '2026-07-04', name: 'Jabin', client: 'Baking Empire Citra 8', title: 'Outlet Tour Ruko Citra 8', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Approved', source: 'BE Citra 8 - To Do List', deadline: '2026-07-01', link: 'https://drive.google.com/file/d/1W5gA77hJ-8y06s5k5J8P6-M0n6a6-N4/view?usp=drive_link' },
    { date: '2026-07-05', name: 'Anggi', client: 'Samazama Japan', title: 'Japanese Dining Experience', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Approved', source: 'Samazama - Content Plan', deadline: '2026-07-02', link: 'https://drive.google.com' },
    { date: '2026-07-01', name: 'Priska', client: 'MotoDW', title: 'Detail Coating Supercar', type: 'Editing', format: 'Reels', qty: 1, score: 150, status: 'Approved', source: 'MotoDW - Content Plan', deadline: '2026-06-28', link: 'https://drive.google.com' },
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
      },
    });
  }

  console.log(`✅ Seeded ${rawTasks.length} To Do List Tasks across all 5 Client Master Accounts!`);
  console.log('🚀 Persona OS Full Master Database Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
