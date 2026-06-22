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
    <div className="relative overflow-hidden bg-[#121212] border border-[#444444] hover:border-[#62BE8B]/50 transition-all duration-300 flex flex-col justify-between group p-8 rounded-[28px]">
      {/* Hover Gradient Edge Highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00843C]/0 group-hover:via-[#00843C]/20 to-transparent transition-all duration-500" />
      
      {/* Subtle Radial Card Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#00843C]/[0.02] rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="font-normal text-[#D9D9D9] group-hover:text-[#FFFFFF] text-lg md:text-xl flex items-center gap-1.5 transition-colors" title={repo.name}>
            {repo.name.length > 20 ? `${repo.name.slice(0, 19)}...` : repo.name}
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 text-[#D9D9D9]/50 hover:text-[#62BE8B] transition-all flex-shrink-0" />
          </div>
          
          {/* Glowing Match Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#00843C]/[0.06] border border-[#00843C]/10 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#62BE8B] animate-pulse" />
            <span className="text-[12px] font-medium text-[#62BE8B] tracking-wide">
              {repo.matchScore}% Match
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-[#D9D9D9] text-base font-light leading-relaxed line-clamp-2 min-h-[48px]">
          {repo.description}
        </p>
      </div>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between pt-7 border-t border-[#444444] mt-7">
        <div className="flex items-center gap-5 text-[13px] text-[#D9D9D9] font-light">
          {/* Language */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${repo.languageColor}`} />
            {repo.language}
          </div>
          {/* Stars */}
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-[#D9D9D9]" />
            {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
          </div>
          {/* Forks */}
          <div className="flex items-center gap-1">
            <GitFork className="w-4 h-4 text-[#D9D9D9]" />
            {repo.forks >= 1000 ? `${(repo.forks / 1000).toFixed(1)}k` : repo.forks}
          </div>
        </div>

        <a 
          href={`/dashboard/repository/${repo.id}`}
          className="text-[13px] font-normal text-[#D9D9D9] hover:text-[#62BE8B] flex items-center gap-1 group-hover:translate-x-0.5 transition-all duration-200"
        >
          View Issues
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
