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
import { selfUserSelect } from '../../utils/user-response'
import { encryptToken } from '../../lib/crypto/token-cipher'
import { redisClient } from '../../utils/redis-client'
import { JobEnqueueService } from '../../services/job-enqueue.service'

// read:user + user:email for the profile; public_repo so issues, comments and
// reactions can be posted to public repositories as the user. No private repo access.
const GITHUB_SCOPES = 'read:user,user:email,public_repo'

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

  let authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${config.githubClientId}&scope=${GITHUB_SCOPES}&state=${state}`
  if (config.githubCallbackUrl !== '') {
    authorizeUrl += `&redirect_uri=${encodeURIComponent(config.githubCallbackUrl)}`
  }
  res.redirect(authorizeUrl)
}

// #4: Callback verifies `state` against cookie before exchanging code
const handleGithubCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query
  const cookieState = req.cookies?.oauth_state as string | undefined

  if (error) {
    const errorMsg = error_description ? String(error_description) : 'Authentication failed'
    res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent(String(error))}&error_description=${encodeURIComponent(errorMsg)}`)
    return
  }

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
  // GitHub's own noreply address is unique per account, unlike `login@github.com`
  const noreplyEmail = `${providerId}+${username}@users.noreply.github.com`
  const email = githubUser.email ?? noreplyEmail

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
      data: { accessToken: encryptToken(accessToken) }
    })
    // A fresh token: stop asking them to reconnect
    if (existingOauth.user.githubTokenInvalidAt) {
      await prisma.user.update({ where: { id: existingOauth.userId }, data: { githubTokenInvalidAt: null } })
    }
    userRecord = existingOauth.user
  } else {
    // Never link to an existing user by email: emails aren't verified on our
    // side, so matching on them would let one account claim another's login.
    const [emailTaken, usernameTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findUnique({ where: { username }, select: { id: true } })
    ])

    userRecord = await prisma.user.create({
      data: {
        name,
        username: usernameTaken ? `${username}-${providerId}` : username,
        email: emailTaken ? noreplyEmail : email,
        avatarUrl
      }
    })

    await prisma.oAuthAccount.create({
      data: {
        userId: userRecord.id,
        provider: 'github',
        providerId,
        username,
        accessToken: encryptToken(accessToken)
      }
    })
  }

  const user = userRecord

  // Analyze new accounts (and older ones never analyzed) straight away, so
  // recommendations are personal by the time the user lands. A queued job for
  // the same user is reused; failing to queue never blocks sign-in.
  const analyzed = await prisma.contributorProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!analyzed) {
    JobEnqueueService.enqueueContributorAnalysis(user.id).catch((error) => {
      console.error(`[Auth] Failed to queue profile analysis for user ${user.id}:`, error)
    })
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    config.jwtSecret,
    { expiresIn: '1d', algorithm: 'HS256' }
  )

  // The session never goes in the URL (history, logs, Referer). The frontend gets
  // a one-time code and swaps it for the session via POST /auth/exchange.
  const exchangeCode = crypto.randomBytes(32).toString('hex')
  await redisClient.set(
    exchangeKey(exchangeCode),
    JSON.stringify({
      token,
      user: { id: user.id, name: user.name, username: user.username, email: user.email, avatarUrl: user.avatarUrl }
    }),
    'EX',
    EXCHANGE_TTL_SECONDS
  )
  res.redirect(`${config.frontendUrl}/auth/callback?code=${exchangeCode}`)
})

const EXCHANGE_TTL_SECONDS = 60
const exchangeKey = (code: string) => `auth:exchange:${code}`

// Single use: the code is deleted as it is read
const exchangeCode = asyncHandler(async (req: Request, res: Response) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : ''
  if (!/^[a-f0-9]{64}$/.test(code)) {
    throw new AppError('Invalid sign-in code', 400)
  }
  const stored = await redisClient.getdel(exchangeKey(code))
  if (!stored) {
    throw new AppError('Sign-in code expired or already used', 400)
  }
  sendResponse(res, 200, true, 'Signed in', JSON.parse(stored))
})

const getCurrentUser = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id
  if (userId === undefined) {
    throw new AppError('Unauthorized', 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: selfUserSelect
  })

  if (user === null) {
    throw new AppError('User not found', 404)
  }

  sendResponse(res, 200, true, 'User profile retrieved successfully', user)
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
    { expiresIn: '1d', algorithm: 'HS256' }
  )

  sendResponse(res, 200, true, 'Dev token generated successfully', { token, user })
})

export const AuthController = {
  exchangeCode,
  redirectToGithub,
  handleGithubCallback,
  getCurrentUser,
  getDevToken
}
