"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import { SearchHeader } from "@/components/repositories/search-header";
import { RepositoryCard } from "@/components/repositories/repository-card";

// Mock repositories list for demo
const MOCK_REPOSITORIES = [
  {
    id: 1,
    name: "facebook/react",
    description: "The library for web and native user interfaces.",
    stars: 224000,
    forks: 46200,
    language: "JavaScript",
    languageColor: "bg-yellow-500",
    matchScore: 98,
    issuesCount: 14,
  },
  {
    id: 2,
    name: "vercel/next.js",
    description: "The React Framework for the Web.",
    stars: 121000,
    forks: 26800,
    language: "TypeScript",
    languageColor: "bg-blue-500",
    matchScore: 95,
    issuesCount: 8,
  },
  {
    id: 3,
    name: "tailwindlabs/tailwindcss",
    description: "A utility-first CSS framework for rapid UI development.",
    stars: 83500,
    forks: 4100,
    language: "TypeScript",
    languageColor: "bg-blue-500",
    matchScore: 91,
    issuesCount: 5,
  },
  {
    id: 4,
    name: "shadcn/ui",
    description: "Beautifully designed components that you can copy and paste into your apps.",
    stars: 71000,
    forks: 5300,
    language: "TypeScript",
    languageColor: "bg-blue-500",
    matchScore: 88,
    issuesCount: 12,
  },
  {
    id: 5,
    name: "nodejs/node",
    description: "Node.js JavaScript runtime ✨🐢🚀",
    stars: 104000,
    forks: 29000,
    language: "JavaScript",
    languageColor: "bg-yellow-500",
    matchScore: 84,
    issuesCount: 22,
  },
  {
    id: 6,
    name: "rust-lang/rust",
    description: "Empowering everyone to build reliable and efficient software.",
    stars: 97000,
    forks: 12500,
    language: "Rust",
    languageColor: "bg-orange-600",
    matchScore: 78,
    issuesCount: 45,
  },
  {
    id: 7,
    name: "golang/go",
    description: "The Go programming language codebase.",
    stars: 122000,
    forks: 16900,
    language: "Go",
    languageColor: "bg-cyan-500",
    matchScore: 75,
    issuesCount: 38,
  },
  {
    id: 8,
    name: "denoland/deno",
    description: "A modern, secure runtime for JavaScript and TypeScript.",
    stars: 93000,
    forks: 5100,
    language: "TypeScript",
    languageColor: "bg-blue-500",
    matchScore: 74,
    issuesCount: 18,
  },
  {
    id: 9,
    name: "kubernetes/kubernetes",
    description: "Production-Grade Container Scheduling and Management.",
    stars: 108000,
    forks: 39000,
    language: "Go",
    languageColor: "bg-cyan-500",
    matchScore: 70,
    issuesCount: 52,
  },
  {
    id: 10,
    name: "python/cpython",
    description: "The Python programming language implementation.",
    stars: 62000,
    forks: 28500,
    language: "Python",
    languageColor: "bg-blue-700",
    matchScore: 68,
    issuesCount: 30,
  },
  {
    id: 11,
    name: "django/django",
    description: "The Web framework for perfectionists with deadlines.",
    stars: 78000,
    forks: 31000,
    language: "Python",
    languageColor: "bg-blue-700",
    matchScore: 65,
    issuesCount: 25,
  },
  {
    id: 12,
    name: "mrdoob/three.js",
    description: "JavaScript 3D Library.",
    stars: 102000,
    forks: 35000,
    language: "JavaScript",
    languageColor: "bg-yellow-500",
    matchScore: 62,
    issuesCount: 15,
  }
];

function RepositoriesContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(queryParam);

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  const filteredRepos = MOCK_REPOSITORIES.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl w-full mx-auto h-full flex flex-col select-none relative overflow-hidden">
      {/* Search Header component */}
      <SearchHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* GitHub Repository Cards List (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6 pr-2 scrollbar-thin scrollbar-thumb-white/[0.05]">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 sticky top-0 bg-black/80 backdrop-blur-md z-10">
          <div className="space-y-1">
            <h2 className="text-lg font-normal text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Personalized Recommendations
            </h2>
            <p className="text-xs text-neutral-400 font-light">Matched against your profile</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.04] bg-neutral-950/40 hover:bg-white/[0.02] hover:text-white text-neutral-400 text-xs transition-all duration-200">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>

        {filteredRepos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRepos.map((repo) => (
              <RepositoryCard key={repo.id} repo={repo} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-white/[0.04] rounded-3xl bg-neutral-950/20">
            <p className="text-neutral-400 text-sm font-light">No repositories found matching your query.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RepositoriesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <RepositoriesContent />
    </Suspense>
  );
}
