"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { SearchHeader } from "@/components/repositories/search-header";
import { RepositoryCard, Repository } from "@/components/repositories/repository-card";
import { RepositoryFilters } from "@/components/repositories/repository-filters";
import { RepositoryDetailsPopover } from "@/components/repositories/repository-details-popover";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Checkbox,
} from "@/components/ui";

interface ExtendedRepository extends Repository {
  ownerType: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function RepositoriesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  
  const queryParam = searchParams.get("q") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const includeOrgParam = searchParams.get("includeOrg") === "true";
  
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [activePage, setActivePage] = useState(pageParam);
  const [includeOrg, setIncludeOrg] = useState(includeOrgParam);
  const [repos, setRepos] = useState<ExtendedRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New states for Hub Module features
  const [activeTab, setActiveTab] = useState("recommended");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<ExtendedRepository | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 1
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  // Sync state with URL when URL changes externally
  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setActivePage(pageParam);
  }, [pageParam]);

  useEffect(() => {
    setIncludeOrg(includeOrgParam);
  }, [includeOrgParam]);

  // Debounced search sync to URL
  useEffect(() => {
    if (searchQuery.trim() === queryParam.trim()) return;

    const handler = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      } else {
        params.delete("q");
      }
      params.set("page", "1");
      router.push(`/dashboard/repositories?${params.toString()}`);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, queryParam, router]);

  // Fetch GitHub repos from backend
  useEffect(() => {
    async function fetchRepos() {
      if (!token) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(
          `${API_URL}/repositories/github?page=${activePage}&limit=8&q=${encodeURIComponent(queryParam)}&includeOrg=${includeOrg}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const mappedRepos: ExtendedRepository[] = data.data.map((repo: {
              id: number;
              full_name: string;
              description: string | null;
              stargazers_count: number;
              forks_count: number;
              language: string | null;
              open_issues_count: number;
              owner?: { type: string };
            }, index: number) => {
              const lang = repo.language || "TypeScript";
              
              // Map language to color
              let langColor = "bg-neutral-500";
              if (lang === "TypeScript") langColor = "bg-blue-500";
              else if (lang === "JavaScript") langColor = "bg-yellow-500";
              else if (lang === "Python") langColor = "bg-blue-700";
              else if (lang === "Go") langColor = "bg-cyan-500";
              else if (lang === "Rust") langColor = "bg-orange-600";
              else if (lang === "HTML") langColor = "bg-red-500";
              else if (lang === "CSS") langColor = "bg-purple-500";

              return {
                id: repo.id,
                name: repo.full_name,
                description: repo.description || "No description provided.",
                stars: repo.stargazers_count || 0,
                forks: repo.forks_count || 0,
                language: lang,
                languageColor: langColor,
                matchScore: 0, // Backend logic coming soon
                issuesCount: repo.open_issues_count || 0,
                ownerType: repo.owner?.type || "User"
              };
            });
            setRepos(mappedRepos);
            
            if (data.pagination) {
              setPagination(data.pagination);
            }
          } else {
            setError("Failed to parse repository list.");
          }
        } else {
          setError("Failed to load GitHub repositories.");
        }
      } catch (err) {
        console.error("Error fetching repositories:", err);
        setError("An error occurred while loading repositories.");
      } finally {
        setLoading(false);
      }
    }

    fetchRepos();
  }, [token, activePage, includeOrg, queryParam, API_URL]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard/repositories?${params.toString()}`);
  };

  const handleIncludeOrgChange = (checked: boolean) => {
    setIncludeOrg(checked);
    const params = new URLSearchParams(searchParams.toString());
    params.set("includeOrg", checked.toString());
    params.set("page", "1");
    router.push(`/dashboard/repositories?${params.toString()}`);
  };

  const getPageNumbers = () => {
    const pages = [];
    const { page, totalPages } = pagination;
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      if (start > 2) {
        pages.push("ellipsis-start");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("ellipsis-end");
      }

      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col select-none relative space-y-8 pb-12">
      {/* Search Header component */}
      <SearchHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* GitHub Repository Cards List */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/[0.04] pb-4 sticky top-0 bg-black/80 backdrop-blur-md z-10 gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveTab("recommended")}
                className={`text-sm font-medium pb-1 transition-colors ${activeTab === "recommended" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-neutral-400 hover:text-white"}`}
              >
                Recommended
              </button>
              <button 
                onClick={() => setActiveTab("trending")}
                className={`text-sm font-medium pb-1 transition-colors ${activeTab === "trending" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-neutral-400 hover:text-white"}`}
              >
                Trending
              </button>
            </div>
            {/* Include Org checkbox */}
            <div className="hidden md:flex items-center gap-2">
              <label className="flex items-center gap-2.5 text-xs text-neutral-400 font-light hover:text-white cursor-pointer select-none">
                <Checkbox
                  checked={includeOrg}
                  onCheckedChange={handleIncludeOrgChange}
                />
                Include Organizations
              </label>
            </div>
          </div>

          <button 
            onClick={() => setIsFiltersOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.04] bg-neutral-950/40 hover:bg-white/[0.02] hover:text-white text-neutral-400 text-xs transition-all duration-200"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 border border-dashed border-red-500/20 rounded-3xl bg-red-950/5">
            <p className="text-red-400 text-sm font-light">{error}</p>
          </div>
        ) : repos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {repos.map((repo) => (
              <RepositoryCard 
                key={repo.id} 
                repo={repo} 
                onClick={(r) => {
                  setSelectedRepo(r as ExtendedRepository);
                  setIsPopoverOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-white/[0.04] rounded-3xl bg-neutral-950/20">
            <p className="text-neutral-400 text-sm font-light">No repositories found matching your query.</p>
          </div>
        )}
      </div>

      {/* Premium Shadcn Pagination Control */}
      {!loading && !error && pagination.totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              />
            </PaginationItem>
            
            {getPageNumbers().map((pageNumber, idx) => (
              <PaginationItem key={idx}>
                {pageNumber === "ellipsis-start" || pageNumber === "ellipsis-end" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    isActive={pagination.page === pageNumber}
                    onClick={() => handlePageChange(pageNumber as number)}
                  >
                    {pageNumber}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Hub Module Dialogs */}
      <RepositoryFilters 
        isOpen={isFiltersOpen} 
        onClose={() => setIsFiltersOpen(false)} 
        onApply={(filters) => {
          console.log("Applied filters:", filters);
          // In a real app, we'd update URL search params and fetch new data
        }} 
      />
      
      <RepositoryDetailsPopover 
        isOpen={isPopoverOpen} 
        onClose={() => setIsPopoverOpen(false)} 
        repo={selectedRepo} 
      />
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
