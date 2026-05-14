import prisma from './lib/prisma.js';

async function main() {
  const records = await prisma.healthRecord.findMany({
    include: { cattle: true }
  });
  console.log('Total Health Records:', records.length);
  console.log(JSON.stringify(records, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
