import { prisma } from '../utils/prisma'
import { AppError } from '../lib/errors'

// Remembers when GitHub rejected a user's stored token (expired or revoked), so
// the app can ask them to reconnect even when the failure happened in a
// background job. A new sign-in stores a fresh token and clears it.

/** The error the GitHub client raises for a 401 on the user's token */
export const isGithubTokenError = (error: unknown): boolean =>
  error instanceof AppError && /GitHub token is invalid or expired/i.test(error.message)

export const markGithubTokenInvalid = async (userId: string): Promise<void> => {
  await prisma.user.updateMany({ where: { id: userId, githubTokenInvalidAt: null }, data: { githubTokenInvalidAt: new Date() } })
}

/** Marks the token if `error` is GitHub rejecting it; returns whether it was */
export const noteGithubTokenError = async (userId: string | undefined, error: unknown): Promise<boolean> => {
  if (!userId || !isGithubTokenError(error)) return false
  await markGithubTokenInvalid(userId).catch(() => {})
  return true
}
