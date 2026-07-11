import { prisma } from './src/utils/prisma'
import { getGithubAccessToken, githubGetJson, githubTryGetRaw } from './src/lib/github'

async function main() {
  const user = await prisma.user.findFirst({ where: { username: 'anikethgalla' } })
  if (!user) return console.log('no user')
  const token = await getGithubAccessToken(user.id)
  if (!token) return console.log('no token')
  
  const badCommentId = 4932206997
  console.log('Found comment to delete: ', badCommentId)
  const deleteRes = await fetch(`https://api.github.com/repos/fastapi/fastapi/issues/comments/${badCommentId}`, { 
    method: 'DELETE', 
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'osca-app'
    }
  })
  console.log('Deleted successfully! Status:', deleteRes.status)
}

main().catch(console.error).finally(() => prisma.$disconnect())
