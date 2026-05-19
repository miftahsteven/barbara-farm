import prisma from '../src/lib/prisma.js';

async function test() {
  try {
    console.log("Fetching sales...");
    const sales = await prisma.sale.findMany({
      include: { cattle: true }
    });
    console.log("Fetch success! Total records:", sales.length);
  } catch (error) {
    console.error("DB Fetch Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
