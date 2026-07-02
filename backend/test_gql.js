const fetch = require('node-fetch'); // wait node 18 has fetch

async function run() {
  const token = 'xxx'; // Need a token to test, but I can just use prisma to get one
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const account = await prisma.oAuthAccount.findFirst({ where: { provider: 'github' } });
  
  if (!account || !account.accessToken) return console.log("no token");

  const query = `
    query getRepoDependencies($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        dependencyGraphManifests {
          nodes {
            blobPath
            dependencies {
              nodes {
                packageName
                requirements
                hasDependencies
                packageManager
              }
            }
          }
        }
      }
    }
  `;

  // let's test on the hotel booking site, we don't know the owner but we can test on a known one like 'facebook', 'react'
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.hawkgirl-preview+json'
    },
    body: JSON.stringify({ query, variables: { owner: 'facebook', repo: 'react' } })
  });
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  prisma.$disconnect();
}
run();
