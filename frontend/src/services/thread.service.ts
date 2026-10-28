import { API_URL, apiFetch, readApiError } from '@/lib/api'

export const ThreadService = {
  async createThread(data: { owner: string; repo: string; title: string; body: string }, token: string) {
    const res = await apiFetch(`${API_URL}/issues/${data.owner}/${data.repo}`, {
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
    const res = await apiFetch(`${API_URL}/issues/${owner}/${repo}?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to list threads')
    return res.json()
  },

  async getThread(owner: string, repo: string, issueNumber: string | number, token: string) {
    const res = await apiFetch(`${API_URL}/issues/${owner}/${repo}/${issueNumber}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to fetch thread')
    return res.json()
  },

  // Toggles one of the caller's reactions on an issue or PR (GitHub treats PRs as issues here)
  async toggleReaction(owner: string, repo: string, issueNumber: string | number, content: string, token: string): Promise<boolean> {
    const res = await apiFetch(`${API_URL}/issues/${owner}/${repo}/${issueNumber}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content })
    })
    if (!res.ok) throw await readApiError(res, 'Failed to react')
    const body = await res.json()
    return body.data?.toggled === 'added'
  },

  // Timeline events, linked PRs or issues, and PR review threads (one GitHub call)
  async getActivity(owner: string, repo: string, issueNumber: string | number, token: string) {
    const res = await apiFetch(`${API_URL}/issues/${owner}/${repo}/${issueNumber}/activity`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to fetch activity')
    return res.json()
  },

  async getPull(owner: string, repo: string, pullNumber: string | number, token: string) {
    const res = await apiFetch(`${API_URL}/pulls/${owner}/${repo}/${pullNumber}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to fetch pull request')
    return res.json()
  }
}
