const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

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
    if (!res.ok) throw new Error('Failed to start repository analysis')
    return res.json()
  },

  async getRepository(id: string, token: string) {
    const res = await fetch(`${API_URL}/repositories/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch repository')
    return res.json()
  },

  async getRepositoryThreads(id: string, token: string, page = 1) {
    const res = await fetch(`${API_URL}/repositories/${id}/threads?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch threads')
    return res.json()
  }
}
