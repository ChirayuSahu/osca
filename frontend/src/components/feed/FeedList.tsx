"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Compass, GalleryHorizontal, LayoutGrid, Sprout } from 'lucide-react'
import { FeedService, FeedFilters, FeedLanguage } from '@/services/feed.service'
import { FeedItem } from '@/types/feed'
import { FeedCard, FeedCardSkeleton } from './FeedCard'
import { FeedFocus } from './FeedFocus'
import { FeedFocusSkeleton } from '@/components/skeletons'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'

const PAGE_SIZE = 10
const VIEW_KEY = 'osca:feed-view'

type FeedView = 'grid' | 'focus'
// Select items can't use an empty-string value, so "no language filter" gets a sentinel.
const ALL_LANGUAGES = 'all'

export function FeedList() {
  const { token } = useAuth()
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Filters
  const [filters, setFilters] = useState<FeedFilters>({})
  const [view, setViewState] = useState<FeedView>('grid')

  // Remember the last view for this browser
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === 'focus') setViewState('focus')
    } catch {
      // storage unavailable: stay on the grid
    }
  }, [])
  const setView = useCallback((next: FeedView) => {
    setViewState(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // ignore
    }
  }, [])
  const [languages, setLanguages] = useState<FeedLanguage[]>([])

  // Guards against an older request resolving after a newer one (fast filter changes)
  const requestId = useRef(0)
  // One seed per visit: a fresh order each time the page is opened, stable while scrolling
  const [seed] = useState(() => Date.now())

  const fetchFeed = useCallback(async (pageToFetch: number, activeFilters: FeedFilters, isInitial = false) => {
    if (!token) return
    const id = ++requestId.current

    try {
      if (isInitial) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      const response = await FeedService.getFeed(token, pageToFetch, PAGE_SIZE, activeFilters, seed)
      if (id !== requestId.current) return

      setItems(prev => {
        if (isInitial) return response.data
        const known = new Set(prev.map(i => i.repository.id))
        return [...prev, ...response.data.filter(i => !known.has(i.repository.id))]
      })
      setHasMore(response.pagination.page < response.pagination.totalPages)
    } catch (err) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [token, seed])

  useEffect(() => {
    setPage(1)
    fetchFeed(1, filters, true)
  }, [fetchFeed, filters])

  useEffect(() => {
    if (!token) return
    FeedService.getLanguages(token)
      .then(setLanguages)
      .catch(err => console.error('Failed to load feed languages', err))
  }, [token])

  const loadNextPage = useCallback(() => {
    if (loading || loadingMore || !hasMore || error) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchFeed(nextPage, filters)
  }, [loading, loadingMore, hasMore, error, page, filters, fetchFeed])

  // Infinite scroll: load the next page as the marker below the grid nears the viewport
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) loadNextPage()
      },
      { rootMargin: '600px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadNextPage])

  const restoreItem = (item: FeedItem, index: number) => {
    setItems(prev => {
      if (prev.some(i => i.repository.id === item.repository.id)) return prev
      const next = [...prev]
      next.splice(Math.min(index, next.length), 0, item)
      return next
    })
  }

  const handleUndo = async (item: FeedItem, index: number) => {
    if (!token) return
    restoreItem(item, index)
    try {
      await FeedService.clearNotInterested(token, item.repository.id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleNotInterested = async (item: FeedItem) => {
    if (!token) return
    const index = items.findIndex(i => i.repository.id === item.repository.id)
    setItems(prev => prev.filter(i => i.repository.id !== item.repository.id))

    const toastId = toast(`Hidden ${item.repository.fullName} from your feed`, {
      duration: 8000,
      action: { label: 'Undo', onClick: () => handleUndo(item, index) },
    })

    try {
      await FeedService.markNotInterested(token, item.repository.id)
    } catch (err) {
      console.error(err)
      // Put it back: the server didn't record the preference
      restoreItem(item, index)
      toast.dismiss(toastId)
      toast.error(`Couldn't hide ${item.repository.fullName}. Try again.`)
    }
  }

  const filtersActive = !!filters.language || !!filters.beginnerOnly

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.language ?? ALL_LANGUAGES}
          onValueChange={value => setFilters(f => ({ ...f, language: value === ALL_LANGUAGES ? undefined : value }))}
        >
          <SelectTrigger
            aria-label="Language"
            className="h-9 min-w-0 flex-1 rounded-md border-border bg-card px-3.5 sm:min-w-40 sm:flex-none shadow-none transition-colors hover:border-foreground/20 dark:bg-card dark:hover:bg-card"
          >
            <SelectValue placeholder="All languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LANGUAGES}>All languages</SelectItem>
            {languages.map(l => (
              <SelectItem key={l.language} value={l.language}>
                {l.language} <span className="text-muted-foreground tabular-nums">({l.count})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          aria-pressed={!!filters.beginnerOnly}
          onClick={() => setFilters(f => ({ ...f, beginnerOnly: !f.beginnerOnly || undefined }))}
          className="h-9 border-border bg-card px-3.5 font-normal text-muted-foreground shadow-none transition-colors hover:border-foreground/20 hover:bg-card hover:text-foreground has-[>svg]:px-3.5 dark:border-border aria-pressed:border-foreground/25 aria-pressed:bg-muted aria-pressed:text-foreground aria-pressed:hover:bg-muted"
        >
          <Sprout className="text-emerald-600 dark:text-emerald-400" />
          <span className="sm:hidden">Good first issues</span>
          <span className="hidden sm:inline">Has good first issues</span>
        </Button>

        {filtersActive && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setFilters({})}
            className="h-9 px-2 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
          >
            Clear filters
          </Button>
        )}

        <SegmentedControl
          aria-label="View"
          className="w-full sm:ml-auto sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
          value={view}
          onValueChange={setView}
          options={[
            { value: 'grid', label: 'Grid', icon: LayoutGrid },
            { value: 'focus', label: 'One by one', icon: GalleryHorizontal },
          ]}
        />
      </div>

      {loading && view === 'focus' ? (
        <FeedFocusSkeleton />
      ) : loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading recommendations">
          {Array.from({ length: 6 }).map((_, i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchFeed(1, filters, true)} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Compass />}
          title={filtersActive ? 'No repositories match these filters' : 'Your feed is empty'}
          description={
            filtersActive
              ? 'Try another language or turn off the good-first-issues filter.'
              : "Nothing matches your skill profile yet. Update your profile or browse all repositories."
          }
          action={
            filtersActive ? (
              <Button variant="outline" size="sm" onClick={() => setFilters({})}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : view === 'focus' ? (
        <FeedFocus
          items={items}
          token={token}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onNeedMore={loadNextPage}
          onNotInterested={handleNotInterested}
          onExit={() => setView('grid')}
        />
      ) : (
        <>
          <div className="stagger-in grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy={loadingMore}>
            {items.map(item => (
              <FeedCard key={item.repository.id} item={item} onNotInterested={handleNotInterested} />
            ))}
            {loadingMore && Array.from({ length: 3 }).map((_, i) => <FeedCardSkeleton key={`more-${i}`} />)}
          </div>

          {hasMore ? (
            <div ref={sentinelRef} aria-hidden className="h-px" />
          ) : (
            <p className="py-2 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
          )}
        </>
      )}
    </div>
  )
}
