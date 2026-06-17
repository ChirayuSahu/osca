import { Request, Response, NextFunction } from 'express'
import { sendResponse } from '../utils/send-response'

export interface CustomError extends Error {
  statusCode?: number
}

export const errorMiddleware = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500
  const message = err.message !== '' ? err.message : 'Internal Server Error'

  const data = process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined

  sendResponse(res, statusCode, false, message, data)
}
