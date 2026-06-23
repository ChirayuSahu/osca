import { NextFunction,  Response } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { AppError, assertFound } from '../../lib/errors'
import { asyncHandler } from '../../utils/async-handler'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'
import { publicUserSelect } from '../../utils/user-response'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (userId === undefined) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

const createComment = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const userId = requireUserId(req)
  const { threadId, content, parentId } = req.body

  if (!threadId || !content) {
    throw new AppError('threadId and content are required', 400)
  }

  // Ensure thread exists
  const thread = await prisma.repositoryThread.findUnique({ where: { id: String(threadId) } })
  assertFound(thread, 'Thread not found')

  if (parentId) {
    const parentComment = await prisma.threadComment.findUnique({ where: { id: String(parentId) } })
    assertFound(parentComment, 'Parent comment not found')
  }

  const comment = await prisma.threadComment.create({
    data: {
      threadId: String(threadId),
      authorId: userId,
      content: String(content),
      parentId: parentId ? String(parentId) : null
    },
    include: {
      author: { select: publicUserSelect }
    }
  })

  sendResponse(res, 201, true, 'Comment added successfully', comment)
  } catch (error) {
    next(error)
  }
})

const getComments = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
  const threadId = req.query.threadId as string
  if (!threadId) {
    throw new AppError('threadId query parameter is required', 400)
  }

  const skip = req.pagination?.skip ?? 0
  const take = req.pagination?.take ?? 10

  const [total, comments] = await Promise.all([
    prisma.threadComment.count({ where: { threadId } }),
    prisma.threadComment.findMany({
      where: { threadId },
      skip,
      take,
      include: {
        author: { select: publicUserSelect },
        _count: {
          select: { replies: true, votes: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
  ])

  // We may also want to aggregate votes or fetch user's own vote. For simplicity, we just return comments.
  sendResponse(res, 200, true, 'Comments retrieved successfully', comments, {
    page: req.pagination?.page ?? 1,
    limit: req.pagination?.limit ?? 10,
    total,
    totalPages: Math.ceil(total / (req.pagination?.limit ?? 10))
  })
  } catch (error) {
    next(error)
  }
})

const updateComment = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const userId = requireUserId(req)
  const id = String(req.params.id)
  
  const existingComment = await prisma.threadComment.findUnique({ where: { id } })
  if (!existingComment) throw new AppError('Comment not found', 404)

  if (existingComment.authorId !== userId) {
    throw new AppError('Forbidden: You can only update your own comments', 403)
  }

  const { content } = req.body
  if (!content) {
    throw new AppError('content is required', 400)
  }

  const comment = await prisma.threadComment.update({
    where: { id },
    data: { content: String(content) },
    include: {
      author: { select: publicUserSelect }
    }
  })

  sendResponse(res, 200, true, 'Comment updated successfully', comment)
  } catch (error) {
    next(error)
  }
})

const deleteComment = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const userId = requireUserId(req)
  const id = String(req.params.id)
  
  const existingComment = await prisma.threadComment.findUnique({ where: { id } })
  if (!existingComment) throw new AppError('Comment not found', 404)

  if (existingComment.authorId !== userId) {
    throw new AppError('Forbidden: You can only delete your own comments', 403)
  }

  await prisma.threadComment.delete({ where: { id } })

  sendResponse(res, 200, true, 'Comment deleted successfully')
  } catch (error) {
    next(error)
  }
})

const voteComment = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const userId = requireUserId(req)
  const commentId = String(req.params.id)
  const { value } = req.body

  if (value !== 1 && value !== -1 && value !== 0) {
    throw new AppError('Vote value must be 1, -1, or 0 (to remove vote)', 400)
  }

  const existingComment = await prisma.threadComment.findUnique({ where: { id: commentId } })
  assertFound(existingComment, 'Comment not found')

  if (value === 0) {
    // Remove vote
    await prisma.commentVote.deleteMany({
      where: { commentId, userId }
    })
    sendResponse(res, 200, true, 'Vote removed successfully')
    return
  }

  const vote = await prisma.commentVote.upsert({
    where: {
      commentId_userId: {
        commentId,
        userId
      }
    },
    update: { value },
    create: {
      commentId,
      userId,
      value
    }
  })

  sendResponse(res, 200, true, 'Vote recorded successfully', vote)
  } catch (error) {
    next(error)
  }
})

export const CommentController = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  voteComment
}
