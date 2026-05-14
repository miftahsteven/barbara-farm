import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const cattle = await prisma.cattle.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(cattle, null, 2));
  await prisma.$disconnect();
}
run();
