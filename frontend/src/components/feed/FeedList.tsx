"use client"

import React, { useState, useEffect } from 'react'
import { FeedService } from '@/services/feed.service'
import { FeedItem } from '@/types/feed'
import { FeedCard } from './FeedCard'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'

export function FeedList() {
  const { token } = useAuth()
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchFeed = async (pageToFetch: number, isInitial = false) => {
    if (!token) return
    
    try {
      if (isInitial) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }
      
      const response = await FeedService.getFeed(token, pageToFetch, 10)
      
      if (isInitial) {
        setItems(response.data)
      } else {
        setItems(prev => [...prev, ...response.data])
      }
      
      setHasMore(response.pagination.page < response.pagination.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchFeed(1, true)
  }, [token])

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchFeed(nextPage)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-neutral-400">Curating repositories for your skills...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20 max-w-md">
          <p className="font-medium mb-2">Something went wrong</p>
          <p className="text-sm opacity-80">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => fetchFeed(1, true)}
            className="mt-4 border-red-500/20 hover:bg-red-500/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Try again
          </Button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/[0.1] rounded-xl bg-white/[0.01]">
        <h3 className="text-xl font-bold text-white mb-2">Your feed is empty</h3>
        <p className="text-neutral-400 max-w-md">
          We couldn&apos;t find any repositories matching your exact skill profile right now. Try updating your profile or exploring all repositories.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="space-y-2 mb-10">
        <h1 className="text-[40px] font-serif italic text-white font-medium tracking-wide">Your Feed</h1>
        <p className="text-xl font-bold text-white">Repositories recommended specifically for your skill set</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((item) => (
          <FeedCard key={item.repository.id} item={item} />
        ))}
      </div>
      
      {hasMore && (
        <div className="mt-10 mb-8 flex justify-center">
          <Button 
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="bg-white hover:bg-neutral-200 text-black font-semibold rounded-full px-8 py-6 text-[15px]"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...
              </>
            ) : (
              'Load more repositories'
            )}
          </Button>
        </div>
      )}
      
      {!hasMore && items.length > 0 && (
        <div className="mt-8 text-center text-neutral-500 text-sm">
          You&apos;ve reached the end of your recommendations for now.
        </div>
      )}
    </div>
  )
}
