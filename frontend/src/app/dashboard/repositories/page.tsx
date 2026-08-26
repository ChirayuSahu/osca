"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal, Globe, BookMarked } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { SearchHeader } from "@/components/repositories/search-header";
import { RepositoryCard, Repository } from "@/components/repositories/repository-card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Checkbox
} from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";

interface ExtendedRepository extends Repository {
  ownerType?: string;
}

interface GitHubRepo {
  id: string | number;
  full_name: string;
  name?: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  html_url: string;
  owner?: { type: string };
}

interface ImportedRepo {
  id: string;
  url?: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function GitHubReposContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();

  const queryParam = searchParams.get("q") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const includeOrgParam = searchParams.get("includeOrg") === "true";

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [repos, setRepos] = useState<ExtendedRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 8, total: 0, totalPages: 1 });
  const [includeOrg, setIncludeOrg] = useState(includeOrgParam);
  const [importedUrls, setImportedUrls] = useState<Record<string, string>>({});

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "already_imported" | null;
    message?: string;
    internalId?: string;
  }>({ isOpen: false, type: null });

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
      router.push(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, queryParam, router, pathname]);

  useEffect(() => { setIncludeOrg(includeOrgParam); }, [includeOrgParam]);

  const fetchRepos = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${API_URL}/repositories/github?page=${pageParam}&limit=8&q=${encodeURIComponent(queryParam)}&includeOrg=${includeOrg}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const mappedRepos = data.data.map((repo: GitHubRepo, index: number) => {
            const lang = repo.language || "TypeScript";
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
              description: repo.description || "",
              stars: repo.stargazers_count || 0,
              forks: repo.forks_count || 0,
              language: lang,
              languageColor: langColor,
              matchScore: 95 - (index % 5) * 3,
              issuesCount: repo.open_issues_count || 0,
              ownerType: repo.owner?.type || "User",
              url: repo.html_url
            };
          });
          setRepos(mappedRepos);
          if (data.pagination) setPagination(data.pagination);
        } else {
          setError("Failed to parse repository list.");
        }
      } else {
        setError("Failed to load GitHub repositories.");
      }

      // Also fetch imported repositories to check if they are already imported
      try {
        const importedRes = await fetch(`${API_URL}/repositories?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
        if (importedRes.ok) {
          const importedData = await importedRes.json();
          if (importedData.success && Array.isArray(importedData.data)) {
            const urlMap: Record<string, string> = {};
            importedData.data.forEach((r: ImportedRepo) => {
              if (r.url) urlMap[r.url.toLowerCase()] = r.id;
            });
            setImportedUrls(urlMap);
          }
        }
      } catch {
        // Silent fail for imported repos fetch
      }
    } catch (err) {
      console.error("Error fetching repositories:", err);
      setError("An error occurred while loading repositories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pageParam, includeOrg, queryParam]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleIncludeOrgChange = (checked: boolean) => {
    setIncludeOrg(checked);
    const params = new URLSearchParams(searchParams.toString());
    params.set("includeOrg", checked.toString());
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleImport = async (repo: Repository) => {
    const targetUrl = repo.url || `https://github.com/${repo.name}`;
    if (importedUrls[targetUrl.toLowerCase()]) {
      const internalId = importedUrls[targetUrl.toLowerCase()];
      setDialogState({
        isOpen: true,
        type: "already_imported",
        internalId,
        message: "This repository has already been imported into OSCA."
      });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/repositories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();
      if (!data.success) {
        setDialogState({ isOpen: true, type: "error", message: data.message || "Failed to queue repository for import." });
      } else {
        setDialogState({ isOpen: true, type: "success", message: "Repository successfully queued for import! It will appear in your Imported Repositories soon." });
      }
    } catch {
      setDialogState({ isOpen: true, type: "error", message: "Error importing repository." });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const { page, totalPages } = pagination;
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      if (start > 2) pages.push("ellipsis-start");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("ellipsis-end");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col select-none relative space-y-10 pb-16">
      {/* Decorative background gradients */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none blur-3xl -z-10" />

      {/* Search Header */}
      <SearchHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800/50 pb-5 pt-2 sticky top-0 z-20 bg-black/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-3 mb-2">
            <label className="flex items-center gap-3 text-sm text-neutral-400 font-medium hover:text-neutral-200 cursor-pointer select-none transition-colors group">
              <div className="relative flex items-center">
                <Checkbox checked={includeOrg} onCheckedChange={handleIncludeOrgChange} className="border-neutral-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
              </div>
              Include Organization Repositories
            </label>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 hover:text-emerald-400 hover:border-emerald-500/30 text-neutral-300 text-sm font-medium transition-all duration-300 mb-2 shadow-sm">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
            </div>
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchRepos} />
        ) : repos.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pt-6">
            {repos.map((repo) => (
              <RepositoryCard key={repo.id} repo={repo} mode="import" onAction={handleImport} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 border border-neutral-800/50 rounded-3xl bg-neutral-900/20 backdrop-blur-sm">
            <Globe className="w-12 h-12 text-neutral-700 mb-4" />
            <p className="text-neutral-400 text-base font-medium">No repositories found matching your query.</p>
            <p className="text-neutral-600 text-sm mt-2">Try adjusting your search terms or filters.</p>
          </div>
        )}

        {!loading && !error && pagination.totalPages > 1 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} />
              </PaginationItem>
              {getPageNumbers().map((pageNumber, idx) => (
                <PaginationItem key={idx}>
                  {pageNumber === "ellipsis-start" || pageNumber === "ellipsis-end" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink isActive={pagination.page === pageNumber} onClick={() => handlePageChange(pageNumber as number)}>
                      {pageNumber}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => setDialogState(prev => ({ ...prev, isOpen }))}>
        <DialogContent className="sm:max-w-[425px] bg-neutral-950 border border-neutral-800 shadow-2xl text-neutral-100 rounded-2xl p-6">
          <DialogHeader className="space-y-3 pb-4 border-b border-neutral-800/50">
            <div className="flex items-center gap-3">
              {dialogState.type === "success" ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
              ) : dialogState.type === "error" ? (
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                  <BookMarked className="w-4 h-4 text-neutral-300" />
                </div>
              )}
              <DialogTitle className="text-lg font-medium tracking-tight text-neutral-100">
                {dialogState.type === "success" ? "Success" :
                 dialogState.type === "error" ? "Import Failed" : "Already Imported"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="py-4">
            <DialogDescription className="text-neutral-400 text-sm leading-relaxed">
              {dialogState.message}
            </DialogDescription>
          </div>

          <DialogFooter className="sm:justify-end gap-3 pt-2">
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-lg border border-neutral-800 hover:bg-neutral-900 text-neutral-300 text-sm font-medium transition-colors">
                Cancel
              </button>
            </DialogClose>
            {dialogState.type === "already_imported" && dialogState.internalId && (
              <button
                onClick={() => router.push(`/dashboard/repository/${dialogState.internalId}`)}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 text-sm font-medium transition-colors"
              >
                Open Repository
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <GitHubReposContent />
    </Suspense>
  );
}