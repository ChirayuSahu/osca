const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const CommentService = {
  async getComments(owner: string, repo: string, issueNumber: string | number, token: string, page = 1) {
    const res = await fetch(`${API_URL}/issues/${owner}/${repo}/${issueNumber}/comments?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch comments')
    return res.json()
  },

  async createComment(owner: string, repo: string, issueNumber: string | number, data: { body: string }, token: string) {
    const res = await fetch(`${API_URL}/issues/${owner}/${repo}/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Failed to add comment')
    return res.json()
  },

  async deleteComment(owner: string, repo: string, commentId: string | number, token: string) {
    const res = await fetch(`${API_URL}/issues/${owner}/${repo}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to delete comment')
    return res.json()
  }
}
