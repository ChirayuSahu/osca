import { NextFunction, Response } from 'express'
import { JobsService } from './jobs.service'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'
import { AppError } from '../../lib/errors'
import { asyncHandler } from '../../utils/async-handler'

const getStatus = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const queueName = req.params.queueName as string
    const jobId = req.params.jobId as string
    const requesterId = req.user?.id

    if (requesterId === undefined) {
      throw new AppError('Unauthorized', 401)
    }

    if (!JobsService.isValidQueueName(queueName)) {
      throw new AppError(
        `Invalid queue name "${queueName}". Valid queues: contributor-analysis, repository-analysis`,
        400
      )
    }

    const status = await JobsService.getJobStatus(queueName, jobId, requesterId)
    sendResponse(res, 200, true, 'Job status retrieved', status)
  } catch (error) {
    next(error)
  }
})

const listUserJobs = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
    const requesterId = req.user?.id
    if (requesterId === undefined) {
      throw new AppError('Unauthorized', 401)
    }

    const { page, limit } = req.pagination!
    const paginatedJobs = await JobsService.listUserJobs(requesterId, page, limit)
    sendResponse(res, 200, true, 'User jobs retrieved', paginatedJobs.data, paginatedJobs.meta)
  } catch (error) {
    next(error)
  }
})

export const JobsController = {
  getStatus,
  listUserJobs
}
