import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
<<<<<<< HEAD
=======
import { AppError } from '../lib/errors'
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9

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
<<<<<<< HEAD
    res.status(401).json({
      success: false,
      message: 'Access token is missing or invalid'
    })
=======
    next(new AppError('Access token is missing or invalid', 401))
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string, username: string, email: string }
    req.user = decoded
    next()
<<<<<<< HEAD
  } catch (error) {
    console.error('JWT Verification failed:', error)
    res.status(401).json({
      success: false,
      message: 'Access token is invalid or expired'
    })
=======
  } catch {
    next(new AppError('Access token is invalid or expired', 401))
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
  }
}
