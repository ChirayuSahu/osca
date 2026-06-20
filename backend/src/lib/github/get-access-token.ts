import { prisma } from '../../utils/prisma'
import { AppError } from '../errors'

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

  return oauthAccount.accessToken
}
