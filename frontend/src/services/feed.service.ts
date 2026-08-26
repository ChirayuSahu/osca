import { FeedResponse } from '../types/feed'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const FeedService = {
  async getFeed(token: string, page = 1, limit = 20): Promise<FeedResponse> {
    const res = await fetch(`${API_URL}/feed?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (!res.ok) {
      throw new Error('Failed to fetch feed')
    }
    
    return res.json()
  }
}
