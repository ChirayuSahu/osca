/**
 * How recommendations are doing, from RecommendationEvent plus GitHub.
 *
 *   npm run metrics:recommendations -- [--days=30] [--no-github]
 *
 * Funnel: impressions → opens → GitHub clicks / likes, and hides and skips.
 * Exploration slots are compared with regular ones. The north star is PRs users
 * opened, after being shown it, to a repository OSCA recommended to them (found
 * with GitHub search on the server token; --no-github skips that).
 */
import { config } from '../src/config'
import { prisma } from '../src/utils/prisma'

const argValue = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1]
const days = Math.max(1, parseInt(argValue('days') ?? '30', 10) || 30)
const withGithub = !process.argv.includes('--no-github')
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

const pct = (n: number, d: number) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const main = async () => {
  const grouped = await prisma.recommendationEvent.groupBy({
    by: ['type', 'explore'],
    where: { createdAt: { gte: since } },
    _count: { _all: true }
  })
  const count = (type: string, explore?: boolean) =>
    grouped.filter(g => g.type === type && (explore === undefined || g.explore === explore)).reduce((s, g) => s + g._count._all, 0)
  const users = await prisma.recommendationEvent.findMany({ where: { createdAt: { gte: since } }, distinct: ['userId'], select: { userId: true } })

  const shown = count('impression')
  console.log(`\nRecommendations, last ${days} days — ${users.length} active users\n`)
  console.table({
    impressions: { count: shown, rate: '' },
    opens: { count: count('open'), rate: pct(count('open'), shown) },
    'github clicks': { count: count('github'), rate: pct(count('github'), shown) },
    likes: { count: count('like'), rate: pct(count('like'), shown) },
    hides: { count: count('hide'), rate: pct(count('hide'), shown) },
    'skips (one by one)': { count: count('skip'), rate: pct(count('skip'), count('impression')) },
    'issues opened': { count: count('issue_open'), rate: '' }
  })
  console.log('Exploration slots vs regular (open rate):',
    pct(count('open', true), count('impression', true)), 'vs', pct(count('open', false), count('impression', false)))

  if (!withGithub || !config.githubServerToken) {
    if (withGithub) console.log('\nGITHUB_TOKEN is not set — skipping PR outcomes.')
    return
  }

  // North star: PRs to repositories each user was shown, opened after first seeing them
  let prs = 0
  let usersWithPr = 0
  for (const { userId } of users) {
    const account = await prisma.oAuthAccount.findFirst({ where: { userId, provider: 'github' }, select: { username: true } })
    const shownRepos = await prisma.recommendationEvent.groupBy({
      by: ['repositoryId'],
      where: { userId, type: 'impression', createdAt: { gte: since }, repositoryId: { not: null } },
      _min: { createdAt: true }
    })
    if (!account || shownRepos.length === 0) continue
    const repos = await prisma.repository.findMany({
      where: { id: { in: shownRepos.map(r => r.repositoryId as string) } },
      select: { id: true, fullName: true }
    })
    const firstShown = new Map(shownRepos.map(r => [r.repositoryId, r._min.createdAt]))
    const byName = new Map(repos.map(r => [r.fullName.toLowerCase(), firstShown.get(r.id)]))

    const q = `type:pr author:${account.username} created:>=${since.toISOString().slice(0, 10)}`
    const res = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=100`, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${config.githubServerToken}`, 'User-Agent': 'osca-metrics' }
    })
    await sleep(2500) // search API: 30 requests a minute
    if (!res.ok) continue
    const items = ((await res.json()) as { items?: Array<{ repository_url: string; created_at: string }> }).items ?? []
    const hits = items.filter(pr => {
      const fullName = pr.repository_url.split('/repos/')[1]?.toLowerCase()
      const shownAt = fullName ? byName.get(fullName) : undefined
      return shownAt && Date.parse(pr.created_at) >= shownAt.getTime()
    }).length
    prs += hits
    if (hits > 0) usersWithPr++
  }
  console.log(`\nNorth star: ${prs} PRs to recommended repositories, from ${usersWithPr} of ${users.length} users (${pct(usersWithPr, users.length)}).`)
}

main()
  .catch(err => {
    console.error('[Metrics] Failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
