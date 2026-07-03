"use client";

import React from "react";
import { Users, ArrowRight, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Collaboration {
  id: string;
  repoName: string;
  repoOwner: string;
  title: string;
  description: string;
  requestedRoles: string[];
  activeContributors: number;
  timeAgo: string;
  ownerAvatarUrl?: string;
}

interface CollaborationCardProps {
  collaboration: Collaboration;
}

export function CollaborationCard({ collaboration }: CollaborationCardProps) {
  return (
    <div className="bg-[#0A0A0A] border border-[#222222] hover:border-emerald-500/30 transition-all duration-300 rounded-[28px] p-7 group relative overflow-hidden">
      {/* Subtle background flair */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors" />

      <div className="flex items-center gap-3 mb-5">
        <Avatar className="w-8 h-8 border border-white/10">
          <AvatarImage src={collaboration.ownerAvatarUrl} alt={collaboration.repoOwner} />
          <AvatarFallback className="bg-neutral-800 text-xs text-neutral-400">
            {collaboration.repoOwner.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm font-medium text-neutral-400">
          {collaboration.repoOwner} <span className="text-neutral-600">/</span> <span className="text-neutral-200">{collaboration.repoName}</span>
        </div>
      </div>

      <h3 className="text-xl font-medium text-white mb-2 leading-snug group-hover:text-emerald-400 transition-colors">
        {collaboration.title}
      </h3>
      
      <p className="text-neutral-400 text-sm font-light leading-relaxed line-clamp-2 mb-6">
        {collaboration.description}
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Seeking</span>
          <div className="flex flex-wrap gap-2">
            {collaboration.requestedRoles.map(role => (
              <span key={role} className="px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                {role}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-white/[0.04]">
          <div className="flex items-center gap-4 text-xs text-neutral-500 font-light">
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {collaboration.activeContributors} Active</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {collaboration.timeAgo}</span>
          </div>

          <button className="text-sm text-neutral-300 hover:text-white font-medium flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
            View Details <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
