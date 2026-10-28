import { FeedResponse, Reason } from '../types/feed'
import { API_URL, readApiError } from '@/lib/api'

export interface FeedFilters {
  language?: string
  beginnerOnly?: boolean
}

export interface FeedLanguage {
  language: string
  count: number
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

/** An unclaimed starter issue from one of your best-matching repositories */
export interface IssueRecommendation {
  number: number
  title: string
  url: string
  createdAt: string
  comments: number
  labels: { name: string; color: string }[]
  repository: { id: string; owner: string; name: string; primaryLanguage: string | null }
  reasons: Reason[]
}

export const FeedService = {
  /** `seed` identifies this visit so the order differs between visits but not between pages */
  async getFeed(token: string, page = 1, limit = 20, filters: FeedFilters = {}, seed?: number): Promise<FeedResponse> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (seed) params.set('seed', String(seed))
    if (filters.language) params.set('language', filters.language)
    if (filters.beginnerOnly) params.set('beginner', 'true')

    const res = await fetch(`${API_URL}/feed?${params}`, { headers: authHeaders(token) })
    if (!res.ok) throw await readApiError(res, 'Failed to fetch feed')
    return res.json()
  },

  async getIssueRecommendations(token: string): Promise<IssueRecommendation[]> {
    const res = await fetch(`${API_URL}/recommendations/issues`, { headers: authHeaders(token) })
    if (!res.ok) throw await readApiError(res, 'Failed to load issue recommendations')
    return (await res.json()).data
  },

  async getLanguages(token: string): Promise<FeedLanguage[]> {
    const res = await fetch(`${API_URL}/feed/languages`, { headers: authHeaders(token) })
    if (!res.ok) throw await readApiError(res, 'Failed to fetch feed languages')
    return (await res.json()).data ?? []
  },

  async markNotInterested(token: string, repositoryId: string): Promise<void> {
    const res = await fetch(`${API_URL}/repositories/${repositoryId}/not-interested`, {
      method: 'POST',
      headers: authHeaders(token)
    })
    if (!res.ok) throw await readApiError(res, 'Failed to hide repository')
  },

  async clearNotInterested(token: string, repositoryId: string): Promise<void> {
    const res = await fetch(`${API_URL}/repositories/${repositoryId}/not-interested`, {
      method: 'DELETE',
      headers: authHeaders(token)
    })
    if (!res.ok) throw await readApiError(res, 'Failed to restore repository')
  }
}
