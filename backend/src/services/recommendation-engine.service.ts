import { prisma } from '../utils/prisma'

interface RepoScore {
  repositoryId: string
  totalScore: number
  breakdown: {
    languageMatchScore: number
    topicMatchScore: number
    popularityScore: number
    activityScore: number
  }
}

const normalize = (value: number, min: number, max: number) => {
  if (max === min) return 0
  const normalized = ((value - min) / (max - min)) * 100
  return Math.min(Math.max(normalized, 0), 100)
}

export const generateFeed = async (userId: string, page: number = 1, limit: number = 20) => {
  // 1. Load user skills & interests
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { skills: true }
  })
  
  const interests = await prisma.userInterest.findMany({
    where: { userId }
  })

  // Build interest map with 30-day half-life decay
  const interestMap = new Map<string, number>()
  if (user?.skills) {
    user.skills.forEach(skill => interestMap.set(skill.toLowerCase(), 10)) // Base weight for skills
  }
  
  const now = new Date().getTime()
  const HALF_LIFE_DAYS = 30
  const MS_PER_DAY = 1000 * 60 * 60 * 24

  interests.forEach(interest => {
    const existing = interestMap.get(interest.tag) || 0
    const daysSinceUpdate = (now - interest.updatedAt.getTime()) / MS_PER_DAY
    const decayedScore = interest.score * Math.pow(0.5, daysSinceUpdate / HALF_LIFE_DAYS)
    interestMap.set(interest.tag, existing + decayedScore)
  })

  // 2. Fetch candidate repositories
  // Limit to top 1000 recently updated to prevent memory bottleneck
  const repositories = await prisma.repository.findMany({
    where: { hidden: false },
    take: 1000,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      owner: true,
      fullName: true,
      provider: true,
      githubId: true,
      description: true,
      url: true,
      languages: true,
      frameworks: true,
      techStack: true,
      ciCd: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { likes: true, interactions: true }
      }
    }
  })

  // Pre-calculate min/max for normalization
  let maxLikes = 0
  let maxActivity = 0
  
  repositories.forEach(repo => {
    maxLikes = Math.max(maxLikes, repo._count.likes)
    maxActivity = Math.max(maxActivity, repo._count.interactions)
  })

  // 3. Calculate scores
  const scoredRepos = repositories.map(repo => {
    let languageMatchScore = 0
    let topicMatchScore = 0

    if (repo.languages && typeof repo.languages === 'object') {
      const langs = Object.keys(repo.languages as Record<string, any>)
      langs.forEach(lang => {
        const lower = lang.toLowerCase()
        if (interestMap.has(lower)) {
          languageMatchScore += interestMap.get(lower)!
        }
      })
    }

    if (repo.techStack && Array.isArray(repo.techStack)) {
      repo.techStack.forEach(topic => {
        const lower = String(topic).toLowerCase()
        if (interestMap.has(lower)) {
          topicMatchScore += interestMap.get(lower)!
        }
      })
    }

    languageMatchScore = Math.min(languageMatchScore, 100)
    topicMatchScore = Math.min(topicMatchScore, 100)

    const popularityScore = normalize(repo._count.likes, 0, maxLikes)
    const activityScore = normalize(repo._count.interactions, 0, maxActivity)

    const totalScore = 
      (languageMatchScore * 0.4) + 
      (topicMatchScore * 0.4) + 
      (popularityScore * 0.1) + 
      (activityScore * 0.1)

    return {
      repository: repo,
      scoreInfo: {
        repositoryId: repo.id,
        totalScore,
        breakdown: {
          languageMatchScore,
          topicMatchScore,
          popularityScore,
          activityScore
        }
      }
    }
  })

  // 4. Split into Relevant and Discovery Buckets
  const relevantBucket: typeof scoredRepos = []
  const discoveryBucket: typeof scoredRepos = []

  scoredRepos.forEach(r => {
    if (r.scoreInfo.breakdown.languageMatchScore > 0 || r.scoreInfo.breakdown.topicMatchScore > 0) {
      relevantBucket.push(r)
    } else {
      discoveryBucket.push(r)
    }
  })

  relevantBucket.sort((a, b) => b.scoreInfo.totalScore - a.scoreInfo.totalScore)
  discoveryBucket.sort((a, b) => b.scoreInfo.totalScore - a.scoreInfo.totalScore)

  // 5. Merge based on 80/20 ratio for the ENTIRE candidate pool
  let mergedCandidates: typeof scoredRepos = []

  if (interestMap.size === 0) {
    // Cold start: 100% discovery
    mergedCandidates = discoveryBucket
  } else {
    // Calculate total proportional sizes
    // We want the final feed to be ~80% relevant, ~20% discovery across the whole pool
    // To do this simply, we will interleave them in a 4:1 ratio
    let rIdx = 0
    let dIdx = 0

    while (rIdx < relevantBucket.length || dIdx < discoveryBucket.length) {
      for (let i = 0; i < 4 && rIdx < relevantBucket.length; i++) {
        mergedCandidates.push(relevantBucket[rIdx++])
      }
      if (dIdx < discoveryBucket.length) {
        mergedCandidates.push(discoveryBucket[dIdx++])
      }
    }
  }

  // 6. Paginate the merged candidates
  const total = mergedCandidates.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  
  const paginatedFeed = mergedCandidates.slice(startIndex, endIndex)

  return {
    feed: paginatedFeed,
    total,
    page,
    limit,
    totalPages
  }
}

export const RecommendationEngineService = {
  generateFeed
}
