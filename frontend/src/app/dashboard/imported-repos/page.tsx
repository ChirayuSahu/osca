"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { BookMarked } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { RepositoryCard, RepositoryCardSkeleton, Repository } from "@/components/repositories/repository-card";
import { RepositoryPagination } from "@/components/repositories/repository-pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";

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
  stars?: number;
  forks?: number;
  openIssuesCount?: number;
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

  // Repo awaiting confirmation in the remove dialog
  const [pendingDelete, setPendingDelete] = useState<Repository | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchImported = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/repositories?scope=imported&page=${pageParam}&limit=8`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const mappedRepos = data.data.map((repo: APIRepository) => {
            let lang: string | undefined;
            if (repo.languages) {
              const parsed = typeof repo.languages === 'string' ? JSON.parse(repo.languages) : repo.languages;
              if (parsed && Object.keys(parsed).length > 0) {
                const sortedLangs = Object.entries(parsed as Record<string, number>).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
                lang = sortedLangs[0][0];
              }
            }

            return {
              id: repo.id,
              name: repo.fullName || repo.name,
              description: repo.description || "",
              stars: repo.stars ?? 0,
              forks: repo.forks ?? 0,
              language: lang,
              issuesCount: repo.openIssuesCount ?? 0,
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
  };

  useEffect(() => {
    fetchImported();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pageParam]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDelete = async (repo: Repository) => {
    setDeleting(true);
    try {
      // Removes only your import; the repository stays in the shared catalogue
      const res = await fetch(`${API_URL}/repositories/${repo.id}/import`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRepos(prev => prev.filter(r => r.id !== repo.id));
        toast.success(`Removed ${repo.name}`);
      } else {
        toast.error("Failed to remove repository");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error removing repository");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Repositories"
        title="Imported"
        description="Projects you've added to OSCA."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/repositories">Search GitHub</Link>
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading repositories">
          {Array.from({ length: 6 }).map((_, i) => (
            <RepositoryCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchImported} />
      ) : repos.length > 0 ? (
        <div className="stagger-in grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {repos.map((repo) => (
            <RepositoryCard key={repo.id} repo={repo} mode="view" onDelete={setPendingDelete} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookMarked />}
          title="No imported repositories"
          description="Search your GitHub repositories to find projects to import."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/repositories">Search GitHub</Link>
            </Button>
          }
        />
      )}

      {!loading && !error && (
        <RepositoryPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent className="gap-6 p-6 sm:max-w-md">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-base font-semibold">Remove repository?</DialogTitle>
            <DialogDescription className="text-sm">
              <span className="font-medium text-foreground">{pendingDelete?.name}</span> will be removed from
              your imported repositories. It stays available in OSCA for other users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
            >
              {deleting && <Spinner className="text-current" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

export default function ImportedReposPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-24">
          <Spinner />
        </div>
      }
    >
      <ImportedReposContent />
    </Suspense>
  );
}
