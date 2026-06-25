import React from 'react'
import { Code2, Server } from 'lucide-react'

interface RepositoryInsightsProps {
  repo: any
}

export function RepositoryInsights({ repo }: RepositoryInsightsProps) {
  if (!repo.languages && !repo.frameworks?.length && !repo.ciCd?.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      {repo.languages && Object.keys(repo.languages).length > 0 && (
        <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800/60 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-medium text-neutral-200 mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-500" />
            Languages Breakdown
          </h3>
          <div className="space-y-4">
            {Object.entries(repo.languages)
              .sort(([, a]: any, [, b]: any) => b - a)
              .slice(0, 5) // top 5
              .map(([lang, bytes]: any) => {
                const total: number = Object.values(repo.languages).reduce((acc: any, val: any) => acc + val, 0) as number;
                const percent = ((bytes / total) * 100).toFixed(1);
                return (
                  <div key={lang}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-neutral-300 font-medium">{lang}</span>
                      <span className="text-neutral-500">{percent}%</span>
                    </div>
                    <div className="w-full bg-neutral-800/80 rounded-full h-2 overflow-hidden border border-neutral-700/30">
                      <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {(repo.ciCd?.length > 0 || repo.frameworks?.length > 0) && (
        <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800/60 rounded-2xl p-6 shadow-xl flex flex-col justify-start">
          <h3 className="text-lg font-medium text-neutral-200 mb-6 flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-500" />
            Architecture & CI/CD
          </h3>
          
          <div className="space-y-6">
            {repo.frameworks?.length > 0 && (
              <div>
                <span className="text-sm font-medium text-neutral-500 block mb-3 uppercase tracking-wider">Detected Frameworks</span>
                <div className="flex flex-wrap gap-2.5">
                  {repo.frameworks.map((fw: string) => (
                    <span key={fw} className="px-3.5 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg text-sm font-medium border border-neutral-700/50 shadow-sm">
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {repo.ciCd?.length > 0 && (
              <div>
                <span className="text-sm font-medium text-neutral-500 block mb-3 uppercase tracking-wider">CI/CD Pipelines</span>
                <div className="flex flex-wrap gap-2.5">
                  {repo.ciCd.map((ci: string) => (
                    <span key={ci} className="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-medium border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                      {ci}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
