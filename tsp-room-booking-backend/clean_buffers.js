const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const buffers = await prisma.reservation.findMany({ where: { type: 'BUFFER' } });
  let deleted = 0;
  for (const b of buffers) {
     const parent = await prisma.reservation.findFirst({
        where: {
           room: b.room,
           endTime: b.startTime,
           type: 'NORMAL'
        }
     });
     if (!parent) {
       await prisma.reservation.delete({ where: { id: b.id } });
       deleted++;
     }
  }
  console.log('Deleted orphaned buffers: ' + deleted);
}
main().catch(console.error).finally(() => prisma.$disconnect());
