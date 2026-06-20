import { Request, Response, NextFunction, RequestHandler } from 'express'

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>

export const asyncHandler = (handler: AsyncRouteHandler): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next)
  }
