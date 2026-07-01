import { NextFunction,  Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../../config'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { githubGetJson, githubPostJson } from '../../lib/github'
import { AppError } from '../../lib/errors'
import { asyncHandler } from '../../utils/async-handler'
import { RequestWithUser } from '../../middlewares/auth.middleware'

interface GithubTokenResponse {
  access_token?: string
}

interface GithubUserResponse {
  id: number
  login: string
  name: string | null
  avatar_url: string | null
  email: string | null
}

const redirectToGithub = (req: Request, res: Response): void => {
  let authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${config.githubClientId}&scope=user,repo`
  if (config.githubCallbackUrl !== '') {
    authorizeUrl += `&redirect_uri=${encodeURIComponent(config.githubCallbackUrl)}`
  }
  res.redirect(authorizeUrl)
}

const handleGithubCallback = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
  const { code } = req.query

  if (typeof code !== 'string') {
    throw new AppError('Authorization code is required', 400)
  }

  const tokenData = await githubPostJson<GithubTokenResponse>(
    'https://github.com/login/oauth/access_token',
    {
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      code,
      redirect_uri: config.githubCallbackUrl
    }
  )

  const accessToken = tokenData.access_token
  if (typeof accessToken !== 'string') {
    throw new AppError('Invalid access token returned from GitHub', 502)
  }

  const githubUser = await githubGetJson<GithubUserResponse>('/user', accessToken)

  const providerId = String(githubUser.id)
  const username = String(githubUser.login)
  const name = githubUser.name ?? username
  const avatarUrl = githubUser.avatar_url
  const email = githubUser.email ?? `${username}@github.com`

  const user = await prisma.$transaction(async (tx) => {
    const existingOauth = await tx.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: 'github',
          providerId
        }
      },
      include: { user: true }
    })

    if (existingOauth !== null) {
      await tx.oAuthAccount.update({
        where: { id: existingOauth.id },
        data: { accessToken }
      })
      return existingOauth.user
    }

    let userRecord = await tx.user.findUnique({ where: { email } })

    if (userRecord === null) {
      userRecord = await tx.user.create({
        data: { name, username, email, avatarUrl }
      })
    }

    await tx.oAuthAccount.create({
      data: {
        userId: userRecord.id,
        provider: 'github',
        providerId,
        username,
        accessToken
      }
    })

    return userRecord
  })

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    config.jwtSecret,
    { expiresIn: '1d' }
  )

  res.redirect(`${config.frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl
  }))}`)
  } catch (error) {
    next(error)
  }
})

const getCurrentUser = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const userId = req.user?.id
  if (userId === undefined) {
    throw new AppError('Unauthorized', 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      avatarUrl: true,
      skills: true,
      contributionScore: true,
      createdAt: true,
    }
  })

  if (user === null) {
    throw new AppError('User not found', 404)
  }

  sendResponse(res, 200, true, 'User profile retrieved successfully', { user })
  } catch (error) {
    next(error)
  }
})

export const AuthController = {
  redirectToGithub,
  handleGithubCallback,
  getCurrentUser
}
