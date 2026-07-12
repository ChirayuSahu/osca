import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
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

// #4: Redirect to GitHub with a CSRF `state` param stored in a signed cookie
const redirectToGithub = (req: Request, res: Response): void => {
  const state = crypto.randomBytes(16).toString('hex')

  // Store state in a short-lived, httpOnly, sameSite cookie for CSRF verification
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000 // 10 minutes
  })

  let authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${config.githubClientId}&scope=user,repo&state=${state}`
  if (config.githubCallbackUrl !== '') {
    authorizeUrl += `&redirect_uri=${encodeURIComponent(config.githubCallbackUrl)}`
  }
  res.redirect(authorizeUrl)
}

// #4: Callback verifies `state` against cookie before exchanging code
const handleGithubCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query
  const cookieState = req.cookies?.oauth_state as string | undefined

  // Verify state to prevent CSRF / OAuth hijacking
  if (typeof state !== 'string' || !cookieState || state !== cookieState) {
    throw new AppError('Invalid OAuth state — possible CSRF attack', 400)
  }

  // Clear the state cookie immediately after verification
  res.clearCookie('oauth_state')

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

  let userRecord = null

  const existingOauth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerId: {
        provider: 'github',
        providerId
      }
    },
    include: { user: true }
  })

  if (existingOauth !== null) {
    await prisma.oAuthAccount.update({
      where: { id: existingOauth.id },
      data: { accessToken }
    })
    userRecord = existingOauth.user
  } else {
    userRecord = await prisma.user.findUnique({ where: { email } })

    if (userRecord === null) {
      userRecord = await prisma.user.create({
        data: { name, username, email, avatarUrl }
      })
    }

    await prisma.oAuthAccount.create({
      data: {
        userId: userRecord.id,
        provider: 'github',
        providerId,
        username,
        accessToken
      }
    })
  }

  const user = userRecord

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    config.jwtSecret,
    { expiresIn: '1d' }
  )

  // NOTE: JWT is still in the URL here. Tracked in IMPROVEMENTS.md #2 for a
  // future one-time-code exchange flow (requires frontend changes).
  res.redirect(`${config.frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl
  }))}`)
})

const getCurrentUser = asyncHandler(async (req: RequestWithUser, res: Response) => {
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
})

// #3: dev-token requires BOTH non-production AND a matching DEV_TOKEN_SECRET header
const getDevToken = asyncHandler(async (req: Request, res: Response) => {
  if (config.nodeEnv === 'production') {
    throw new AppError('Dev token route is disabled in production', 403)
  }

  // Secondary guard: requires a shared secret header to be present
  const providedSecret = req.headers['x-dev-secret'] as string | undefined
  if (!config.devTokenSecret || providedSecret !== config.devTokenSecret) {
    throw new AppError('Missing or invalid X-Dev-Secret header', 403)
  }

  // Validate email is a string (not an array, etc.)
  const emailParam = req.query.email
  const email = typeof emailParam === 'string' ? emailParam : undefined

  let user
  if (email) {
    user = await prisma.user.findUnique({ where: { email } })
  } else {
    user = await prisma.user.findFirst()
  }

  if (!user) {
    throw new AppError('No user found to generate token for', 404)
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    config.jwtSecret,
    { expiresIn: '1d' }
  )

  sendResponse(res, 200, true, 'Dev token generated successfully', { token, user })
})

export const AuthController = {
  redirectToGithub,
  handleGithubCallback,
  getCurrentUser,
  getDevToken
}
