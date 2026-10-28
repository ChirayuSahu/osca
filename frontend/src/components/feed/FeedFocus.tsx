"use client"

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CircleDot,
  EyeOff,
  GitFork,
  HandHelping,
  Heart,
  SquareArrowOutUpRight,
  Sprout,
  Star,
} from 'lucide-react'
import { FeedItem } from '@/types/feed'
import { Reasons } from './reasons'
import { trackFeedItem } from '@/lib/recommendation-events'
import { RepositoryService, type StarterIssue } from '@/services/repository.service'
import { isGithubTokenError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Dither } from '@/components/ui/dither'
import { DitheredImage, githubAvatarUrl } from '@/components/ui/dithered-image'
import { Eyebrow, SegmentedMeter, StatStrip, Tag, compactNumber, timeAgo, topLanguages } from '@/components/repo-ui'
import { cn } from '@/lib/utils'

interface FeedFocusProps {
  items: FeedItem[]
  token: string | null
  hasMore: boolean
  loadingMore: boolean
  onNeedMore: () => void
  onNotInterested: (item: FeedItem) => void
  onExit: () => void
}

// Fetch the next page while this many cards are still ahead
const PREFETCH_AHEAD = 3
// Horizontal drag (px) that counts as a swipe
const SWIPE_THRESHOLD = 80
// Repositories listed in the side panel
const UP_NEXT_COUNT = 12
// Filling the viewport only applies at the two-column (lg) layout
const DESKTOP_MIN_WIDTH = 1024
const MIN_FILL_HEIGHT = 560
// Matches the page container's bottom padding (pb-16), so the page doesn't scroll
const BOTTOM_GAP = 64

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/** One repository at a time: arrows to browse, Space to like, X to hide, Enter to open. */
export function FeedFocus({ items, token, hasMore, loadingMore, onNeedMore, onNotInterested, onExit }: FeedFocusProps) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const upNextRef = useRef<HTMLUListElement>(null)
  // On desktop the viewer fills the rest of the viewport instead of leaving space below
  const [fillHeight, setFillHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current
      if (!el || window.innerWidth < DESKTOP_MIN_WIDTH) return setFillHeight(null)
      const top = el.getBoundingClientRect().top + window.scrollY
      setFillHeight(Math.max(MIN_FILL_HEIGHT, window.innerHeight - top - BOTTOM_GAP))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [dragX, setDragX] = useState(0)
  const dragStart = useRef<number | null>(null)

  const atEnd = index >= items.length
  const item = atEnd ? null : items[index]

  // Hiding a card shrinks the list; keep the index in range
  useEffect(() => {
    if (index > items.length) setIndex(items.length)
  }, [index, items.length])

  useEffect(() => {
    upNextRef.current?.scrollTo({ top: 0 })
  }, [index])

  useEffect(() => {
    if (hasMore && !loadingMore && index >= items.length - PREFETCH_AHEAD) onNeedMore()
  }, [index, items.length, hasMore, loadingMore, onNeedMore])

  const go = useCallback(
    (step: 1 | -1) => {
      setDirection(step === 1 ? 'next' : 'prev')
      setIndex(i => Math.max(0, Math.min(items.length, i + step)))
    },
    [items.length]
  )

  // Each card counts as shown when it comes up
  useEffect(() => {
    if (item) trackFeedItem(item, 'impression', 'focus', index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.repository.id])

  // Moving on without liking is a (weak) "not this"
  const next = useCallback(() => {
    if (item && !liked[item.repository.id]) trackFeedItem(item, 'skip', 'focus', index)
    go(1)
  }, [item, liked, index, go])

  const open = useCallback(() => {
    if (!item) return
    trackFeedItem(item, 'open', 'focus', index)
    router.push(`/dashboard/repository/${item.repository.id}`)
  }, [item, index, router])

  const hide = useCallback(() => {
    if (!item) return
    setDirection('next')
    onNotInterested(item)
  }, [item, onNotInterested])

  const toggleLike = useCallback(async () => {
    if (!item || !token) return
    const id = item.repository.id
    const wasLiked = !!liked[id]
    setLiked(prev => ({ ...prev, [id]: !wasLiked }))
    if (!wasLiked) trackFeedItem(item, 'like', 'focus', index)
    // Liking moves on to the next card, like a swipe right
    if (!wasLiked) window.setTimeout(() => go(1), 220)
    try {
      const { liked: nowLiked } = await RepositoryService.toggleLike(id, token)
      setLiked(prev => ({ ...prev, [id]: nowLiked }))
    } catch (err) {
      setLiked(prev => ({ ...prev, [id]: wasLiked }))
      toast.error(isGithubTokenError(err) ? 'Reconnect GitHub to like repositories.' : `Couldn't update your like.`)
    }
  }, [item, token, liked, go, index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      // Leave keys alone while a dialog or menu is open
      if (document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')) return
      switch (e.key) {
        case 'ArrowRight':
        case 'l':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
        case 'h':
          e.preventDefault()
          go(-1)
          break
        case ' ':
          e.preventDefault()
          toggleLike()
          break
        case 'x':
        case 'X':
          e.preventDefault()
          hide()
          break
        case 'Enter':
          if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return
          e.preventDefault()
          open()
          break
        case 'Escape':
          onExit()
          break
      }
    }
    // Space on a focused button would also "click" it on keyup; the shortcut already handled it
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && e.target instanceof HTMLButtonElement && !isTypingTarget(e.target)) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [go, next, toggleLike, hide, open, onExit])

  // Touch / mouse swipe on the card
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return
    dragStart.current = e.clientX
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current !== null) setDragX(e.clientX - dragStart.current)
  }
  const onPointerUp = () => {
    if (dragStart.current === null) return
    const dx = dragX
    dragStart.current = null
    setDragX(0)
    if (dx <= -SWIPE_THRESHOLD) next()
    else if (dx >= SWIPE_THRESHOLD) go(-1)
  }

  const total = items.length
  const position = Math.min(index + 1, total)

  const upNext = items.slice(index + 1, index + 1 + UP_NEXT_COUNT)
  const isLiked = !!(item && liked[item.repository.id])

  return (
    <div ref={rootRef} className="flex flex-col gap-4" style={fillHeight ? { height: fillHeight } : undefined}>
      {/* Fills the remaining height; the card grows and the side panel matches it */}
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:grid-rows-[minmax(0,1fr)]">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        {item ? (
          <FocusCard
            key={item.repository.id}
            item={item}
            token={token}
            direction={direction}
            dragX={dragX}
            liked={isLiked}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        ) : (
          <EndCard loading={loadingMore || hasMore} onBack={() => go(-1)} onExit={onExit} />
        )}

        {/* Controls: above the card on phones, where the card runs past the fold */}
        <div className="flex items-center justify-between gap-2 max-sm:order-first">
          <Button variant="outline" onClick={() => go(-1)} disabled={index === 0}>
            <ArrowLeft /> <span className="hidden sm:inline">Previous</span>
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={hide} disabled={!item} aria-label="Not for me">
              <EyeOff /> <span className="hidden sm:inline">Not for me</span>
            </Button>
            <Button
              variant={isLiked ? 'outline' : 'default'}
              onClick={toggleLike}
              disabled={!item}
              aria-pressed={isLiked}
              className={cn('min-w-28', isLiked && 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300')}
            >
              <Heart className={cn(isLiked && 'fill-current')} />
              {isLiked ? 'Liked' : 'Like'}
            </Button>
            <Button variant="outline" onClick={open} disabled={!item} aria-label="Open repository">
              <SquareArrowOutUpRight /> <span className="hidden sm:inline">Open</span>
            </Button>
          </div>
          <Button variant="outline" onClick={next} disabled={atEnd}>
            <span className="hidden sm:inline">Next</span> <ArrowRight />
          </Button>
        </div>
      </div>

      {/* Side panel: what's coming, and the keys; the list scrolls if it overflows */}
      <aside className="flex min-h-0 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Eyebrow>Up next</Eyebrow>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {loadingMore ? 'Loading…' : `${atEnd ? total : position} / ${total}${hasMore ? '+' : ''}`}
            </span>
          </div>
          {upNext.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">{hasMore ? 'Loading more…' : 'Nothing after this one.'}</p>
          ) : (
            <ul ref={upNextRef} className="custom-scrollbar min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {upNext.map((next, i) => {
                const [o, n] = next.repository.fullName.split('/')
                const nextMatch = Number.isFinite(next.scoreInfo.totalScore)
                  ? Math.round(next.scoreInfo.totalScore * 100)
                  : null
                return (
                  <li key={next.repository.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDirection('next')
                        setIndex(index + 1 + i)
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
                    >
                      <span className="w-4 text-xs text-muted-foreground tabular-nums">{index + 2 + i}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-muted-foreground">{next.repository.owner || o}</span>
                        <span className="block truncate text-sm font-medium">{next.repository.name || n}</span>
                      </span>
                      {next.scoreInfo.breakdown.fallback ? (
                        <Sprout className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        nextMatch !== null && (
                          <span className="shrink-0 text-xs font-medium text-emerald-700 tabular-nums dark:text-emerald-400">
                            {nextMatch}%
                          </span>
                        )
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="hidden flex-col gap-2.5 rounded-md border border-border bg-card px-4 py-3.5 text-xs text-muted-foreground sm:flex">
          <Eyebrow>Keyboard</Eyebrow>
          <Shortcut keys={[<ArrowLeft key="l" />, <ArrowRight key="r" />]} label="Browse" />
          <Shortcut keys={['Space']} label="Like and next" />
          <Shortcut keys={['X']} label="Not for me" />
          <Shortcut keys={['Enter']} label="Open repository" />
          <Shortcut keys={['Esc']} label="Back to grid" />
        </div>
      </aside>
      </div>
    </div>
  )
}

function Shortcut({ keys, label }: { keys: React.ReactNode[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <KbdGroup>
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </KbdGroup>
    </div>
  )
}

function FocusCard({
  item,
  token,
  direction,
  dragX,
  liked,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  item: FeedItem
  token: string | null
  direction: 'next' | 'prev'
  dragX: number
  liked: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
}) {
  const repo = item.repository
  const { breakdown, totalScore } = item.scoreInfo
  const [fallbackOwner, fallbackName] = repo.fullName.split('/')
  const owner = repo.owner || fallbackOwner
  const name = repo.name || fallbackName || repo.fullName
  const match = Number.isFinite(totalScore) ? Math.round(totalScore * 100) : null
  const goodFirst = repo.goodFirstIssueCount ?? 0
  const helpWanted = repo.helpWantedCount ?? 0
  const tags = Array.from(
    new Map(
      [...topLanguages(repo.languages), ...(repo.frameworks ?? []).slice(0, 3), ...(repo.topics ?? []).slice(0, 2)].map(t => [
        t.toLowerCase(),
        t,
      ])
    ).values()
  ).slice(0, 7)

  const stats = [
    { label: 'Stars', value: compactNumber(repo.stars), icon: Star },
    { label: 'Forks', value: compactNumber(repo.forks), icon: GitFork },
    { label: 'Open issues', value: compactNumber(repo.openIssuesCount), icon: CircleDot },
    { label: 'Good first issues', value: goodFirst.toLocaleString(), icon: Sprout, accent: true },
  ]

  const fallbackDither = <Dither cols={90} rows={60} cell={5} direction="radial" className="text-emerald-500/20" />

  return (
    <article
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={dragX ? { transform: `translateX(${dragX}px) rotate(${dragX / 40}deg)` } : undefined}
      className={cn(
        'relative isolate flex min-h-0 w-full flex-1 touch-pan-y select-none flex-col overflow-hidden rounded-md border bg-card',
        'animate-in fade-in duration-200 motion-reduce:animate-none',
        direction === 'next' ? 'slide-in-from-right-6' : 'slide-in-from-left-6',
        dragX === 0 && 'transition-transform',
        liked ? 'border-emerald-500/40' : 'border-border'
      )}
    >
      {/* Owner logo, dithered, fading out on all sides */}
      <div className="pointer-events-none absolute -right-12 -top-10 -z-10 [mask-image:radial-gradient(closest-side,black_45%,transparent)]">
        <DitheredImage src={githubAvatarUrl(owner, 200)} cols={84} cell={5} className="text-emerald-500/25" fallback={fallbackDither} />
      </div>

      <div className="flex shrink-0 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {breakdown.fallback ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-tint-emerald-500 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Sprout className="size-3.5" /> Starter pick
            </span>
          ) : (
            match !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-tint-emerald-500 px-2 py-1 text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                {match}% match
              </span>
            )
          )}
          {liked && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-card px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Heart className="size-3 fill-current" /> Liked
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {owner} <span className="text-muted-foreground/50">/</span>
          </p>
          <h2 className="break-words font-serif text-4xl font-medium italic tracking-wide">{name}</h2>
        </div>

        {repo.description ? (
          <p className="line-clamp-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{repo.description}</p>
        ) : (
          <p className="text-base italic text-muted-foreground/70">No description.</p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}

        {/* Why it was recommended */}
        <Reasons reasons={item.scoreInfo.reasons} max={3} className="text-[13px]" />

        {/* Why it's a good first contribution */}
        <div className="grid gap-4 sm:grid-cols-2">
          {match !== null && !breakdown.fallback && (
            <div className="flex flex-col gap-2">
              <Eyebrow>Skill match</Eyebrow>
              <SegmentedMeter value={match} segments={24} />
            </div>
          )}
          {!breakdown.fallback && typeof breakdown.approachabilityScore === 'number' && (
            <div className="flex flex-col gap-2">
              <Eyebrow>Newcomer friendly</Eyebrow>
              <SegmentedMeter value={Math.round(breakdown.approachabilityScore * 100)} segments={24} />
            </div>
          )}
        </div>

        {(repo.hasContributingGuide || helpWanted > 0 || repo.pushedAt) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {repo.pushedAt && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Pushed {timeAgo(repo.pushedAt)}
              </span>
            )}
            {repo.hasContributingGuide && (
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-3.5" /> Contributing guide
              </span>
            )}
            {helpWanted > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <HandHelping className="size-3.5" /> {helpWanted} help wanted
              </span>
            )}
          </div>
        )}
      </div>

      <StarterIssues repositoryId={repo.id} token={token} />

      <StatStrip stats={stats} className="shrink-0" />
    </article>
  )
}

// Open good first issues per repository, cached for the session
const starterCache = new Map<string, StarterIssue[]>()

// Fills the card's spare height with issues a newcomer could pick up; scrolls if there are many
function StarterIssues({ repositoryId, token }: { repositoryId: string; token: string | null }) {
  const [issues, setIssues] = useState<StarterIssue[] | null | 'error'>(() => starterCache.get(repositoryId) ?? null)

  useEffect(() => {
    if (!token || starterCache.has(repositoryId)) return
    let cancelled = false
    RepositoryService.getStarterIssues(repositoryId, token)
      .then(list => {
        starterCache.set(repositoryId, list)
        if (!cancelled) setIssues(list)
      })
      .catch(() => !cancelled && setIssues('error'))
    return () => {
      cancelled = true
    }
  }, [repositoryId, token])

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border">
      <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4 sm:px-6">
        <Eyebrow>Good first issues</Eyebrow>
        {Array.isArray(issues) && issues.length > 0 && (
          <span className="text-[11px] text-muted-foreground">Unassigned first</span>
        )}
      </div>
      {issues === null ? (
        <div className="flex flex-col gap-2 px-5 pb-4 sm:px-6" aria-hidden>
          {[0, 1, 2].map(i => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-muted/60" />
          ))}
        </div>
      ) : issues === 'error' || issues.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-muted-foreground sm:px-6">
          {issues === 'error' ? "Couldn't load issues right now." : 'No open good first issues right now.'}
        </p>
      ) : (
        <ul className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
          {issues.map(issue => (
            <li key={issue.number}>
              <a
                href={issue.url}
                target="_blank"
                rel="noreferrer"
                onPointerDown={e => e.stopPropagation()}
                className="flex items-center gap-3 px-5 py-2 text-sm transition-colors hover:bg-muted/40 sm:px-6"
              >
                <CircleDot className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="min-w-0 flex-1 truncate">{issue.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">#{issue.number}</span>
                {issue.assigned && <span className="shrink-0 text-[11px] text-muted-foreground">assigned</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EndCard({ loading, onBack, onExit }: { loading: boolean; onBack: () => void; onExit: () => void }) {
  return (
    <div className="relative isolate flex w-full flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-md border border-border bg-card px-6 py-20 text-center">
      <Dither
        cols={110}
        rows={40}
        cell={5}
        direction="radial"
        peak={0.6}
        className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-emerald-500/[0.12]"
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading more repositories…</p>
      ) : (
        <>
          <div>
            <p className="font-medium">You&apos;re all caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">That&apos;s every repository in your feed for now.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft /> Previous
            </Button>
            <Button size="sm" onClick={onExit}>
              Back to grid
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
