"use client";

import React from "react";
import { UserPlus, Code2, MapPin, Link2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Contributor {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  role: string;
  location?: string;
  skills: string[];
  matchScore: number;
}

interface ContributorCardProps {
  contributor: Contributor;
}

export function ContributorCard({ contributor }: ContributorCardProps) {
  return (
    <div className="bg-[#121212] border border-[#333333] hover:border-[#62BE8B]/50 transition-colors duration-300 rounded-[24px] p-6 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12 border-2 border-white/[0.05]">
            <AvatarImage src={contributor.avatarUrl} alt={contributor.name} />
            <AvatarFallback className="bg-neutral-800 text-neutral-400">
              {contributor.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-medium text-white group-hover:text-emerald-400 transition-colors">
              {contributor.name}
            </h3>
            <p className="text-sm text-neutral-400 font-light">@{contributor.username}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#00843C]/[0.06] border border-[#00843C]/10 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#62BE8B] animate-pulse" />
          <span className="text-[12px] font-medium text-[#62BE8B]">
            {contributor.matchScore}% Match
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-neutral-300 font-light">
          <Code2 className="w-4 h-4 text-neutral-500" />
          {contributor.role}
        </div>
        {contributor.location && (
          <div className="flex items-center gap-2 text-sm text-neutral-400 font-light">
            <MapPin className="w-4 h-4 text-neutral-500" />
            {contributor.location}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {contributor.skills.map(skill => (
          <span key={skill} className="px-2 py-1 text-xs font-medium bg-white/[0.03] border border-white/[0.05] rounded-md text-neutral-300">
            {skill}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.04]">
        <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" /> Connect
        </button>
        <button className="p-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all">
          <Link2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
