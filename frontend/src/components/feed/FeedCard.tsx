"use client"

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EyeOff, Sparkles, Sprout, Star } from 'lucide-react'
import { FeedItem } from '@/types/feed'
import { Reasons } from './reasons'
import { trackFeedItem } from '@/lib/recommendation-events'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RepoCard, RepoTitle, compactNumber } from '@/components/repo-ui'

interface FeedCardProps {
  item: FeedItem
  onNotInterested?: (item: FeedItem) => void
  /** Position in the feed, for tracking */
  position?: number
}

export function FeedCard({ item, onNotInterested, position }: FeedCardProps) {
  const router = useRouter()
  const repo = item.repository
  const { breakdown } = item.scoreInfo
  const [fallbackOwner, fallbackName] = repo.fullName.split('/')
  const owner = repo.owner || fallbackOwner
  const name = repo.name || fallbackName || repo.fullName
  const goodFirst = repo.goodFirstIssueCount ?? 0
  const match = Number.isFinite(item.scoreInfo.totalScore) ? Math.round(item.scoreInfo.totalScore * 100) : null
  const detailsHref = `/dashboard/repository/${repo.id}`

  // Each card counts as shown once
  useEffect(() => {
    trackFeedItem(item, 'impression', 'feed', position)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.repository.id])

  const openDetails = () => {
    trackFeedItem(item, 'open', 'feed', position)
    router.push(detailsHref)
  }

  return (
    <RepoCard
      className="h-full outline-none focus-visible:border-foreground/30 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      onClick={openDetails}
      role="link"
      tabIndex={0}
      aria-label={`Open ${repo.fullName}`}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openDetails()
        }
      }}
    >
      {/* Name and description */}
      <div className="flex flex-col gap-2 border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <RepoTitle owner={owner} name={name} />
          {onNotInterested && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Not interested in ${repo.fullName}`}
              title="Not interested"
              onClick={e => {
                e.stopPropagation()
                onNotInterested(item)
              }}
              onKeyDown={e => e.stopPropagation()}
              className="-my-1 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <EyeOff />
            </Button>
          )}
        </div>
        {/* Always two lines tall, so the dividers line up across a row */}
        <p className="line-clamp-2 min-h-[2lh] text-sm leading-relaxed text-muted-foreground">{repo.description}</p>
      </div>

      {/* Why it was recommended */}
      <div className="flex-1 px-6 py-5">
        <Reasons reasons={item.scoreInfo.reasons} max={2} className="gap-2 text-sm text-foreground/80" />
      </div>

      <div className="flex items-center gap-4 whitespace-nowrap border-t border-border px-6 py-4 text-xs text-muted-foreground">
        {breakdown.fallback ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-tint-emerald-500 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
            <Sprout className="size-3" /> Starter pick
          </span>
        ) : (
          match !== null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-tint-emerald-500 px-2 py-0.5 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              <Sparkles className="size-3" /> {match}% match
            </span>
          )
        )}
        {goodFirst > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Sprout className="size-3.5 text-emerald-600 dark:text-emerald-400" /> {goodFirst} good first
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 tabular-nums" title="Stars">
          <Star className="size-3.5" aria-hidden /> <span className="sr-only">Stars</span>
          {compactNumber(repo.stars)}
        </span>
      </div>
    </RepoCard>
  )
}

export function FeedCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-card">
      <div className="space-y-2 border-b border-border px-6 py-5">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <div className="flex-1 space-y-2.5 px-6 py-5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
      <div className="flex items-center gap-4 border-t border-border px-6 py-4">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="ml-auto h-3.5 w-10" />
      </div>
    </div>
  )
}
