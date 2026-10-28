import { API_URL, readApiError } from '@/lib/api'

export interface StarterIssue {
  number: number
  title: string
  url: string
  createdAt: string
  comments: number
  assigned: boolean
  labels: { name: string; color: string }[]
}

/** A repository you asked OSCA to analyze that isn't an import yet */
export interface AnalysisRequest {
  id: string
  url: string
  fullName: string
  status: 'queued' | 'analyzing' | 'failed'
  error: string | null
  progress: { percent?: number; message?: string } | null
  createdAt: string
  updatedAt: string
}

export const RepositoryService = {
  async listAnalysisRequests(token: string): Promise<AnalysisRequest[]> {
    const res = await fetch(`${API_URL}/repositories/requests`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw await readApiError(res, 'Failed to load analysis requests')
    return (await res.json()).data
  },

  async dismissAnalysisRequest(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_URL}/repositories/requests/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to dismiss')
  },

  async analyzeRepository(url: string, token: string) {
    const res = await fetch(`${API_URL}/repositories/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ url })
    })
    if (!res.ok) throw await readApiError(res, 'Failed to start repository analysis')
    return res.json()
  },

  async getRepository(id: string, token: string) {
    const res = await fetch(`${API_URL}/repositories/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to fetch repository')
    return res.json()
  },

  // Adds a catalogue repo (already analyzed) to the user's imports
  async importRepository(id: string, token: string): Promise<{ alreadyImported: boolean }> {
    const res = await fetch(`${API_URL}/repositories/${id}/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to import repository')
    return { alreadyImported: !!(await res.json()).data?.alreadyImported }
  },

  async getStarterIssues(id: string, token: string): Promise<StarterIssue[]> {
    const res = await fetch(`${API_URL}/repositories/${id}/starter-issues`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to fetch starter issues')
    return (await res.json()).data ?? []
  },

  async toggleLike(id: string, token: string) {
    const res = await fetch(`${API_URL}/repositories/${id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to toggle repository like')
    // 201 = now liked, 200 = like removed
    return { liked: res.status === 201 }
  }
}
