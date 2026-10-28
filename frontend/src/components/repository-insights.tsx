import React from 'react'
import { Eyebrow, LanguageDot, Meter, Tag } from '@/components/repo-ui'

interface RepositoryInsightsProps {
  repo: {
    languages?: Record<string, number>;
    frameworks?: string[];
    ciCd?: string[];
    [key: string]: unknown;
  }
}

// Language breakdown, frameworks and CI detected for the repository.
export function RepositoryInsights({ repo }: RepositoryInsightsProps) {
  const languages = repo.languages && typeof repo.languages === 'object' ? repo.languages : {}
  const hasLanguages = Object.keys(languages).length > 0
  const hasFrameworks = Array.isArray(repo.frameworks) && repo.frameworks.length > 0
  const hasCi = Array.isArray(repo.ciCd) && repo.ciCd.length > 0

  if (!hasLanguages && !hasFrameworks && !hasCi) {
    return null
  }

  const total = Object.values(languages).reduce((acc, val) => acc + (Number(val) || 0), 0)
  const rows = Object.entries(languages)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 5)
    .map(([name, bytes]) => ({ name, pct: total > 0 ? ((Number(bytes) || 0) / total) * 100 : 0 }))

  return (
    <div className="flex flex-col gap-6 rounded-md border border-border bg-card p-5">
      {hasLanguages && (
        <section>
          <Eyebrow>Languages</Eyebrow>
          <div className="mt-4 space-y-3.5">
            {rows.map(({ name, pct }) => (
              <div key={name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <LanguageDot language={name} className="min-w-0 truncate font-medium" />
                  <span className="shrink-0 tabular-nums text-muted-foreground">{pct.toFixed(1)}%</span>
                </div>
                <Meter value={pct} />
              </div>
            ))}
          </div>
        </section>
      )}

      {hasFrameworks && (
        <section>
          <Eyebrow>Frameworks</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {repo.frameworks!.map((fw) => <Tag key={fw}>{fw}</Tag>)}
          </div>
        </section>
      )}

      {hasCi && (
        <section>
          <Eyebrow>CI / CD</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {repo.ciCd!.map((ci) => <Tag key={ci}>{ci}</Tag>)}
          </div>
        </section>
      )}
    </div>
  )
}
