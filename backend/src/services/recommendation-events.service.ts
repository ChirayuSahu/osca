import { prisma } from '../utils/prisma'
import { AppError } from '../lib/errors'
import { learnFromSignals, type Breakdown } from './ranking-tuning.service'

// Records what people do with recommendations (see RecommendationEvent) and
// feeds the learnable ones into the user's ranking multipliers.

const TYPES = new Set(['impression', 'open', 'github', 'like', 'hide', 'skip', 'issue_open'])
const SURFACES = new Set(['feed', 'focus', 'issues', 'repository'])
const MAX_BATCH = 50

type IncomingEvent = {
  type?: unknown
  surface?: unknown
  repositoryId?: unknown
  issueUrl?: unknown
  position?: unknown
  explore?: unknown
  breakdown?: unknown
}

const shortString = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null)

export const recordEvents = async (userId: string, body: unknown): Promise<number> => {
  const events = (body as { events?: unknown })?.events
  if (!Array.isArray(events) || events.length === 0) throw new AppError('events must be a non-empty list', 400)
  if (events.length > MAX_BATCH) throw new AppError(`At most ${MAX_BATCH} events per request`, 400)

  const rows = (events as IncomingEvent[]).flatMap(e => {
    if (typeof e?.type !== 'string' || !TYPES.has(e.type)) return []
    if (typeof e.surface !== 'string' || !SURFACES.has(e.surface)) return []
    const issueUrl = shortString(e.issueUrl, 300)
    return [{
      userId,
      type: e.type,
      surface: e.surface,
      repositoryId: shortString(e.repositoryId, 64),
      issueUrl: issueUrl && issueUrl.startsWith('https://github.com/') ? issueUrl : null,
      position: Number.isInteger(e.position) && (e.position as number) >= 0 && (e.position as number) < 10_000 ? (e.position as number) : null,
      explore: e.explore === true
    }]
  })
  if (rows.length === 0) return 0

  await prisma.recommendationEvent.createMany({ data: rows })
  const signals = (events as IncomingEvent[])
    .filter(e => typeof e?.type === 'string' && e.breakdown && typeof e.breakdown === 'object')
    .map(e => ({ type: e.type as string, breakdown: e.breakdown as Breakdown }))
  await learnFromSignals(userId, signals)
  return rows.length
}
