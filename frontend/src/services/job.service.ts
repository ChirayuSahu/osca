const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const JobService = {
  async getJob(queueName: string, id: string, token: string) {
    const res = await fetch(`${API_URL}/jobs/${queueName}/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch job status')
    return res.json()
  }
}
