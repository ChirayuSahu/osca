import { NextFunction, Response } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { AppError, assertFound } from '../../lib/errors'
import { JobEnqueueService } from '../../services/job-enqueue.service'
import { publicUserSelect, selfUserSelect } from '../../utils/user-response'
import { asyncHandler } from '../../utils/async-handler'
import { AccountService } from '../../services/account.service'
import { clearIssueRecommendations } from '../../services/issue-recommendation.service'
import { syncUserInterestAreas } from '../../services/user-keywords.service'
import { INTEREST_AREAS } from '../../lib/text/keywords'
import { NOT_INTERESTED_ACTION } from '../../services/recommendation-engine.service'

const MAX_NAME_LENGTH = 100
const MAX_SKILLS = 50
const MAX_SKILL_LENGTH = 50
const AVATAR_URL = /^https:\/\/avatars\.githubusercontent\.com\/[^\s"'<>]+$/
const EXPERIENCE_LEVELS = ['first', 'some', 'experienced']
const FEED_VIEWS = ['grid', 'focus']
const MAX_LANGUAGES = 20
const MAX_LANGUAGE_LENGTH = 50

const requireSelf = (req: RequestWithUser, userId: string): void => {
  if (req.user?.id !== userId) {
    throw new AppError('Forbidden: You can only access your own user profile', 403)
  }
}

// Your own record in full; anyone else's as the public profile (Community),
// unless they've hidden it, which looks the same as not existing.
const getUser = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  const isSelf = req.user?.id === id

  if (isSelf) {
    const user = assertFound(await prisma.user.findUnique({ where: { id }, select: selfUserSelect }), 'User not found')
    sendResponse(res, 200, true, 'User retrieved successfully', user)
    return
  }

  const user = assertFound(
    await prisma.user.findFirst({ where: { id, communityHidden: false }, select: publicUserSelect }),
    'User not found'
  )
  // Scores they've chosen to keep private never leave the server
  const visible = user.profileShowScores ? user : { ...user, contributorProfile: null, contributionScore: null }
  sendResponse(res, 200, true, 'User retrieved successfully', visible)
})

const boolField = (value: unknown, name: string): boolean | undefined => {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new AppError(`${name} must be true or false`, 400)
  return value
}

const languageList = (value: unknown, name: string): string[] | undefined => {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new AppError(`${name} must be a list of languages`, 400)
  const list = [...new Set(value.map(v => String(v).trim()).filter(v => v.length > 0 && v.length <= MAX_LANGUAGE_LENGTH))]
  if (list.length > MAX_LANGUAGES) throw new AppError(`${name} can hold at most ${MAX_LANGUAGES} languages`, 400)
  return list
}

const updateUser = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  requireSelf(req, id)

  // #10: Whitelist only user-editable fields.
  // contributionScore is a computed metric and must never be user-writable.
  // email comes from GitHub and is not user-writable either (it is unverified).
  const { name, avatarUrl, skills, experienceLevel, feedView } = req.body
  const data: Record<string, unknown> = {}

  if (typeof name === 'string') {
    const trimmed = name.trim()
    if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) throw new AppError(`Name must be 1–${MAX_NAME_LENGTH} characters`, 400)
    data.name = trimmed
  }
  // Shown to other users (Community), so only GitHub's avatar host: an arbitrary
  // URL would let someone log the IP of everyone who views their card.
  if (typeof avatarUrl === 'string') {
    if (!AVATAR_URL.test(avatarUrl)) throw new AppError('avatarUrl must be a GitHub avatar URL', 400)
    data.avatarUrl = avatarUrl
  }
  for (const field of ['communityHidden', 'profileShowScores', 'profileShowCalendar'] as const) {
    const value = boolField(req.body[field], field)
    if (value !== undefined) data[field] = value
  }
  if (experienceLevel !== undefined) {
    if (!EXPERIENCE_LEVELS.includes(experienceLevel)) throw new AppError(`experienceLevel must be one of ${EXPERIENCE_LEVELS.join(', ')}`, 400)
    data.experienceLevel = experienceLevel
  }
  if (req.body.interestAreas !== undefined) {
    const areas = req.body.interestAreas
    if (!Array.isArray(areas) || areas.some(a => typeof a !== 'string' || !(a in INTEREST_AREAS))) {
      throw new AppError(`interestAreas must be a list of: ${Object.keys(INTEREST_AREAS).join(', ')}`, 400)
    }
    data.interestAreas = [...new Set(areas as string[])]
  }
  // Set once when the user finishes (or skips) onboarding
  if (req.body.onboarded === true) data.onboardedAt = new Date()
  if (feedView !== undefined) {
    if (!FEED_VIEWS.includes(feedView)) throw new AppError(`feedView must be one of ${FEED_VIEWS.join(', ')}`, 400)
    data.feedView = feedView
  }
  const preferred = languageList(req.body.preferredLanguages, 'preferredLanguages')
  const excluded = languageList(req.body.excludedLanguages, 'excludedLanguages')
  if (preferred !== undefined || excluded !== undefined) {
    // Compare against what's stored for whichever list isn't being changed
    const current = await prisma.user.findUnique({ where: { id }, select: { preferredLanguages: true, excludedLanguages: true } })
    const nextPreferred = (preferred ?? current?.preferredLanguages ?? []).map(l => l.toLowerCase())
    const clash = (excluded ?? current?.excludedLanguages ?? []).find(l => nextPreferred.includes(l.toLowerCase()))
    if (clash) throw new AppError(`${clash} can't be both preferred and excluded`, 400)
    if (preferred !== undefined) data.preferredLanguages = preferred
    if (excluded !== undefined) data.excludedLanguages = excluded
  }
  if (Array.isArray(skills)) {
    data.skills = [...new Set(skills.map(s => String(s).trim()).filter(s => s.length > 0 && s.length <= MAX_SKILL_LENGTH))]
      .slice(0, MAX_SKILLS)
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: selfUserSelect
  })
  if ('interestAreas' in data) await syncUserInterestAreas(id).catch(err => console.error('[Users] Failed to sync interest areas:', err))
  if (['experienceLevel', 'preferredLanguages', 'excludedLanguages', 'interestAreas'].some(k => k in data)) await clearIssueRecommendations(id)

  sendResponse(res, 200, true, 'User updated successfully', user)
})

const analyzeProfile = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  requireSelf(req, id)

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  assertFound(user, 'User not found')

  const queued = await JobEnqueueService.enqueueContributorAnalysis(id)
  sendResponse(res, 202, true, 'Contributor analysis queued', queued)
})

// Repositories you marked "Not for me", newest first, so they can be restored
const listNotInterested = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  requireSelf(req, id)

  const rows = await prisma.userInteraction.findMany({
    where: { userId: id, action: NOT_INTERESTED_ACTION },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      repository: { select: { id: true, owner: true, name: true, description: true, primaryLanguage: true, stars: true } }
    }
  })
  sendResponse(res, 200, true, 'Hidden repositories retrieved successfully', rows.map(r => ({ ...r.repository, hiddenAt: r.createdAt })))
})

// Deletes your account and everything OSCA stores about you
const deleteUser = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  requireSelf(req, id)

  assertFound(await prisma.user.findUnique({ where: { id }, select: { id: true } }), 'User not found')
  await AccountService.deleteAccount(id)
  sendResponse(res, 200, true, 'Account deleted')
})

export const UserController = {
  getUser,
  updateUser,
  analyzeProfile,
  listNotInterested,
  deleteUser
}
