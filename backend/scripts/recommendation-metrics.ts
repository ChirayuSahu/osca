/**
 * How recommendations are doing, from RecommendationEvent plus GitHub.
 *
 *   npm run metrics:recommendations -- [--days=30]
 *
 * Funnel: impressions → opens → GitHub clicks / likes, and hides and skips.
 * Exploration slots are compared with regular ones. The north star is PRs users
 * opened to repositories OSCA showed them first (Contribution rows, recorded by
 * the daily contribution check).
 */
import { prisma } from '../src/utils/prisma'

const argValue = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1]
const days = Math.max(1, parseInt(argValue('days') ?? '30', 10) || 30)
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

const pct = (n: number, d: number) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`)

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

  // North star: PRs OSCA led to (recorded by the daily contribution check)
  const contributions = await prisma.contribution.findMany({
    where: { attributed: true, openedAt: { gte: since } },
    select: { userId: true, state: true, surface: true }
  })
  const merged = contributions.filter(c => c.state === 'merged').length
  const people = new Set(contributions.map(c => c.userId)).size
  const bySurface = contributions.reduce<Record<string, number>>((m, c) => ((m[c.surface ?? 'unknown'] = (m[c.surface ?? 'unknown'] ?? 0) + 1), m), {})
  console.log(`\nNorth star: ${contributions.length} PRs to recommended repositories (${merged} merged), from ${people} of ${users.length} active users (${pct(people, users.length)}).`)
  console.log('Where they came from:', Object.entries(bySurface).map(([k, v]) => `${k} ${v}`).join(', ') || '—')
}

main()
  .catch(err => {
    console.error('[Metrics] Failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
