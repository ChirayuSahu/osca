"use client";

import React, { useState } from "react";
import { Star, GitFork, ArrowRight, ExternalLink, Download, Loader2 } from "lucide-react";

export interface Repository {
  id: number | string;
  name: string;
  description: string;
  stars: number;
  forks: number;
  language?: string;
  languageColor?: string;
  matchScore?: number;
  issuesCount?: number;
  url?: string;
}

interface RepositoryCardProps {
  repo: Repository;
  mode?: "import" | "view";
  onAction?: (repo: Repository) => void | Promise<void>;
  onDelete?: (repo: Repository) => void | Promise<void>;
}

export function RepositoryCard({ repo, mode = "view", onAction, onDelete }: RepositoryCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAction) {
      setIsLoading(true);
      try {
        await onAction(repo);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const isImportMode = mode === "import";

  return (
    <div className="relative overflow-hidden bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 hover:border-emerald-500/30 transition-all duration-300 flex flex-col justify-between group p-6 rounded-2xl shadow-xl hover:shadow-emerald-900/20">
      {/* Hover Gradient Edge Highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/0 group-hover:via-emerald-500/40 to-transparent transition-all duration-500" />
      
      {/* Subtle Radial Card Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.03] rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <a href={repo.url || `https://github.com/${repo.name}`} target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-200 group-hover:text-emerald-400 text-lg flex items-start gap-2 transition-colors pr-2 break-all" title={repo.name}>
            {repo.name}
            <ExternalLink className="w-4 h-4 mt-1 opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-emerald-400 transition-all flex-shrink-0" />
          </a>
          
          {/* Glowing Match Badge */}
          {repo.matchScore !== undefined && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-full whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-400 tracking-wide">
                {repo.matchScore}% Match
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-neutral-400 text-sm font-light leading-relaxed line-clamp-2 min-h-[40px]">
          {repo.description || "No description provided."}
        </p>
      </div>

      {/* Footer Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-y-4 pt-5 border-t border-neutral-800 mt-5">
        <div className="flex items-center gap-4 text-xs text-neutral-400 font-light">
          {/* Language */}
          {repo.language && (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${repo.languageColor || 'bg-blue-400'}`} />
              {repo.language}
            </div>
          )}
          {/* Stars */}
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-neutral-500" />
            {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
          </div>
          {/* Forks */}
          <div className="flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-neutral-500" />
            {repo.forks >= 1000 ? `${(repo.forks / 1000).toFixed(1)}k` : repo.forks}
          </div>
        </div>

        {isImportMode ? (
          <button
            onClick={handleAction}
            disabled={isLoading}
            className="text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-neutral-950 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed z-10 relative"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isLoading ? "Importing..." : "Import Repo"}
          </button>
        ) : (
          <div className="flex items-center gap-4">
            {onDelete && (
              <button
                onClick={(e) => { e.preventDefault(); onDelete(repo); }}
                className="text-xs font-medium text-red-400 hover:text-red-300 flex items-center gap-1 transition-all duration-300 z-10 relative"
              >
                Remove
              </button>
            )}
            <a 
              href={`/dashboard/repository/${repo.id}`}
              className="text-xs font-medium text-neutral-300 hover:text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-all duration-300 z-10 relative"
            >
              View Issues
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
