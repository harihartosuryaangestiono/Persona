import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting attendance records repair and migration...');

  const settings = await prisma.companySetting.findFirst();
  const workStart = settings?.workStart || '09:00';
  const gracePeriod = settings?.gracePeriod !== undefined ? settings.gracePeriod : 15;

  const [startHour, startMinute] = workStart.split(':').map(Number);
  const workStartMinutes = startHour * 60 + startMinute;

  console.log(`Using Work Start: ${workStart}, Grace Period: ${gracePeriod} minutes`);

  const records = await prisma.attendance.findMany();
  console.log(`Found ${records.length} existing attendance records to audit.`);

  let updatedCount = 0;

  for (const record of records) {
    const { clockIn, clockOut } = record;

    // Timezone calculations for lateness
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    
    let isLate = false;
    let lateMinutes = 0;

    try {
      const formattedTime = formatter.format(clockIn);
      const [hour, minute] = formattedTime.split(':').map(Number);
      const clockInMinutes = hour * 60 + minute;
      const diff = clockInMinutes - workStartMinutes;
      isLate = diff > gracePeriod;
      lateMinutes = isLate ? diff : 0;
    } catch (e) {
      console.error(`Failed to format clockIn time for record ${record.id}:`, e);
    }

    let status = 'COMPLETED';
    let workingMinutes = 0;
    let workingHours = 0.0;

    if (clockOut) {
      const elapsedMs = clockOut.getTime() - clockIn.getTime();
      workingMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
      workingHours = Math.round((workingMinutes / 60.0) * 100) / 100;
      status = 'COMPLETED';
    } else {
      status = 'ACTIVE';
      workingMinutes = 0;
      workingHours = 0.0;
    }

    await prisma.attendance.update({
      where: { id: record.id },
      data: {
        workingMinutes,
        workingHours,
        status,
        isLate,
        lateMinutes,
      },
    });

    updatedCount++;
  }

  console.log(`✅ Audited and repaired ${updatedCount} attendance records successfully!`);
}

main()
  .catch((e) => {
    console.error('❌ Error repairing attendance records:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
