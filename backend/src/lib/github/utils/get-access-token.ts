import { prisma } from '../../../utils/prisma'
import { AppError } from '../../errors'
import { config } from '../../../config'
import { decryptToken } from '../../crypto/token-cipher'

export const getGithubAccessToken = async (userId: string): Promise<string> => {
  const oauthAccount = await prisma.oAuthAccount.findFirst({
    where: {
      userId,
      provider: 'github'
    }
  })

  if (oauthAccount === null || oauthAccount.accessToken === '') {
    throw new AppError('No GitHub access token found. Please re-authenticate.', 400)
  }

  try {
    return decryptToken(oauthAccount.accessToken)
  } catch {
    // Unreadable (e.g. the encryption key changed): same as an expired connection
    throw new AppError('Stored GitHub token is invalid. Please re-authenticate.', 403)
  }
}

// Token for jobs that may run without a user (e.g. seeding): the user's own
// token when one is given, otherwise the server's GITHUB_TOKEN.
export const getGithubTokenForJob = async (userId?: string): Promise<string> => {
  if (userId) return getGithubAccessToken(userId)
  if (!config.githubServerToken) {
    throw new AppError('GITHUB_TOKEN is not configured; it is required for jobs without a user.', 500)
  }
  return config.githubServerToken
}
