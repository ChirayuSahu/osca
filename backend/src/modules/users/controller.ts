import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'

const getUser = (req: Request, res: Response, next: NextFunction): void => {
  const id = String(req.params.id)

  prisma.user.findUnique({
    where: { id },
    include: {
      oauthAccounts: true,
      contributorProfile: true
    }
  })
    .then((user) => {
      if (user === null) {
        sendResponse(res, 404, false, 'User not found')
        return
      }
      sendResponse(res, 200, true, 'User retrieved successfully', user)
    })
    .catch((error) => {
      next(error)
    })
}

const updateUser = (req: Request, res: Response, next: NextFunction): void => {
  const id = String(req.params.id)
  const { name, email, avatarUrl, skills, contributionScore } = req.body

  const data: Record<string, any> = {}

  if (typeof name === 'string') {
    data.name = name
  }
  if (typeof email === 'string') {
    data.email = email
  }
  if (typeof avatarUrl === 'string') {
    data.avatarUrl = avatarUrl
  }
  if (Array.isArray(skills)) {
    data.skills = skills.map(String)
  }
  if (typeof contributionScore === 'number') {
    data.contributionScore = contributionScore
  }

  prisma.user.update({
    where: { id },
    data
  })
    .then((user) => {
      sendResponse(res, 200, true, 'User updated successfully', user)
    })
    .catch((error) => {
      next(error)
    })
}

export const UserController = {
  getUser,
  updateUser
}
