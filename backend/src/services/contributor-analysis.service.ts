import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { assertFound } from '../lib/errors'
import { Neo4jSyncService } from './neo4j-sync.service'
import {
  buildSkillList,
  detectNpmFrameworks,
  detectPythonFrameworks,
  parsePackageJson,
  parseRawContent,
  getGithubAccessToken,
  githubGetJson,
  githubTryGetRaw,
  githubGraphQL,
  type ProgressCallback,
  type Skill,
  noopProgress
} from '../lib/github'

interface GitHubRepo {
  name: string
  full_name: string
  language: string | null
  fork: boolean
  size: number
}

interface GitHubStarredRepo {
  id: number
  full_name: string
}

// Caps how many pages of /user/starred we walk (100 per page) so a user with
// thousands of stars can't blow the GitHub rate limit or stall the job queue.
const MAX_STARRED_PAGES = 5

// Syncs STARRED edges into Neo4j for the subset of the user's GitHub stars
// that we already track as Repository rows in Postgres. We deliberately don't
// ingest brand-new repos here — that's the job of the repository-analysis
// pipeline; this only wires up the edge for repos already known to us.
const syncStarredRepositories = async (userId: string, githubId: number, username: string): Promise<number> => {
  const accessToken = await getGithubAccessToken(userId)

  const starredGithubIds: number[] = []
  for (let page = 1; page <= MAX_STARRED_PAGES; page++) {
    const repos = await githubGetJson<GitHubStarredRepo[]>(`/user/starred?per_page=100&page=${page}`, accessToken)
    if (!Array.isArray(repos) || repos.length === 0) break
    starredGithubIds.push(...repos.map((repo) => repo.id))
    if (repos.length < 100) break
  }

  if (starredGithubIds.length === 0) return 0

  const trackedRepos = await prisma.repository.findMany({
    where: { githubId: { in: starredGithubIds } },
    select: { id: true }
  })

  if (trackedRepos.length === 0) return 0

  await Neo4jSyncService.syncUser({ githubId, username })
  for (const repo of trackedRepos) {
    await Neo4jSyncService.syncInteraction(githubId, repo.id, 'STARRED')
  }

  return trackedRepos.length
}

const toContributorExperience = (skills: Skill[]): Prisma.InputJsonValue => ({
  skills: skills.map((skill) => ({
    name: skill.name,
    proficiencyScore: skill.proficiencyScore
  }))
})

interface GitHubStatsResponse {
  data?: {
    viewer: {
      contributionsCollection: {
        totalCommitContributions: number
        totalPullRequestContributions: number
        totalPullRequestReviewContributions: number
        commitContributionsByRepository: {
          repository: {
            nameWithOwner: string
            isFork: boolean
            languages: {
              nodes: { name: string }[]
            }
          }
        }[]
      }
      pullRequests: {
        nodes: {
          createdAt: string
          mergedAt: string
          additions: number
        }[]
      }
    }
  }
}

const fetchAdvancedStats = async (token: string) => {
  try {
    const query = `
      query {
        viewer {
          contributionsCollection {
            totalCommitContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            commitContributionsByRepository(maxRepositories: 25) {
              repository {
                nameWithOwner
                isFork
                languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                  nodes {
                    name
                  }
                }
              }
            }
          }
          pullRequests(first: 30, states: MERGED, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              createdAt
              mergedAt
              additions
            }
          }
        }
      }
    `
    const res = await githubGraphQL<GitHubStatsResponse>(query, token)
    const viewer = res.data?.viewer
    if (!viewer) return null

    let totalAdditions = 0
    let cycleTimeSumMs = 0
    let prsWithCycleTime = 0

    viewer.pullRequests.nodes.forEach(pr => {
      totalAdditions += pr.additions
      if (pr.createdAt && pr.mergedAt) {
        const created = new Date(pr.createdAt).getTime()
        const merged = new Date(pr.mergedAt).getTime()
        cycleTimeSumMs += (merged - created)
        prsWithCycleTime++
      }
    })

    const avgPrCycleTimeDays = prsWithCycleTime > 0 
      ? (cycleTimeSumMs / prsWithCycleTime) / (1000 * 60 * 60 * 24)
      : 0

    // Code review score (proxy logic out of 5.0 based on PRs vs Reviews)
    const prs = viewer.contributionsCollection.totalPullRequestContributions || 1
    const reviews = viewer.contributionsCollection.totalPullRequestReviewContributions
    const reviewRatio = reviews / prs
    const codeReviewScore = Math.min(5.0, 3.0 + (reviewRatio * 1.5))

    const contributedRepos = (viewer.contributionsCollection.commitContributionsByRepository || [])
      .filter((entry) => !entry.repository.isFork)
      .map((entry) => ({
        fullName: entry.repository.nameWithOwner,
        languages: entry.repository.languages.nodes.map((n) => n.name)
      }))

    return {
      linesAdded: totalAdditions > 0 ? totalAdditions : 0,
      avgPrCycleTime: avgPrCycleTimeDays,
      codeReviewScore: codeReviewScore,
      totalCommits: viewer.contributionsCollection.totalCommitContributions,
      contributedRepos
    }
  } catch (err) {
    console.error('Failed to fetch advanced stats:', err)
    return null
  }
}

export interface AnalyzedProfile {
  skills: Skill[]
  baseScores: {
    avgSkillScore: number
    activityScore: number
    qualityScore: number
    diversityScore: number
  }
  contributionHistory: Prisma.InputJsonValue | null
  repositoryExperience: Prisma.InputJsonValue
}

// Extracts skills and computes GitHub-API-only scores. Deliberately stops short
// of persisting the contributor profile: scoring is finished (and the graph
// stats folded in) by finalizeContributorProfile, which needs to run *after*
// this user's edges have been synced into Neo4j.
const analyzeProfile = async (
  userId: string,
  onProgress: ProgressCallback = noopProgress
): Promise<AnalyzedProfile> => {
  await onProgress(5, 'Fetching user profile from database...')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  assertFound(user, 'User not found')

  const accessToken = await getGithubAccessToken(userId)

  await onProgress(8, 'Fetching advanced contribution statistics...')
  const advancedStats = await fetchAdvancedStats(accessToken)

  await onProgress(10, 'Starting profile analysis...')
  const skills = await analyzeGithubProfile(accessToken, onProgress, advancedStats?.contributedRepos ?? [])

  await onProgress(90, 'Saving extracted skills to database...')

  const skillNames = skills.map((skill) => skill.name)
  
  // 1. Skill Depth (Average of Top 5 skills)
  const sortedSkills = [...skills].sort((a, b) => b.proficiencyScore - a.proficiencyScore)
  const topSkills = sortedSkills.slice(0, 5)
  const avgSkillScore = topSkills.length > 0
    ? topSkills.reduce((sum, skill) => sum + skill.proficiencyScore, 0) / topSkills.length
    : 0

  // 2. Activity Rate (Logarithmic scale + PR cycle modifier)
  let activityScore = 0
  if (advancedStats) {
    const commits = advancedStats.totalCommits || 0
    const lines = advancedStats.linesAdded || 0
    const baseActivity = 25 * Math.log10(commits + 1) + 10 * Math.log10(lines + 1)
    
    let cycleModifier = 1.0
    if (advancedStats.avgPrCycleTime > 0) {
      if (advancedStats.avgPrCycleTime < 1) cycleModifier = 1.05
      else if (advancedStats.avgPrCycleTime > 7) cycleModifier = 0.95
    }
    activityScore = Math.min(100, baseActivity * cycleModifier)
  }

  // 3. Code Quality (PR size chunking modifier)
  let qualityScore = 0
  if (advancedStats) {
    const baseQuality = (advancedStats.codeReviewScore / 5.0) * 100
    // Heuristic for PR size
    const estimatedPrs = Math.max(1, (advancedStats.totalCommits || 1) / 5)
    const linesPerPr = (advancedStats.linesAdded || 0) / estimatedPrs

    let sizeModifier = 1.0
    if (linesPerPr > 1000) sizeModifier = 0.90 // penalty for massive PRs
    else if (linesPerPr < 300 && linesPerPr > 10) sizeModifier = 1.05 // bonus for focused PRs

    qualityScore = Math.min(100, baseQuality * sizeModifier)
  }

  // 4. Diversity Scope (8 pts per skill) — later blended with graph-derived
  // language/framework/topic spread in finalizeContributorProfile.
  const diversityScore = Math.min(100, skills.length * 8)

  const repositoryExperience = toContributorExperience(skills)

  // Construct contribution history object
  const contributionHistory = advancedStats ? {
    linesAdded: advancedStats.linesAdded,
    avgPrCycleTime: advancedStats.avgPrCycleTime,
    codeReviewScore: advancedStats.codeReviewScore,
    totalCommits: advancedStats.totalCommits
  } : null

  await prisma.user.update({
    where: { id: userId },
    data: { skills: skillNames }
  })

  await onProgress(95, 'Base profile computed, syncing to graph...')

  return {
    skills,
    baseScores: { avgSkillScore, activityScore, qualityScore, diversityScore },
    contributionHistory,
    repositoryExperience
  }
}

// Runs after this user's skills/stars have been synced into Neo4j (by the
// worker), so the graph reflects their current state. Blends graph-derived
// signals into the GitHub-API-only base scores and persists the final profile.
const finalizeContributorProfile = async (
  userId: string,
  githubId: number | null,
  analyzed: AnalyzedProfile
): Promise<number> => {
  const graphStats = githubId != null
    ? await Neo4jSyncService.getContributorGraphStats(githubId)
    : { repoCount: 0, languageCount: 0, frameworkCount: 0, topicCount: 0, avgStars: 0, maxStars: 0, collaboratorCount: 0 }

  const { avgSkillScore } = analyzed.baseScores

  // Diversity: blend the flat skill-count score with the distinct
  // Language/Framework/Topic spread across every repo the user is connected
  // to in the graph (owned, starred, or contributed to) — a footprint wider
  // than the subset of repos analyzed in this run.
  const graphDiversityScore = Math.min(100, (graphStats.languageCount + graphStats.frameworkCount + graphStats.topicCount) * 5)
  const diversityScore = Math.min(100, (analyzed.baseScores.diversityScore * 0.5) + (graphDiversityScore * 0.5))

  // Quality: small bonus for contributing to repos the graph shows as
  // well-regarded (highly starred), on top of the review-ratio/PR-size heuristic.
  const starsBonus = Math.min(10, Math.log10(graphStats.avgStars + 1) * 4)
  const qualityScore = Math.min(100, analyzed.baseScores.qualityScore + starsBonus)

  // Activity: bonus for breadth of distinct repos touched, per the graph.
  const repoBreadthBonus = Math.min(10, Math.log10(graphStats.repoCount + 1) * 8)
  const activityScore = Math.min(100, analyzed.baseScores.activityScore + repoBreadthBonus)

  // Network: log-scaled reach of distinct collaborators who share a repo
  // (owned/starred/contributed-to) with this user in the graph.
  const networkScore = Math.min(100, Math.log10(graphStats.collaboratorCount + 1) * 40)

  // Overall Score (Weighted Average: Skill 35%, Quality 25%, Activity 20%, Diversity 10%, Network 10%)
  const overallScore =
    (avgSkillScore * 0.35) +
    (qualityScore * 0.25) +
    (activityScore * 0.20) +
    (diversityScore * 0.10) +
    (networkScore * 0.10)

  const scores = {
    skillScore: avgSkillScore,
    activityScore,
    qualityScore,
    diversityScore,
    networkScore,
    overallScore,
    repositoryExperience: analyzed.repositoryExperience,
    contributionHistory: analyzed.contributionHistory ?? Prisma.JsonNull
  }

  await prisma.contributorProfile.upsert({
    where: { userId },
    create: { userId, ...scores },
    update: scores
  })

  return overallScore
}

const analyzeGithubProfile = async (
  accessToken: string,
  onProgress: ProgressCallback = noopProgress,
  contributedRepos: { fullName: string; languages: string[] }[] = []
): Promise<Skill[]> => {
  await onProgress(15, 'Fetching repositories from GitHub...')

  const repos = await githubGetJson<GitHubRepo[]>(
    '/user/repos?sort=pushed&per_page=100&type=owner',
    accessToken
  )

  const ownedRepos = repos.filter((repo) => !repo.fork).slice(0, 30)
  const ownedFullNames = new Set(ownedRepos.map((repo) => repo.full_name))

  // Include repos the user has pushed commits to but doesn't own (e.g. OSS PRs
  // into other orgs' repos), so the skill profile reflects contribution activity
  // rather than only what the user happens to own.
  const externalRepos: GitHubRepo[] = contributedRepos
    .filter((repo) => !ownedFullNames.has(repo.fullName))
    .slice(0, 15)
    .map((repo) => ({ name: repo.fullName, full_name: repo.fullName, language: null, fork: false, size: 0 }))

  const reposToAnalyze = [...ownedRepos, ...externalRepos]
  const batchSize = 10
  const totalBatches = Math.ceil(reposToAnalyze.length / batchSize) || 1
  const languageTotals: Record<string, number> = {}
  const frameworkSet = new Set<string>()

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batch = reposToAnalyze.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize)
    const progressPercent = 20 + Math.round(((batchIdx + 1) / totalBatches) * 55)
    await onProgress(progressPercent, `Analyzing repositories (batch ${batchIdx + 1}/${totalBatches})...`)

    await Promise.all(batch.map(async (repo) => {
      try {
        const languages = await githubGetJson<Record<string, number>>(
          `/repos/${repo.full_name}/languages`,
          accessToken
        )
        for (const [lang, bytes] of Object.entries(languages)) {
          languageTotals[lang] = (languageTotals[lang] ?? 0) + bytes
        }
      } catch (err) {
        console.error(`[ContributorAnalysis] Failed to fetch languages for ${repo.full_name}:`, err)
      }

      const packageJson = await githubTryGetRaw(`/repos/${repo.full_name}/contents/package.json`, accessToken)
      if (packageJson !== null) {
        detectNpmFrameworks(parsePackageJson(packageJson), frameworkSet)
      }

      const requirements = await githubTryGetRaw(`/repos/${repo.full_name}/contents/requirements.txt`, accessToken)
      if (requirements !== null) {
        detectPythonFrameworks(parseRawContent(requirements), frameworkSet)
      }
    }))
  }

  await onProgress(80, 'Computing skill proficiency scores...')
  return buildSkillList(languageTotals, frameworkSet)
}

export const ContributorAnalysisService = {
  analyzeProfile,
  finalizeContributorProfile,
  syncStarredRepositories
}
