"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { BookMarked } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { RepositoryCard, Repository } from "@/components/repositories/repository-card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui";
import { PageHeader } from "@/components/ui/page-header";

interface ExtendedRepository extends Repository {
  ownerType?: string;
}

interface APIRepository {
  id: string;
  name?: string;
  fullName?: string;
  description?: string;
  languages?: string | Record<string, number>;
  url?: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function ImportedReposContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();
  
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  
  const [repos, setRepos] = useState<ExtendedRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 8, total: 0, totalPages: 1 });

  useEffect(() => {
    async function fetchImported() {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/repositories?page=${pageParam}&limit=8`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const mappedRepos = data.data.map((repo: APIRepository) => {
              // Extract primary language if possible, else default
              let lang = "Unknown";
              if (repo.languages) {
                const parsed = typeof repo.languages === 'string' ? JSON.parse(repo.languages) : repo.languages;
                if (parsed && Object.keys(parsed).length > 0) {
                  const sortedLangs = Object.entries(parsed as Record<string, number>).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
                  lang = sortedLangs[0][0];
                }
              }
              let langColor = "bg-emerald-500";
              if (lang === "TypeScript") langColor = "bg-blue-500";
              else if (lang === "JavaScript") langColor = "bg-yellow-500";
              else if (lang === "Python") langColor = "bg-blue-700";

              return {
                id: repo.id,
                name: repo.fullName || repo.name,
                description: repo.description || "No description provided.",
                stars: 0, // Not available directly in schema, using 0 or placeholder
                forks: 0,
                language: lang,
                languageColor: langColor,
                issuesCount: 0,
                url: repo.url
              };
            });
            setRepos(mappedRepos);
            if (data.pagination) setPagination(data.pagination);
          } else {
            setError("Failed to parse repository list.");
          }
        } else {
          setError("Failed to load imported repositories.");
        }
      } catch (err) {
        console.error("Error fetching imported repos:", err);
        setError("An error occurred while loading imported repositories.");
      } finally {
        setLoading(false);
      }
    }
    fetchImported();
  }, [token, pageParam]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
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

  const handleDelete = async (repo: ExtendedRepository) => {
    if (!window.confirm(`Are you sure you want to remove ${repo.name}?`)) return;
    try {
      const res = await fetch(`${API_URL}/repositories/${repo.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRepos(repos.filter(r => r.id !== repo.id));
      } else {
        alert("Failed to delete repository");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting repository");
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col select-none relative space-y-10 pb-16 px-4 sm:px-6">
      {/* Decorative background gradients */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none blur-3xl -z-10" />

      <PageHeader 
        title="Imported Repositories"
        description="View and manage the open-source projects you've imported into OSCA."
        icon={<BookMarked className="w-5 h-5" />}
      />

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-red-500/20 rounded-3xl bg-gradient-to-b from-red-500/5 to-transparent relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
            <p className="text-red-400 text-base font-medium">{error}</p>
          </div>
        ) : repos.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pt-4">
            {repos.map((repo) => (
              <RepositoryCard key={repo.id} repo={repo} mode="view" onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 border border-neutral-800/50 rounded-3xl bg-neutral-900/20 backdrop-blur-sm">
            <BookMarked className="w-12 h-12 text-neutral-700 mb-4" />
            <p className="text-neutral-300 text-lg font-medium">No imported repositories</p>
            <p className="text-neutral-500 text-sm mt-2">Head to the GitHub Search menu to explore and import your projects.</p>
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
    </div>
  );
}

export default function ImportedReposPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ImportedReposContent />
    </Suspense>
  );
}
