import { Response, NextFunction } from 'express'
import { asyncHandler } from '../../utils/async-handler'
import { sendResponse } from '../../utils/send-response'
import { AppError } from '../../lib/errors'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'
import { PullsService, isValidReaction } from './service'

const listPulls = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const page = req.pagination?.page ?? 1
    const limit = req.pagination?.limit ?? 10

    const result = await PullsService.listPulls(userId, owner, repo, page, limit)
    sendResponse(res, 200, true, 'Pull requests retrieved successfully', result.pulls, {
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    })
  } catch (error) {
    next(error)
  }
})

const getPull = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const pullNumber = parseInt(String(req.params.pullNumber), 10)

    const result = await PullsService.getPull(userId, owner, repo, pullNumber)
    sendResponse(res, 200, true, 'Pull request retrieved successfully', result)
  } catch (error) {
    next(error)
  }
})

const listPullComments = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const pullNumber = parseInt(String(req.params.pullNumber), 10)
    const page = req.pagination?.page ?? 1
    const limit = req.pagination?.limit ?? 10

    const result = await PullsService.listPullComments(userId, owner, repo, pullNumber, page, limit)
    sendResponse(res, 200, true, 'Pull request comments retrieved successfully', result.comments, {
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    })
  } catch (error) {
    next(error)
  }
})

const createPullComment = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const pullNumber = parseInt(String(req.params.pullNumber), 10)
    const { body } = req.body

    const comment = await PullsService.createPullComment(userId, owner, repo, pullNumber, body)
    sendResponse(res, 201, true, 'Pull request comment created successfully', comment)
  } catch (error) {
    next(error)
  }
})

// ─── Reactions ───────────────────────────────────────────────────────────────

const listPullReactions = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const pullNumber = parseInt(String(req.params.pullNumber), 10)

    const reactions = await PullsService.listPullReactions(userId, owner, repo, pullNumber)
    sendResponse(res, 200, true, 'Pull request reactions retrieved successfully', reactions)
  } catch (error) {
    next(error)
  }
})

const addPullReaction = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const pullNumber = parseInt(String(req.params.pullNumber), 10)
    const { content } = req.body

    if (!content || !isValidReaction(content)) {
      throw new AppError('Invalid reaction. Must be one of: +1, -1, laugh, hooray, confused, heart, rocket, eyes', 400)
    }

    const reaction = await PullsService.addPullReaction(userId, owner, repo, pullNumber, content)
    sendResponse(res, 201, true, 'Reaction added successfully', reaction)
  } catch (error) {
    next(error)
  }
})

const deletePullReaction = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const pullNumber = parseInt(String(req.params.pullNumber), 10)
    const reactionId = parseInt(String(req.params.reactionId), 10)

    await PullsService.deletePullReaction(userId, owner, repo, pullNumber, reactionId)
    sendResponse(res, 200, true, 'Reaction removed successfully')
  } catch (error) {
    next(error)
  }
})

const listPullCommentReactions = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const commentId = parseInt(String(req.params.commentId), 10)

    const reactions = await PullsService.listPullCommentReactions(userId, owner, repo, commentId)
    sendResponse(res, 200, true, 'Pull request comment reactions retrieved successfully', reactions)
  } catch (error) {
    next(error)
  }
})

const addPullCommentReaction = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const commentId = parseInt(String(req.params.commentId), 10)
    const { content } = req.body

    if (!content || !isValidReaction(content)) {
      throw new AppError('Invalid reaction. Must be one of: +1, -1, laugh, hooray, confused, heart, rocket, eyes', 400)
    }

    const reaction = await PullsService.addPullCommentReaction(userId, owner, repo, commentId, content)
    sendResponse(res, 201, true, 'Reaction added successfully', reaction)
  } catch (error) {
    next(error)
  }
})

const deletePullCommentReaction = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const commentId = parseInt(String(req.params.commentId), 10)
    const reactionId = parseInt(String(req.params.reactionId), 10)

    await PullsService.deletePullCommentReaction(userId, owner, repo, commentId, reactionId)
    sendResponse(res, 200, true, 'Reaction removed successfully')
  } catch (error) {
    next(error)
  }
})

export const PullsController = {
  listPulls,
  getPull,
  listPullComments,
  createPullComment,
  listPullReactions,
  addPullReaction,
  deletePullReaction,
  listPullCommentReactions,
  addPullCommentReaction,
  deletePullCommentReaction
}
