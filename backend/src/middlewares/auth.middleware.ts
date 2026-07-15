import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { AppError } from '../lib/errors'

export interface RequestWithUser extends Request {
  user?: {
    id: string
    username: string
    email: string
  }
}

export const authMiddleware = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization

  if (authHeader === undefined || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Access token is missing or invalid', 401))
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string, username: string, email: string }
    req.user = decoded
    next()
  } catch (err: any) {
    console.error('[Auth] Token verification failed:', err?.message || err)
    next(new AppError('Access token is invalid or expired', 401))
  }
}
