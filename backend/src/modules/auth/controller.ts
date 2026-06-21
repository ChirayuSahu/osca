<<<<<<< HEAD
import { Request, Response, NextFunction } from 'express'
=======
import { Request, Response } from 'express'
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
import jwt from 'jsonwebtoken'
import { config } from '../../config'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
<<<<<<< HEAD
=======
import { githubGetJson, githubPostJson } from '../../lib/github/client'
import { AppError } from '../../lib/errors'
import { asyncHandler } from '../../utils/async-handler'

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
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9

const redirectToGithub = (req: Request, res: Response): void => {
  let authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${config.githubClientId}&scope=user,repo`
  if (config.githubCallbackUrl !== '') {
    authorizeUrl += `&redirect_uri=${encodeURIComponent(config.githubCallbackUrl)}`
  }
  res.redirect(authorizeUrl)
}

<<<<<<< HEAD
const handleGithubCallback = (req: Request, res: Response, next: NextFunction): void => {
  const { code } = req.query

  if (typeof code !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Authorization code is required'
    })
    return
  }

  const exchangeAndProcess = async (): Promise<void> => {
    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
        redirect_uri: config.githubCallbackUrl
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange authorization code for access token')
    }

    const tokenData = await tokenResponse.json() as Record<string, any>
    const accessToken = tokenData.access_token

    if (typeof accessToken !== 'string') {
      throw new Error('Invalid access token returned from GitHub')
    }

    // 2. Fetch user profile from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Open-Source-Contributor-Matching-Platform'
      }
    })

    if (!userResponse.ok) {
      throw new Error('Failed to retrieve GitHub user profile')
    }

    const githubUser = await userResponse.json() as Record<string, any>

    const providerId = String(githubUser.id)
    const username = String(githubUser.login)
    const name = githubUser.name !== null && githubUser.name !== undefined ? String(githubUser.name) : username
    const avatarUrl = githubUser.avatar_url !== null && githubUser.avatar_url !== undefined ? String(githubUser.avatar_url) : null
    const email = githubUser.email !== null && githubUser.email !== undefined ? String(githubUser.email) : `${username}@github.com`

    // 3. Upsert User & OAuthAccount in database
    const user = await prisma.$transaction(async (tx) => {
      // Find existing linked account
      const existingOauth = await tx.oAuthAccount.findUnique({
        where: {
          provider_providerId: {
            provider: 'github',
            providerId
          }
        },
        include: {
          user: true
        }
      })

      if (existingOauth !== null) {
        // Update tokens on existing account
        await tx.oAuthAccount.update({
          where: { id: existingOauth.id },
          data: { accessToken }
        })
        return existingOauth.user
      }

      // Check if user already exists with this email
      let userRecord = await tx.user.findUnique({
        where: { email }
      })

      if (userRecord === null) {
        // Create new user
        userRecord = await tx.user.create({
          data: {
            name,
            username,
            email,
            avatarUrl
          }
        })
      }

      // Link the OAuthAccount to the user
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

    // 4. Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      config.jwtSecret,
      { expiresIn: '1d' }
    )

    // 5. Return JSON instead of redirecting
    sendResponse(res, 200, true, 'GitHub authentication successful', {
      user,
      token
    })
  }

  exchangeAndProcess().catch((error) => {
    next(error)
  })
}
=======
const handleGithubCallback = asyncHandler(async (req: Request, res: Response) => {
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

  sendResponse(res, 200, true, 'GitHub authentication successful', {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl
    },
    token
  })
})
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9

export const AuthController = {
  redirectToGithub,
  handleGithubCallback
}
