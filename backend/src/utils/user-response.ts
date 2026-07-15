import { Prisma } from '@prisma/client'

export const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  contributionScore: true,
  createdAt: true,
  updatedAt: true,
  contributorProfile: true
} satisfies Prisma.UserSelect

export const selfUserSelect = {
  ...publicUserSelect,
  email: true,
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
