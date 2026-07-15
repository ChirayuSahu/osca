import { prisma } from '../../../utils/prisma'

export const getGithubIdForUser = async (userId: string): Promise<number | null> => {
  const account = await prisma.oAuthAccount.findFirst({
    where: { userId, provider: 'github' },
    select: { providerId: true }
  })

  if (!account?.providerId) return null

  const githubId = parseInt(account.providerId, 10)
  return isNaN(githubId) ? null : githubId
}
