import { prisma } from '../utils/prisma'
import { JobEnqueueService } from './job-enqueue.service'

// Importing one of your own repositories says what you're working on now, so
// your skills, interests and scores are rebuilt with it. Other people's repos
// don't change your profile.

const githubLogin = async (userId: string): Promise<string | null> => {
  const account = await prisma.oAuthAccount.findFirst({ where: { userId, provider: 'github' }, select: { username: true } })
  return account?.username ?? null
}

/** Queues a (coalesced) profile rebuild if `repository` belongs to the user */
export const rebuildProfileIfOwnRepository = async (userId: string, repository: { owner: string }): Promise<boolean> => {
  const login = await githubLogin(userId)
  if (!login || login.toLowerCase() !== repository.owner.toLowerCase()) return false
  await JobEnqueueService.enqueueProfileRebuild(userId)
  return true
}

/** The user's imported repositories that they own on GitHub */
export const importedOwnRepositories = async (userId: string) => {
  const login = await githubLogin(userId)
  if (!login) return []
  const imports = await prisma.repositoryImport.findMany({
    where: { userId, repository: { owner: { equals: login, mode: 'insensitive' }, hidden: false } },
    select: { repository: { select: { fullName: true, description: true, topics: true } } }
  })
  return imports.map(i => i.repository)
}
