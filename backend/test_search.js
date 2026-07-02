const { PrismaClient } = require('@prisma/client');

async function run() {
  const db = new PrismaClient();
  const account = await db.oAuthAccount.findFirst({ where: { provider: 'github' } });
  
  if (!account || !account.accessToken) return console.log("no token");

  const response = await fetch(`https://api.github.com/search/repositories?q=facebook%2Fmeta&sort=updated&order=desc&page=1&per_page=8`, {
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  const data = await response.json();
  console.log("total_count:", data.total_count);
  console.log("items length:", data.items ? data.items.length : 'no items');
  if (!data.items) {
    console.log("Error:", data);
  }
  
  await db.$disconnect();
}
run();
