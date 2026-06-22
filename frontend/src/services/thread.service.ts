const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const ThreadService = {
  async createThread(data: { repositoryId: string; title: string; content: string }, token: string) {
    const res = await fetch(`${API_URL}/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Failed to create thread')
    return res.json()
  },

  async getThread(id: string, token: string) {
    const res = await fetch(`${API_URL}/threads/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch thread')
    return res.json()
  }
}
