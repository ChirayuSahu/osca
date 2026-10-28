import { Prisma } from '@prisma/client'

// What other signed-in users see on someone's profile (Community): identity,
// skills and the contributor scores and stats. Never email or linked accounts.
export const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  skills: true,
  contributionScore: true,
  createdAt: true,
  updatedAt: true,
  contributorProfile: true,
  profileShowScores: true,
  profileShowCalendar: true
} satisfies Prisma.UserSelect

export const selfUserSelect = {
  ...publicUserSelect,
  email: true,
  communityHidden: true,
  experienceLevel: true,
  preferredLanguages: true,
  excludedLanguages: true,
  feedView: true,
  interestAreas: true,
  onboardedAt: true,
  githubTokenInvalidAt: true,
  oauthAccounts: {
    select: {
      id: true,
      provider: true,
      providerId: true,
      username: true,
      createdAt: true,
      updatedAt: true
    }
  }
} satisfies Prisma.UserSelect
