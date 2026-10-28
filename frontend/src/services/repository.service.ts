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

export const RepositoryService = {
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
