"use client";

import React from "react";
import { Search, Globe } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface SearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function SearchHeader({ searchQuery, setSearchQuery }: SearchHeaderProps) {
  return (
    <PageHeader 
      title="Search Repositories" 
      description="Explore and discover public repositories from GitHub."
      icon={<Globe className="w-5 h-5" />}
    >
      {/* Minimal Search Input Box */}
      <div className="relative w-full max-w-xl group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-emerald-400 transition-colors">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search repositories, languages, descriptions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-12 py-3 rounded-2xl border border-white/[0.05] focus:border-emerald-500/20 shadow-lg text-sm placeholder:text-neutral-600 transition-all duration-200 bg-neutral-950/40 text-white outline-none focus:ring-2 focus:ring-emerald-500/5"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-4 flex items-center text-neutral-500 hover:text-white text-xs transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </PageHeader>
  );
}
