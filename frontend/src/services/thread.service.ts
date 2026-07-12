const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

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
    if (!res.ok) throw new Error('Failed to create thread')
    return res.json()
  },

  async listThreads(owner: string, repo: string, token: string, page = 1) {
    const res = await fetch(`${API_URL}/issues/${owner}/${repo}?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to list threads')
    return res.json()
  },

  async getThread(owner: string, repo: string, issueNumber: string | number, token: string) {
    const res = await fetch(`${API_URL}/issues/${owner}/${repo}/${issueNumber}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch thread')
    return res.json()
  },

  async getPull(owner: string, repo: string, pullNumber: string | number, token: string) {
    const res = await fetch(`${API_URL}/pulls/${owner}/${repo}/${pullNumber}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch pull request')
    return res.json()
  }
}
