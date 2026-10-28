import { prisma } from '../utils/prisma'
import { githubGetJson, getGithubAccessToken } from '../lib/github'
import { aggregateKeywords, keywordsForInterestAreas } from '../lib/text/keywords'
import { Neo4jSyncService } from './neo4j-sync.service'
import { importedOwnRepositories } from './profile-refresh.service'

// The keyword side of a user's taste: what their own and starred repositories
// are about, plus the interest areas they picked at onboarding.

type RepoMeta = { fork?: boolean; description: string | null; topics?: string[] }

const githubIdOf = async (userId: string): Promise<number | null> => {
  const account = await prisma.oAuthAccount.findFirst({ where: { userId, provider: 'github' }, select: { providerId: true } })
  const id = account ? parseInt(account.providerId, 10) : NaN
  return isNaN(id) ? null : id
}

/** From the user's own (recently pushed) and starred repositories: two GitHub calls */
export const syncUserRepoKeywords = async (userId: string): Promise<number> => {
  const githubId = await githubIdOf(userId)
  if (githubId === null) return 0
  const token = await getGithubAccessToken(userId)
  const [owned, starred] = await Promise.all([
    githubGetJson<RepoMeta[]>('/user/repos?sort=pushed&per_page=50&type=owner', token).catch(() => [] as RepoMeta[]),
    githubGetJson<RepoMeta[]>('/user/starred?per_page=50', token).catch(() => [] as RepoMeta[])
  ])
  // Own repos imported into OSCA count twice: they're what the user chose to bring in
  const imported = await importedOwnRepositories(userId)
  const sources = [...owned.filter(r => !r.fork), ...starred, ...imported, ...imported]
    .map(r => ({ topics: r.topics ?? [], description: r.description }))
  const keywords = aggregateKeywords(sources, 30)
  await Neo4jSyncService.syncUserKeywords(githubId, 'repos', keywords)
  return keywords.length
}

/** From the interest areas picked at onboarding or in Settings */
export const syncUserInterestAreas = async (userId: string): Promise<void> => {
  const [githubId, user] = await Promise.all([
    githubIdOf(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { interestAreas: true } })
  ])
  if (githubId === null || !user) return
  await Neo4jSyncService.syncUserKeywords(githubId, 'onboarding', keywordsForInterestAreas(user.interestAreas))
}
