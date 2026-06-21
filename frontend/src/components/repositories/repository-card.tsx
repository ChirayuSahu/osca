"use client";

import React from "react";
import { Star, GitFork, ArrowRight, ExternalLink } from "lucide-react";

export interface Repository {
  id: number;
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  languageColor: string;
  matchScore: number;
  issuesCount: number;
}

interface RepositoryCardProps {
  repo: Repository;
}

export function RepositoryCard({ repo }: RepositoryCardProps) {
  return (
    <div className="relative overflow-hidden bg-neutral-950/30 border border-white/[0.04] hover:border-emerald-500/20 transition-all duration-300 flex flex-col justify-between group p-6 rounded-[24px]">
      {/* Hover Gradient Edge Highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/0 group-hover:via-emerald-500/20 to-transparent transition-all duration-500" />
      
      {/* Subtle Radial Card Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.02] rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="font-normal text-neutral-200 group-hover:text-white text-base md:text-lg flex items-center gap-1.5 transition-colors">
            {repo.name}
            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-emerald-400 transition-all" />
          </div>
          
          {/* Glowing Match Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/[0.06] border border-emerald-500/10 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-400 tracking-wide">
              {repo.matchScore}% Match
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-neutral-400 text-sm font-light leading-relaxed line-clamp-2 min-h-[40px]">
          {repo.description}
        </p>
      </div>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between pt-6 border-t border-white/[0.03] mt-6">
        <div className="flex items-center gap-4 text-xs text-neutral-500 font-light">
          {/* Language */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${repo.languageColor}`} />
            {repo.language}
          </div>
          {/* Stars */}
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-neutral-500" />
            {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
          </div>
          {/* Forks */}
          <div className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5 text-neutral-500" />
            {repo.forks >= 1000 ? `${(repo.forks / 1000).toFixed(1)}k` : repo.forks}
          </div>
        </div>

        <a 
          href={`/dashboard/repository/${repo.id}`}
          className="text-xs font-normal text-neutral-400 hover:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-all duration-200"
        >
          View Issues
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
