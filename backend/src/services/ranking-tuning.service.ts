import { prisma } from '../utils/prisma'

// Per-user multipliers on the ranking weights, learned online from what the user
// does with recommendations. Each signal nudges the components that stood out
// for that repo (above its own average) up for positive actions and down for
// negative ones; multipliers stay within [0.5, 2] so the feed can tilt but
// never collapse onto one signal.

export const TUNED_COMPONENTS = ['content', 'collab', 'topic', 'keyword', 'stars', 'approachability'] as const
export type TunedComponent = (typeof TUNED_COMPONENTS)[number]
export type RankingTuning = Record<TunedComponent, number>
export type Breakdown = Partial<Record<TunedComponent, number>>

const LEARNING_RATE = 0.08
const MIN = 0.5
const MAX = 2

// How strongly each action says "more like this" (negative: less like this)
const SIGNAL: Record<string, number> = {
  open: 0.4,
  github: 1,
  like: 1.5,
  issue_open: 1,
  hide: -1.5,
  // Undoing "Not for me" takes back the hide's nudge (same size, other way)
  unhide: 1.5,
  skip: -0.25
}

const neutral = (): RankingTuning => ({ content: 1, collab: 1, topic: 1, keyword: 1, stars: 1, approachability: 1 })

export const parseTuning = (value: unknown): RankingTuning => {
  const tuning = neutral()
  if (value && typeof value === 'object') {
    for (const c of TUNED_COMPONENTS) {
      const v = (value as Record<string, unknown>)[c]
      if (typeof v === 'number' && Number.isFinite(v)) tuning[c] = Math.min(MAX, Math.max(MIN, v))
    }
  }
  return tuning
}

/** Known components only, each clamped to [0, 1] */
export const clampBreakdown = (b: Breakdown): Partial<Record<TunedComponent, number>> => {
  const out: Partial<Record<TunedComponent, number>> = {}
  for (const c of TUNED_COMPONENTS) {
    const v = b[c]
    if (typeof v === 'number' && Number.isFinite(v)) out[c] = Math.min(1, Math.max(0, v))
  }
  return out
}

/** Applies a batch of signals to the user's stored multipliers */
export const learnFromSignals = async (userId: string, signals: Array<{ type: string; breakdown?: Breakdown }>): Promise<void> => {
  const useful = signals.filter(s => SIGNAL[s.type] !== undefined && s.breakdown)
  if (useful.length === 0) return

  // Row lock: two batches arriving together must not overwrite each other's update
  await prisma.$transaction(async tx => {
    const locked = await tx.$queryRaw<Array<{ rankingTuning: unknown }>>`SELECT "rankingTuning" FROM "User" WHERE id = ${userId} FOR UPDATE`
    if (locked.length === 0) return
    const tuning = parseTuning(locked[0].rankingTuning)

    for (const signal of useful) {
      const b = clampBreakdown(signal.breakdown as Breakdown)
      const present = TUNED_COMPONENTS.filter(c => b[c] !== undefined)
      if (present.length < 2) continue
      const mean = present.reduce((sum, c) => sum + (b[c] as number), 0) / present.length
      for (const c of present) {
        const delta = LEARNING_RATE * SIGNAL[signal.type] * ((b[c] as number) - mean)
        tuning[c] = Math.min(MAX, Math.max(MIN, tuning[c] * Math.exp(delta)))
      }
    }

    await tx.user.update({ where: { id: userId }, data: { rankingTuning: tuning } })
  })
}
