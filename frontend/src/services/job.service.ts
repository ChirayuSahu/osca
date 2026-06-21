const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const JobService = {
  async getJob(id: string, token: string) {
    const res = await fetch(`${API_URL}/jobs/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch job status')
    return res.json()
  }
}
