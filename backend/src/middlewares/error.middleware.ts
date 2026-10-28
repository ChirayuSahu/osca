import { Request, Response, NextFunction } from 'express'
import { sendResponse } from '../utils/send-response'
import { AppError } from '../lib/errors'

export interface CustomError extends Error {
  statusCode?: number
}

export const errorMiddleware = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : (err.statusCode ?? 500)

  // Only AppErrors and 4xx framework errors (e.g. body-parser) carry messages
  // meant for clients; anything else may leak Prisma/network internals.
  const isClientSafe = err instanceof AppError || statusCode < 500
  if (!isClientSafe) {
    console.error('[Error]', req.method, req.originalUrl, err)
  }
  const message = isClientSafe && err.message !== '' ? err.message : 'Internal Server Error'

  // Stack traces stay in the server logs; they'd expose file paths and internals
  // to anyone (and NODE_ENV=development can end up on a real server)
  sendResponse(res, statusCode, false, message)
}
