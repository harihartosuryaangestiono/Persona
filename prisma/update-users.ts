import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Rename Gigie → Gigi + update roles + email
  const gigiUpdate = await prisma.user.updateMany({
    where: {
      OR: [
        { id: 'u-gigie' },
        { name: { in: ['Gigie', 'gigie'] } },
      ],
    },
    data: {
      name: 'Gigi',
      email: 'gigi@personaos.com',
      roles: JSON.stringify(['Strategist', 'Production Assistant', 'Editor', 'Scheduler']),
    },
  });
  console.log(`✅ Gigie → Gigi: updated ${gigiUpdate.count} row(s)`);

  // 2. Rename Priska → Prisca + update email
  const priscaUpdate = await prisma.user.updateMany({
    where: {
      OR: [
        { id: 'u-priska' },
        { name: { in: ['Priska', 'priska'] } },
      ],
    },
    data: {
      name: 'Prisca',
      email: 'prisca@personaos.com',
    },
  });
  console.log(`✅ Priska → Prisca: updated ${priscaUpdate.count} row(s)`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
