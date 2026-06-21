<<<<<<< HEAD
import { Request, Response, NextFunction } from 'express'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'

const createRepository = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  let { owner, repo, fullName } = req.body

  if (fullName !== undefined && typeof fullName === 'string') {
    const parts = fullName.split('/')
    if (parts.length === 2) {
      owner = parts[0]
      repo = parts[1]
    }
  }

  if (typeof owner !== 'string' || typeof repo !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Owner and repo (or fullName) parameters are required in request body'
    })
    return
  }

  const userId = req.user?.id

  const fetchAndProcess = async (): Promise<void> => {
    let accessToken: string | undefined
    if (userId !== undefined) {
      const oauthAccount = await prisma.oAuthAccount.findFirst({
        where: {
          userId,
          provider: 'github'
        }
      })
      if (oauthAccount !== null) {
        accessToken = oauthAccount.accessToken
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Open-Source-Contributor-Matching-Platform'
    }

    if (accessToken !== undefined) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })
    if (repoResponse.status === 401) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired GitHub token'
      })
      return
    }
    if (!repoResponse.ok) {
      throw new Error(`Failed to fetch repository metadata from GitHub: ${repoResponse.statusText}`)
    }
    const repoData = await repoResponse.json() as Record<string, any>

    const langResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers })
    const languagesData = langResponse.ok ? await langResponse.json() as Record<string, any> : undefined

    const frameworks: string[] = []
    if (languagesData !== undefined) {
      if (languagesData.TypeScript !== undefined || languagesData.JavaScript !== undefined) {
        frameworks.push('Express')
      }
      if (languagesData.Python !== undefined) {
        frameworks.push('Django')
      }
    }

    const resolvedFullName = `${owner}/${repo}`
    const savedRepo = await prisma.repository.upsert({
      where: { fullName: resolvedFullName },
      update: {
        name: String(repoData.name),
        owner: String(repoData.owner.login),
        description: repoData.description !== null && repoData.description !== undefined ? String(repoData.description) : null,
        url: String(repoData.html_url),
        stars: Number(repoData.stargazers_count),
        forks: Number(repoData.forks_count),
        openIssues: Number(repoData.open_issues_count),
        languages: languagesData,
        frameworks
      },
      create: {
        name: String(repoData.name),
        owner: String(repoData.owner.login),
        fullName: resolvedFullName,
        description: repoData.description !== null && repoData.description !== undefined ? String(repoData.description) : null,
        url: String(repoData.html_url),
        stars: Number(repoData.stargazers_count),
        forks: Number(repoData.forks_count),
        openIssues: Number(repoData.open_issues_count),
        languages: languagesData,
        frameworks
      }
    })

    sendResponse(res, 201, true, 'Repository fetched and saved successfully', savedRepo)
  }

  fetchAndProcess().catch((error) => {
    next(error)
  })
}

const getRepository = (req: Request, res: Response, next: NextFunction): void => {
  const id = String(req.params.id)

  prisma.repository.findUnique({
    where: { id }
  })
    .then((repo) => {
      if (repo === null) {
        sendResponse(res, 404, false, 'Repository not found')
        return
      }
      sendResponse(res, 200, true, 'Repository retrieved successfully', repo)
    })
    .catch((error) => {
      next(error)
    })
}

const listRepositories = (req: RequestWithPaginationAndUser, res: Response, next: NextFunction): void => {
  const skip = req.pagination?.skip
  const take = req.pagination?.take

  Promise.all([
    prisma.repository.count(),
    prisma.repository.findMany({
      skip,
      take
    })
  ])
    .then(([total, repos]) => {
      sendResponse(
        res,
        200,
        true,
        'Repositories retrieved successfully',
        repos,
        {
          page: req.pagination?.page ?? 1,
          limit: req.pagination?.limit ?? 10,
          total,
          totalPages: Math.ceil(total / (req.pagination?.limit ?? 10))
        }
      )
    })
    .catch((error) => {
      next(error)
    })
}

const deleteRepository = (req: Request, res: Response, next: NextFunction): void => {
  const id = String(req.params.id)

  prisma.repository.delete({
    where: { id }
  })
    .then(() => {
      sendResponse(res, 200, true, 'Repository deleted successfully')
    })
    .catch((error) => {
      next(error)
    })
}

const listGithubRepositories = (req: RequestWithPaginationAndUser, res: Response, next: NextFunction): void => {
  const userId = req.user?.id

  if (userId === undefined) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
    return
  }

  const fetchUserRepos = async (): Promise<void> => {
    const oauthAccount = await prisma.oAuthAccount.findFirst({
      where: {
        userId,
        provider: 'github'
      }
    })

    if (oauthAccount === null || oauthAccount.accessToken === '') {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired GitHub token'
      })
      return
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Open-Source-Contributor-Matching-Platform',
      Authorization: `Bearer ${oauthAccount.accessToken}`
    }

    const page = req.pagination?.page ?? 1
    const limit = req.pagination?.limit ?? 10

    const response = await fetch(`https://api.github.com/user/repos?sort=updated&page=${page}&per_page=${limit}`, { headers })
    if (response.status === 401) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired GitHub token'
      })
      return
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch user repositories from GitHub: ${response.statusText}`)
    }
    const repos = await response.json()

    let totalPages = 1
    let total = Array.isArray(repos) ? repos.length : 0

    const linkHeader = response.headers.get('Link') ?? response.headers.get('link')
    if (linkHeader !== null && linkHeader !== undefined) {
      const links = linkHeader.split(',')
      const lastLink = links.find((l) => l.includes('rel="last"'))
      if (lastLink !== undefined) {
        const urlMatch = lastLink.match(/<([^>]+)>/)
        if (urlMatch !== null) {
          try {
            const lastUrl = new URL(urlMatch[1])
            const lastPageStr = lastUrl.searchParams.get('page')
            if (lastPageStr !== null) {
              totalPages = parseInt(lastPageStr, 10)
              total = totalPages * limit
            }
          } catch (e) {
            // Ignore URL parsing errors and fallback
          }
        }
      } else {
        // If there's no last link but there's a link header, it might mean we are on the last page.
        // Let's try to parse the prev/first link to determine current page/total
        const prevLink = links.find((l) => l.includes('rel="prev"'))
        if (prevLink !== undefined) {
          const urlMatch = prevLink.match(/<([^>]+)>/)
          if (urlMatch !== null) {
            try {
              const prevUrl = new URL(urlMatch[1])
              const prevPageStr = prevUrl.searchParams.get('page')
              if (prevPageStr !== null) {
                totalPages = parseInt(prevPageStr, 10) + 1
                total = (totalPages - 1) * limit + (Array.isArray(repos) ? repos.length : 0)
              }
            } catch (e) {
              // Ignore fallback errors
            }
          }
        }
      }
    }

    sendResponse(
      res,
      200,
      true,
      'User GitHub repositories retrieved successfully',
      repos,
      {
        page,
        limit,
        total,
        totalPages
      }
    )
  }

  fetchUserRepos().catch((error) => {
    next(error)
  })
}

export const RepositoryController = {
  createRepository,
=======
import { Response, NextFunction } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'
import { AppError, assertFound } from '../../lib/errors'
import { resolveRepositoryUrl } from '../../lib/github/resolve-repo-input'
import { JobEnqueueService } from '../../services/job-enqueue.service'
import { RepositoryService } from './service'
import { asyncHandler } from '../../utils/async-handler'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (userId === undefined) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

const queueRepositoryAnalysis = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const url = resolveRepositoryUrl(req.body)
  const queued = await JobEnqueueService.enqueueRepositoryAnalysis(url, userId)

  sendResponse(res, 202, true, 'Repository analysis queued', queued)
})

const getRepository = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  const repository = await prisma.repository.findUnique({ where: { id } })
  assertFound(repository, 'Repository not found')
  sendResponse(res, 200, true, 'Repository retrieved successfully', repository)
})

const listRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
  const skip = req.pagination?.skip
  const take = req.pagination?.take

  const [total, repos] = await Promise.all([
    prisma.repository.count(),
    prisma.repository.findMany({ skip, take })
  ])

  sendResponse(res, 200, true, 'Repositories retrieved successfully', repos, {
    page: req.pagination?.page ?? 1,
    limit: req.pagination?.limit ?? 10,
    total,
    totalPages: Math.ceil(total / (req.pagination?.limit ?? 10))
  })
})

const deleteRepository = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  await prisma.repository.delete({ where: { id } })
  sendResponse(res, 200, true, 'Repository deleted successfully')
})

const listGithubRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
  const userId = requireUserId(req)
  const page = req.pagination?.page ?? 1
  const limit = req.pagination?.limit ?? 10

  const result = await RepositoryService.listGithubRepositories(userId, page, limit)

  sendResponse(res, 200, true, 'User GitHub repositories retrieved successfully', result.repos, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages
  })
})

export const RepositoryController = {
  queueRepositoryAnalysis,
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
  getRepository,
  listRepositories,
  deleteRepository,
  listGithubRepositories
}
