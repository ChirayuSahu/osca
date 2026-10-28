import { API_URL, apiFetch, readApiError } from '@/lib/api'

export const CommentService = {
  async getComments(owner: string, repo: string, issueNumber: string | number, token: string, page = 1, limit = 10) {
    const res = await apiFetch(`${API_URL}/issues/${owner}/${repo}/${issueNumber}/comments?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to fetch comments')
    return res.json()
  },

  async createComment(owner: string, repo: string, issueNumber: string | number, data: { body: string }, token: string) {
    const res = await apiFetch(`${API_URL}/issues/${owner}/${repo}/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw await readApiError(res, 'Failed to add comment')
    return res.json()
  },

  async deleteComment(owner: string, repo: string, commentId: string | number, token: string) {
    const res = await apiFetch(`${API_URL}/issues/${owner}/${repo}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw await readApiError(res, 'Failed to delete comment')
    return res.json()
  },

  // Toggles one of the caller's reactions on a comment; resolves to whether it was added
  async toggleReaction(owner: string, repo: string, commentId: string | number, content: string, token: string): Promise<boolean> {
    const res = await apiFetch(`${API_URL}/issues/${owner}/${repo}/comments/${commentId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content })
    })
    if (!res.ok) throw await readApiError(res, 'Failed to react')
    const body = await res.json()
    return body.data?.toggled === 'added'
  }
}
