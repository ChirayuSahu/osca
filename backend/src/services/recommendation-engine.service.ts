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

export const generateFeed = async (userId: string, limit: number = 20) => {
  // 1. Load user skills & interests
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { skills: true }
  })
  
  const interests = await prisma.userInterest.findMany({
    where: { userId }
  })

  // Cold start seed from skills
  const interestMap = new Map<string, number>()
  if (user?.skills) {
    user.skills.forEach(skill => interestMap.set(skill.toLowerCase(), 10)) // Base weight for skills
  }
  
  interests.forEach(interest => {
    const existing = interestMap.get(interest.tag) || 0
    interestMap.set(interest.tag, existing + interest.score)
  })

  // 2. Fetch candidate repositories
  // Fetching all for MVP. In production, we'd limit this to recently active or via a materialized view.
  const repositories = await prisma.repository.findMany({
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
    const activity = repo._count.interactions
    maxActivity = Math.max(maxActivity, activity)
  })

  // 3. Calculate scores
  const scoredRepos = repositories.map(repo => {
    let languageMatchScore = 0
    let topicMatchScore = 0

    // Languages
    if (repo.languages && typeof repo.languages === 'object') {
      const langs = Object.keys(repo.languages)
      langs.forEach(lang => {
        const lower = lang.toLowerCase()
        if (interestMap.has(lower)) {
          languageMatchScore += interestMap.get(lower)!
        }
      })
    }

    // Topics (TechStack)
    if (repo.techStack && Array.isArray(repo.techStack)) {
      repo.techStack.forEach(topic => {
        const lower = topic.toLowerCase()
        if (interestMap.has(lower)) {
          topicMatchScore += interestMap.get(lower)!
        }
      })
    }

    // Normalize language and topic scores relative to 100 max (cap at 100)
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

  // 4. Filter, Sort and return
  let relevantRepos = scoredRepos

  // If the user has any explicit skills or interests, filter out completely irrelevant repositories
  if (interestMap.size > 0) {
    relevantRepos = scoredRepos.filter(r => 
      r.scoreInfo.breakdown.languageMatchScore > 0 || 
      r.scoreInfo.breakdown.topicMatchScore > 0
    )
  }

  relevantRepos.sort((a, b) => b.scoreInfo.totalScore - a.scoreInfo.totalScore)

  return relevantRepos.slice(0, limit)
}

export const RecommendationEngineService = {
  generateFeed
}
