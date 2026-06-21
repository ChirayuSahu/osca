import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { assertFound } from '../lib/errors'
import { buildSkillList } from '../lib/github/build-skills'
import {
  detectNpmFrameworks,
  detectPythonFrameworks,
  parsePackageJson,
  parseRawContent
} from '../lib/github/detect-frameworks'
import { getGithubAccessToken } from '../lib/github/get-access-token'
import { githubGetJson, githubTryGetRaw } from '../lib/github/client'
import type { ProgressCallback, Skill } from '../lib/github/types'
import { noopProgress } from '../lib/github/types'

interface GitHubRepo {
  name: string
  full_name: string
  language: string | null
  fork: boolean
  size: number
}

const toContributorExperience = (skills: Skill[]): Prisma.InputJsonValue => ({
  skills: skills.map((skill) => ({
    name: skill.name,
    proficiencyScore: skill.proficiencyScore
  }))
})

const analyzeProfile = async (
  userId: string,
  onProgress: ProgressCallback = noopProgress
): Promise<Skill[]> => {
  await onProgress(5, 'Fetching user profile from database...')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  assertFound(user, 'User not found')

  const accessToken = await getGithubAccessToken(userId)

  await onProgress(10, 'Starting profile analysis...')
  const skills = await analyzeGithubProfile(accessToken, onProgress)

  await onProgress(90, 'Saving extracted skills to database...')

  const skillNames = skills.map((skill) => skill.name)
  const avgSkillScore = skills.length > 0
    ? skills.reduce((sum, skill) => sum + skill.proficiencyScore, 0) / skills.length
    : 0

  const repositoryExperience = toContributorExperience(skills)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { skills: skillNames }
    })

    await tx.contributorProfile.upsert({
      where: { userId },
      create: {
        userId,
        skillScore: avgSkillScore,
        repositoryExperience
      },
      update: {
        skillScore: avgSkillScore,
        repositoryExperience
      }
    })
  })

  await onProgress(100, 'Profile analysis complete!')
  return skills
}

const analyzeGithubProfile = async (
  accessToken: string,
  onProgress: ProgressCallback = noopProgress
): Promise<Skill[]> => {
  await onProgress(15, 'Fetching repositories from GitHub...')

  const repos = await githubGetJson<GitHubRepo[]>(
    '/user/repos?sort=pushed&per_page=100&type=owner',
    accessToken
  )

  const reposToAnalyze = repos.filter((repo) => !repo.fork).slice(0, 30)
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
      } catch {
        // Skip repos we can't access
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
  analyzeProfile
}
