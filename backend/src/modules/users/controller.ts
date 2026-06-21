import { Response } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { AppError, assertFound } from '../../lib/errors'
import { JobEnqueueService } from '../../services/job-enqueue.service'
import { publicUserSelect, selfUserSelect } from '../../utils/user-response'
import { asyncHandler } from '../../utils/async-handler'

const requireSelf = (req: RequestWithUser, userId: string): void => {
  if (req.user?.id !== userId) {
    throw new AppError('Forbidden: You can only access your own user profile', 403)
  }
}

const getUser = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  requireSelf(req, id)

  const user = await prisma.user.findUnique({
    where: { id },
    select: selfUserSelect
  })

  assertFound(user, 'User not found')
  sendResponse(res, 200, true, 'User retrieved successfully', user)
})

const updateUser = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  requireSelf(req, id)

  const { name, email, avatarUrl, skills, contributionScore } = req.body
  const data: Record<string, unknown> = {}

  if (typeof name === 'string') data.name = name
  if (typeof email === 'string') data.email = email
  if (typeof avatarUrl === 'string') data.avatarUrl = avatarUrl
  if (Array.isArray(skills)) data.skills = skills.map(String)
  if (typeof contributionScore === 'number') data.contributionScore = contributionScore

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
