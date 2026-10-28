import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { githubGraphQL, getGithubAccessToken } from '../lib/github'
import { noteGithubTokenError } from './github-token-health.service'
import { learnFromSignals, type Breakdown } from './ranking-tuning.service'

// Finds the public pull requests a user opened and records them as
// Contributions. A PR is attributed to OSCA when we showed the user that
// repository (or an issue the PR closes) before they opened it, and they hadn't
// opened PRs there before: only then did OSCA plausibly lead to it.

const LOOKBACK_DAYS = 120
const DAY_MS = 24 * 60 * 60 * 1000
// A merged PR is the strongest "more like this" there is: three likes' worth
const MERGE_SIGNAL_REPEAT = 3

type PrNode = {
  url: string
  number: number
  title: string
  state: 'OPEN' | 'MERGED' | 'CLOSED'
  createdAt: string
  mergedAt: string | null
  closedAt: string | null
  repository: { nameWithOwner: string; isPrivate: boolean; owner: { login: string } }
  closingIssuesReferences?: { nodes?: Array<{ number: number }> }
}

const QUERY = `
  query {
    viewer {
      login
      pullRequests(last: 50, orderBy: { field: CREATED_AT, direction: ASC }) {
        nodes {
          url number title state createdAt mergedAt closedAt
          repository { nameWithOwner isPrivate owner { login } }
          closingIssuesReferences(first: 5) { nodes { number } }
        }
      }
    }
  }
`

const issueUrlOf = (repo: string, n: number) => `https://github.com/${repo}/issues/${n}`

/** Reads the user's recent public PRs and updates their Contributions */
export const syncContributions = async (userId: string): Promise<{ found: number; attributed: number }> => {
  let token: string
  try {
    token = await getGithubAccessToken(userId)
  } catch {
    return { found: 0, attributed: 0 }
  }

  let viewer: { login: string; pullRequests: { nodes: PrNode[] } } | undefined
  try {
    const res = await githubGraphQL<{ data?: { viewer?: typeof viewer } }>(QUERY, token)
    viewer = res.data?.viewer
  } catch (error) {
    if (await noteGithubTokenError(userId, error)) return { found: 0, attributed: 0 }
    throw error
  }
  if (!viewer) return { found: 0, attributed: 0 }

  const since = Date.now() - LOOKBACK_DAYS * DAY_MS
  const publicPrs = viewer.pullRequests.nodes.filter(pr =>
    !pr.repository.isPrivate &&
    // Your own repos aren't open-source contributions in this sense
    pr.repository.owner.login.toLowerCase() !== viewer!.login.toLowerCase()
  )
  // New contributions are looked for in the recent window; older PRs still
  // count as history ("contributed there before") below
  const prs = publicPrs.filter(pr => Date.parse(pr.createdAt) >= since)

  const repoNames = [...new Set(prs.map(pr => pr.repository.nameWithOwner))]
  const repos = await prisma.repository.findMany({
    where: { OR: repoNames.map(fullName => ({ fullName: { equals: fullName, mode: 'insensitive' as const } })) },
    select: { id: true, fullName: true }
  })
  const repoIdByName = new Map(repos.map(r => [r.fullName.toLowerCase(), r.id]))

  // Everything OSCA showed or the user opened, per repository and per issue
  const events = repos.length === 0 ? [] : await prisma.recommendationEvent.findMany({
    where: { userId, repositoryId: { in: repos.map(r => r.id) } },
    orderBy: { createdAt: 'asc' },
    select: { repositoryId: true, issueUrl: true, surface: true, createdAt: true }
  })

  let attributedCount = 0
  for (const pr of prs) {
    const repoName = pr.repository.nameWithOwner
    const repositoryId = repoIdByName.get(repoName.toLowerCase()) ?? null
    const openedAt = new Date(pr.createdAt)
    const closes = (pr.closingIssuesReferences?.nodes ?? []).map(i => i.number)
    const issueUrls = new Set(closes.map(n => issueUrlOf(repoName, n)))

    // Earliest time OSCA showed this repo, or an issue this PR closes, before the PR
    const shown = events.find(e =>
      e.createdAt < openedAt && (e.repositoryId === repositoryId || (e.issueUrl !== null && issueUrls.has(e.issueUrl)))
    )
    // Contributing there before OSCA showed it means OSCA didn't lead them there.
    // Any fetched PR counts, however old, and so does one stored from an earlier sync.
    const contributedBefore = shown
      ? publicPrs.some(other => other.repository.nameWithOwner.toLowerCase() === repoName.toLowerCase() && Date.parse(other.createdAt) < shown.createdAt.getTime()) ||
        (await prisma.contribution.count({
          where: { userId, repoFullName: { equals: repoName, mode: 'insensitive' }, openedAt: { lt: shown.createdAt } }
        })) > 0
      : true
    const attributed = !!shown && !contributedBefore
    if (attributed) attributedCount++

    const state = pr.state === 'MERGED' ? 'merged' : pr.state === 'CLOSED' ? 'closed' : 'open'
    await prisma.contribution.upsert({
      where: { userId_prUrl: { userId, prUrl: pr.url } },
      create: {
        userId, prUrl: pr.url, prNumber: pr.number, title: pr.title.slice(0, 300), repoFullName: repoName, repositoryId,
        state, closesIssues: closes, attributed, surface: shown?.surface ?? null, firstShownAt: shown?.createdAt ?? null,
        openedAt, mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null, closedAt: pr.closedAt ? new Date(pr.closedAt) : null
      },
      update: {
        title: pr.title.slice(0, 300), state, closesIssues: closes, attributed, repositoryId,
        surface: shown?.surface ?? null, firstShownAt: shown?.createdAt ?? null,
        mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null, closedAt: pr.closedAt ? new Date(pr.closedAt) : null
      }
    })
  }

  await refreshOlderOpenPrs(userId, token, new Set(prs.map(pr => pr.url)))
  await learnFromMerges(userId)
  await prisma.user.update({ where: { id: userId }, data: { contributionsSyncedAt: new Date() } })
  return { found: prs.length, attributed: attributedCount }
}

// Stored PRs still "open" that the sync didn't fetch (older than the window, or
// beyond the last 50) would never update; read their state directly
const MAX_REFRESH = 20
const refreshOlderOpenPrs = async (userId: string, token: string, fetched: Set<string>): Promise<void> => {
  const stale = (await prisma.contribution.findMany({
    where: { userId, state: 'open' },
    orderBy: { openedAt: 'asc' },
    select: { id: true, prUrl: true }
  })).filter(c => !fetched.has(c.prUrl)).slice(0, MAX_REFRESH)
  if (stale.length === 0) return

  const fields = stale.map((c, i) => `p${i}: resource(url: ${JSON.stringify(c.prUrl)}) { ... on PullRequest { state mergedAt closedAt } }`).join('\n')
  let data: Record<string, { state?: PrNode['state']; mergedAt?: string | null; closedAt?: string | null } | null> | undefined
  try {
    data = (await githubGraphQL<{ data?: typeof data }>(`query { ${fields} }`, token)).data
  } catch {
    return // tried again on the next sync
  }
  for (const [i, c] of stale.entries()) {
    const pr = data?.[`p${i}`]
    if (!pr?.state || pr.state === 'OPEN') continue
    await prisma.contribution.update({
      where: { id: c.id },
      data: {
        state: pr.state === 'MERGED' ? 'merged' : 'closed',
        mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
        closedAt: pr.closedAt ? new Date(pr.closedAt) : null
      }
    })
  }
}

// Each attributed merge teaches the ranking once, using what the repo scored on
// when OSCA last showed it to this user
const learnFromMerges = async (userId: string): Promise<void> => {
  const merges = await prisma.contribution.findMany({
    where: { userId, attributed: true, state: 'merged', learnedAt: null, repositoryId: { not: null } },
    select: { id: true, repositoryId: true }
  })
  for (const merge of merges) {
    // Claim it first, so two overlapping syncs can't both learn from it
    const claimed = await prisma.contribution.updateMany({ where: { id: merge.id, learnedAt: null }, data: { learnedAt: new Date() } })
    if (claimed.count === 0) continue
    const shown = await prisma.recommendationEvent.findFirst({
      where: { userId, repositoryId: merge.repositoryId, breakdown: { not: Prisma.DbNull } },
      orderBy: { createdAt: 'desc' },
      select: { breakdown: true }
    })
    if (shown?.breakdown) {
      const breakdown = shown.breakdown as Breakdown
      await learnFromSignals(userId, Array.from({ length: MERGE_SIGNAL_REPEAT }, () => ({ type: 'like', breakdown })))
    }
  }
}

/** Your contributions, newest first, with totals for the profile */
export const listContributions = async (userId: string) => {
  const contributions = await prisma.contribution.findMany({
    where: { userId },
    orderBy: { openedAt: 'desc' },
    take: 50,
    select: {
      id: true, prUrl: true, prNumber: true, title: true, repoFullName: true, repositoryId: true, state: true,
      attributed: true, surface: true, openedAt: true, mergedAt: true
    }
  })
  const viaOsca = contributions.filter(c => c.attributed)
  return {
    contributions,
    totals: { viaOsca: viaOsca.length, mergedViaOsca: viaOsca.filter(c => c.state === 'merged').length }
  }
}
