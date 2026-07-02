const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const repo = await prisma.repository.findFirst({ where: { name: 'hugo' } });
  console.log(JSON.stringify({ 
    folderStructure: repo?.folderStructure ? repo.folderStructure.length : null, 
    dependencies: repo?.dependencies ? repo.dependencies.length : null, 
    dbId: repo?.id 
  }, null, 2));
  prisma.$disconnect();
}
run();
