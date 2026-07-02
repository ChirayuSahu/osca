const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

async function run() {
  const db = new PrismaClient();
  const user = await db.user.findFirst();
  
  if (!user) return console.log("no user");

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
  
  console.log("Token:", token);

  const response = await fetch(`http://localhost:8000/api/v1/repositories/github?q=facebook%2Fmeta`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  const data = await response.json();
  console.log(data);
  
  await db.$disconnect();
}
run();
