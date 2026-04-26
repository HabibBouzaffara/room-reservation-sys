const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const start = new Date('2026-04-21T00:00:00.000Z');
  const end = new Date('2026-05-02T00:00:00.000Z'); // up to May 1 inclusive

  const reservations = await prisma.reservation.findMany({
    where: {
      startTime: { gte: start, lt: end }
    }
  });

  console.log(`Found ${reservations.length} slots to delete.`);

  let deleted = 0;
  for (const res of reservations) {
    try {
      await prisma.reservation.delete({ where: { id: res.id } });
      deleted++;
    } catch (e) {
      // ignore
    }
  }
  console.log(`Successfully deleted ${deleted} slots.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
