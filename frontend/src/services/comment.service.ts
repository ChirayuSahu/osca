const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const CommentService = {
  async getComments(threadId: string, token: string, page = 1) {
    const res = await fetch(`${API_URL}/comments?threadId=${threadId}&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch comments')
    return res.json()
  },

  async createComment(data: { threadId: string; content: string; parentId?: string }, token: string) {
    const res = await fetch(`${API_URL}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Failed to add comment')
    return res.json()
  }
}
