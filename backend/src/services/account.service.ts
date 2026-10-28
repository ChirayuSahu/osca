import { config } from '../config'
import { prisma } from '../utils/prisma'
import { getGithubAccessToken } from '../lib/github'
import { Neo4jSyncService } from './neo4j-sync.service'
import { clearFeedHistory } from './recommendation-engine.service'

// Revokes OSCA's authorization on the user's GitHub account, so the app no
// longer appears under their authorized OAuth apps. Best-effort: a token that's
// already invalid has nothing left to revoke.
const revokeGithubGrant = async (userId: string): Promise<void> => {
  if (!config.githubClientId || !config.githubClientSecret) return
  const accessToken = await getGithubAccessToken(userId).catch(() => null)
  if (!accessToken) return

  const basic = Buffer.from(`${config.githubClientId}:${config.githubClientSecret}`).toString('base64')
  const response = await fetch(`https://api.github.com/applications/${config.githubClientId}/grant`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Open-Source-Contributor-Matching-Platform'
    },
    body: JSON.stringify({ access_token: accessToken }),
    signal: AbortSignal.timeout(10_000)
  }).catch(() => null)
  if (response && !response.ok && response.status !== 404 && response.status !== 422) {
    console.warn(`[Account] GitHub grant revocation for user ${userId} returned HTTP ${response.status}`)
  }
}

/**
 * Deletes an account and everything OSCA stores about it: the GitHub grant, the
 * user's graph node, their feed history in Redis, then the Postgres user, which
 * cascades to the OAuth account (and encrypted token), contributor profile,
 * likes, imports, interests and interactions.
 */
const deleteAccount = async (userId: string): Promise<void> => {
  const account = await prisma.oAuthAccount.findFirst({ where: { userId, provider: 'github' }, select: { providerId: true } })
  const githubId = account ? parseInt(account.providerId, 10) : NaN

  await revokeGithubGrant(userId)
  if (!isNaN(githubId)) {
    await Neo4jSyncService.deleteUser(githubId).catch((error) => {
      console.error(`[Account] Failed to delete graph node for user ${userId}:`, error)
    })
  }
  await clearFeedHistory(userId).catch(() => {})
  await prisma.user.delete({ where: { id: userId } })
}

export const AccountService = {
  deleteAccount
}
