import { API_URL, readApiError } from '@/lib/api'

export type ExperienceLevel = 'first' | 'some' | 'experienced'
export type FeedView = 'grid' | 'focus'

/** The settings you can change on the Settings page (all on your own user record) */
export interface UserSettings {
  communityHidden: boolean
  profileShowScores: boolean
  profileShowCalendar: boolean
  experienceLevel: ExperienceLevel
  preferredLanguages: string[]
  excludedLanguages: string[]
  feedView: FeedView
  interestAreas: string[]
  onboardedAt: string | null
}

/** Settings plus `onboarded: true`, which marks onboarding as finished */
export type SettingsPatch = Partial<Omit<UserSettings, 'onboardedAt'>> & { onboarded?: boolean }

export interface HiddenRepository {
  id: string
  owner: string
  name: string
  description: string | null
  primaryLanguage: string | null
  stars: number
  hiddenAt: string
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

/** A public PR you opened; `attributed` when OSCA showed you the repo or issue first */
export interface Contribution {
  id: string
  prUrl: string
  prNumber: number
  title: string
  repoFullName: string
  repositoryId: string | null
  state: 'open' | 'merged' | 'closed'
  attributed: boolean
  surface: string | null
  openedAt: string
  mergedAt: string | null
}

export interface ContributionSummary {
  contributions: Contribution[]
  totals: { viaOsca: number; mergedViaOsca: number }
}

export const UserService = {
  async getSettings(userId: string, token: string): Promise<UserSettings> {
    const res = await fetch(`${API_URL}/users/${userId}`, { headers: authHeaders(token) })
    if (!res.ok) throw await readApiError(res, 'Failed to load your settings')
    return (await res.json()).data
  },

  async updateSettings(userId: string, patch: SettingsPatch, token: string): Promise<UserSettings> {
    const res = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(patch)
    })
    if (!res.ok) throw await readApiError(res, 'Failed to save your settings')
    return (await res.json()).data
  },

  async getContributions(userId: string, token: string): Promise<ContributionSummary> {
    const res = await fetch(`${API_URL}/users/${userId}/contributions`, { headers: authHeaders(token) })
    if (!res.ok) throw await readApiError(res, 'Failed to load contributions')
    return (await res.json()).data
  },

  async listHiddenRepositories(userId: string, token: string): Promise<HiddenRepository[]> {
    const res = await fetch(`${API_URL}/users/${userId}/not-interested`, { headers: authHeaders(token) })
    if (!res.ok) throw await readApiError(res, 'Failed to load hidden repositories')
    return (await res.json()).data
  },

  async deleteAccount(userId: string, token: string): Promise<void> {
    const res = await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE', headers: authHeaders(token) })
    if (!res.ok) throw await readApiError(res, 'Failed to delete your account')
  }
}
