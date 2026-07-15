import { Response, NextFunction } from 'express'
import { asyncHandler } from '../../utils/async-handler'
import { sendResponse } from '../../utils/send-response'
import { AppError } from '../../lib/errors'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'
import { IssuesService, isValidReaction } from './service'

const listIssues = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const page = req.pagination?.page ?? 1
    const limit = req.pagination?.limit ?? 10

    const result = await IssuesService.listIssues(userId, owner, repo, page, limit)
    sendResponse(res, 200, true, 'Issues retrieved successfully', result.issues, {
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    })
  } catch (error) {
    next(error)
  }
})

const getIssue = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const issueNumber = parseInt(String(req.params.issueNumber), 10)

    const result = await IssuesService.getIssue(userId, owner, repo, issueNumber)
    sendResponse(res, 200, true, 'Issue retrieved successfully', result)
  } catch (error) {
    next(error)
  }
})

const listIssueComments = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const issueNumber = parseInt(String(req.params.issueNumber), 10)
    const page = req.pagination?.page ?? 1
    const limit = req.pagination?.limit ?? 10

    const result = await IssuesService.listIssueComments(userId, owner, repo, issueNumber, page, limit)
    sendResponse(res, 200, true, 'Issue comments retrieved successfully', result.comments, {
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    })
  } catch (error) {
    next(error)
  }
})

const createIssue = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const { title, body } = req.body

    const issue = await IssuesService.createIssue(userId, owner, repo, title, body)
    sendResponse(res, 201, true, 'Issue created successfully', issue)
  } catch (error) {
    next(error)
  }
})

const createIssueComment = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const issueNumber = parseInt(String(req.params.issueNumber), 10)
    const { body } = req.body

    const comment = await IssuesService.createIssueComment(userId, owner, repo, issueNumber, body)
    sendResponse(res, 201, true, 'Issue comment created successfully', comment)
  } catch (error) {
    next(error)
  }
})

const deleteIssueComment = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const commentId = parseInt(String(req.params.commentId), 10)

    await IssuesService.deleteIssueComment(userId, owner, repo, commentId)
    sendResponse(res, 200, true, 'Issue comment deleted successfully')
  } catch (error) {
    next(error)
  }
})

// ─── Reactions ───────────────────────────────────────────────────────────────

const listIssueReactions = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const issueNumber = parseInt(String(req.params.issueNumber), 10)

    const reactions = await IssuesService.listIssueReactions(userId, owner, repo, issueNumber)
    sendResponse(res, 200, true, 'Issue reactions retrieved successfully', reactions)
  } catch (error) {
    next(error)
  }
})

const listIssueCommentReactions = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const commentId = parseInt(String(req.params.commentId), 10)

    const reactions = await IssuesService.listIssueCommentReactions(userId, owner, repo, commentId)
    sendResponse(res, 200, true, 'Issue comment reactions retrieved successfully', reactions)
  } catch (error) {
    next(error)
  }
})

const toggleIssueReaction = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const issueNumber = parseInt(String(req.params.issueNumber), 10)
    const { content } = req.body

    if (!content || !isValidReaction(content)) {
      throw new AppError('Invalid reaction. Must be one of: +1, -1, laugh, hooray, confused, heart, rocket, eyes', 400)
    }

    const result = await IssuesService.toggleIssueReaction(userId, owner, repo, issueNumber, content)
    sendResponse(res, 200, true, `Reaction ${result.toggled}`, result)
  } catch (error) {
    next(error)
  }
})

const toggleIssueCommentReaction = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const owner = String(req.params.owner)
    const repo = String(req.params.repo)
    const commentId = parseInt(String(req.params.commentId), 10)
    const { content } = req.body

    if (!content || !isValidReaction(content)) {
      throw new AppError('Invalid reaction. Must be one of: +1, -1, laugh, hooray, confused, heart, rocket, eyes', 400)
    }

    const result = await IssuesService.toggleIssueCommentReaction(userId, owner, repo, commentId, content)
    sendResponse(res, 200, true, `Reaction ${result.toggled}`, result)
  } catch (error) {
    next(error)
  }
})

export const IssuesController = {
  listIssues,
  getIssue,
  listIssueComments,
  createIssue,
  createIssueComment,
  deleteIssueComment,
  listIssueReactions,
  toggleIssueReaction,
  listIssueCommentReactions,
  toggleIssueCommentReaction
}
