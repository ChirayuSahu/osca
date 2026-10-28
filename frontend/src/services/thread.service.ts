import { API_URL, readApiError } from '@/lib/api'

export const ThreadService = {
  async createThread(data: { owner: string; repo: string; title: string; body: string }, token: string) {
    const res = await fetch(`${API_URL}/issues/${data.owner}/${data.repo}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title: data.title, body: data.body })
    })
    if (!res.ok) throw await readApiError(res, 'Failed to create thread')
    return res.json()
  },

  async listThreads(owner: string, repo: string, token: string, page = 1) {
    const res = await fetch(`${API_URL}/issues/${owner}/${repo}?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to list threads')
    return res.json()
  },

  async getThread(owner: string, repo: string, issueNumber: string | number, token: string) {
    const res = await fetch(`${API_URL}/issues/${owner}/${repo}/${issueNumber}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to fetch thread')
    return res.json()
  },

  // Toggles the caller's 👍 on an issue or PR (GitHub treats PRs as issues here)
  async toggleThumbsUp(owner: string, repo: string, issueNumber: string | number, token: string): Promise<{ added: boolean }> {
    const res = await fetch(`${API_URL}/issues/${owner}/${repo}/${issueNumber}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: '+1' })
    })
    if (!res.ok) throw await readApiError(res, 'Failed to react')
    const body = await res.json()
    return { added: body.data?.toggled === 'added' }
  },

  async getPull(owner: string, repo: string, pullNumber: string | number, token: string) {
    const res = await fetch(`${API_URL}/pulls/${owner}/${repo}/${pullNumber}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to fetch pull request')
    return res.json()
  }
}
