"use client";

import React, { useState } from "react";
import { Users, Globe2, Sparkles, Filter } from "lucide-react";
import { ContributorCard } from "@/components/community/contributor-card";
import { CollaborationCard } from "@/components/community/collaboration-card";

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

// Backend integration coming soon
const MOCK_CONTRIBUTORS: Contributor[] = [];
const MOCK_COLLABORATIONS: Collaboration[] = [];

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<"contributors" | "collaborations">("contributors");

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col select-none relative space-y-8 pb-12 pt-4">
      
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
          <Globe2 className="w-8 h-8 text-emerald-400" />
          Connection Hub
        </h1>
        <p className="text-neutral-400 text-sm font-light">
          Discover other contributors, find collaboration opportunities, and build your open-source network.
        </p>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-4 sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab("contributors")}
            className={`flex items-center gap-2 text-sm font-medium pb-1 transition-colors ${activeTab === "contributors" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-neutral-400 hover:text-white"}`}
          >
            <Users className="w-4 h-4" /> Discover Contributors
          </button>
          <button 
            onClick={() => setActiveTab("collaborations")}
            className={`flex items-center gap-2 text-sm font-medium pb-1 transition-colors ${activeTab === "collaborations" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-neutral-400 hover:text-white"}`}
          >
            <Sparkles className="w-4 h-4" /> Collaboration Opportunities
          </button>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.04] bg-neutral-950/40 hover:bg-white/[0.02] hover:text-white text-neutral-400 text-xs transition-all duration-200">
          <Filter className="w-3.5 h-3.5" />
          Filter Network
        </button>
      </div>

      {/* Content Grids */}
      {activeTab === "contributors" && (
        MOCK_CONTRIBUTORS.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {MOCK_CONTRIBUTORS.map(contributor => (
              <ContributorCard key={contributor.id} contributor={contributor} />
            ))}
          </div>
        ) : (
          <div className="w-full h-24"></div>
        )
      )}

      {activeTab === "collaborations" && (
        MOCK_COLLABORATIONS.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {MOCK_COLLABORATIONS.map(collab => (
              <CollaborationCard key={collab.id} collaboration={collab} />
            ))}
          </div>
        ) : (
          <div className="w-full h-24"></div>
        )
      )}

    </div>
  );
}
