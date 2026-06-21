import { Response } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { AppError, assertFound } from '../../lib/errors'
import { asyncHandler } from '../../utils/async-handler'
import { publicUserSelect } from '../../utils/user-response'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (userId === undefined) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

const createThread = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const { repositoryId, title, content } = req.body

  if (!repositoryId || !title || !content) {
    throw new AppError('repositoryId, title, and content are required', 400)
  }

  // Ensure repository exists
  const repo = await prisma.repository.findUnique({ where: { id: String(repositoryId) } })
  assertFound(repo, 'Repository not found')

  const thread = await prisma.repositoryThread.create({
    data: {
      repositoryId: String(repositoryId),
      authorId: userId,
      title: String(title),
      content: String(content)
    },
    include: {
      author: { select: publicUserSelect }
    }
  })

  sendResponse(res, 201, true, 'Thread created successfully', thread)
})

const getThread = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  
  const thread = await prisma.repositoryThread.findUnique({
    where: { id },
    include: {
      author: { select: publicUserSelect },
      _count: {
        select: { comments: true }
      }
    }
  })

  assertFound(thread, 'Thread not found')
  sendResponse(res, 200, true, 'Thread retrieved successfully', thread)
})

const updateThread = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const id = String(req.params.id)
  
  const existingThread = await prisma.repositoryThread.findUnique({ where: { id } })
  assertFound(existingThread, 'Thread not found')

  if (existingThread.authorId !== userId) {
    throw new AppError('Forbidden: You can only update your own threads', 403)
  }

  const { title, content, isPinned, isLocked } = req.body
  const data: Record<string, any> = {}

  if (typeof title === 'string') data.title = title
  if (typeof content === 'string') data.content = content
  if (typeof isPinned === 'boolean') data.isPinned = isPinned
  if (typeof isLocked === 'boolean') data.isLocked = isLocked

  const thread = await prisma.repositoryThread.update({
    where: { id },
    data,
    include: {
      author: { select: publicUserSelect }
    }
  })

  sendResponse(res, 200, true, 'Thread updated successfully', thread)
})

export const ThreadController = {
  createThread,
  getThread,
  updateThread
}
