import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

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
    res.status(401).json({
      success: false,
      message: 'Access token is missing or invalid'
    })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string, username: string, email: string }
    req.user = decoded
    next()
  } catch (error) {
    console.error('JWT Verification failed:', error)
    res.status(401).json({
      success: false,
      message: 'Access token is invalid or expired'
    })
  }
}
