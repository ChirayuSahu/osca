const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const repo = await prisma.repository.findFirst({ where: { name: 'Hotel_booking_site' } });
  if (!repo) {
    console.log("Not found in DB (must be preview)");
  } else {
    console.log("Found in DB. Dependencies length:", repo.dependencies ? repo.dependencies.length : null);
  }
  prisma.$disconnect();
}
run();
