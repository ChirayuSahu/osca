import { Response, NextFunction } from 'express'
import { RequestWithUser } from './auth.middleware'

export interface RequestWithPaginationAndUser extends RequestWithUser {
  pagination?: {
    skip: number
    take: number
    page: number
    limit: number
  }
}

export const paginationMiddleware = (
  req: RequestWithPaginationAndUser,
  res: Response,
  next: NextFunction
): void => {
  const page = parseInt(String(req.query.page), 10)
  const limit = parseInt(String(req.query.limit), 10)

  const parsedPage = isNaN(page) || page <= 0 ? 1 : page
  const parsedLimit = isNaN(limit) || limit <= 0 ? 10 : Math.min(limit, 100)

  const skip = (parsedPage - 1) * parsedLimit
  const take = parsedLimit

  req.pagination = {
    skip,
    take,
    page: parsedPage,
    limit: parsedLimit
  }

  next()
}
