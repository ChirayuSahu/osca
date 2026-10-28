import { API_URL, apiFetch } from '@/lib/api'

export const JobService = {
  async getJob(queueName: string, id: string, token: string) {
    const res = await apiFetch(`${API_URL}/jobs/${queueName}/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch job status')
    return res.json()
  }
}
