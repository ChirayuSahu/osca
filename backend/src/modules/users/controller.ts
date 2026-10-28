import { NextFunction, Response } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { AppError, assertFound } from '../../lib/errors'
import { JobEnqueueService } from '../../services/job-enqueue.service'
import { publicUserSelect, selfUserSelect } from '../../utils/user-response'
import { asyncHandler } from '../../utils/async-handler'

const MAX_NAME_LENGTH = 100
const MAX_SKILLS = 50
const MAX_SKILL_LENGTH = 50
const AVATAR_URL = /^https:\/\/avatars\.githubusercontent\.com\/[^\s"'<>]+$/

const requireSelf = (req: RequestWithUser, userId: string): void => {
  if (req.user?.id !== userId) {
    throw new AppError('Forbidden: You can only access your own user profile', 403)
  }
}

// Your own record in full; anyone else's as the public profile (Community).
const getUser = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  const isSelf = req.user?.id === id

  const user = await prisma.user.findUnique({
    where: { id },
    select: isSelf ? selfUserSelect : publicUserSelect
  })

  assertFound(user, 'User not found')
  sendResponse(res, 200, true, 'User retrieved successfully', user)
})

const updateUser = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  requireSelf(req, id)

  // #10: Whitelist only user-editable fields.
  // contributionScore is a computed metric and must never be user-writable.
  // email comes from GitHub and is not user-writable either (it is unverified).
  const { name, avatarUrl, skills } = req.body
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
  if (Array.isArray(skills)) {
    data.skills = [...new Set(skills.map(s => String(s).trim()).filter(s => s.length > 0 && s.length <= MAX_SKILL_LENGTH))]
      .slice(0, MAX_SKILLS)
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: selfUserSelect
  })

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

export const UserController = {
  getUser,
  updateUser,
  analyzeProfile
}
