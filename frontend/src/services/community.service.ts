import { API_URL, readApiError } from '@/lib/api'

export interface CommunityContributor {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  topSkills: string[]
  sharedSkills: string[]
  sharedRepos: number
  matchScore: number
}

export interface CollaborationOpportunity {
  repositoryId: string
  fullName: string
  owner: string
  name: string
  description: string | null
  stack: string[]
  peers: number
  goodFirstIssueCount: number
  pushedAt: string | null
}

const get = async <T>(path: string, token: string, fallback: string): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw await readApiError(res, fallback)
  return (await res.json()).data ?? []
}

export const CommunityService = {
  listContributors: (token: string) =>
    get<CommunityContributor[]>('/community/contributors', token, 'Failed to load contributors'),
  listCollaborations: (token: string) =>
    get<CollaborationOpportunity[]>('/community/collaborations', token, 'Failed to load collaboration opportunities')
}
