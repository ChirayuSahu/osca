"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Building2, Check, SearchX, Sprout } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { SearchHeader } from "@/components/repositories/search-header";
import {
  RepositoryCard,
  RepositoryCardSkeleton,
  Repository,
  RepositoryImportStatus,
} from "@/components/repositories/repository-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/ui/page-container";
import { Spinner } from "@/components/ui/spinner";
import { GithubReconnectNotice } from "@/components/github-reconnect-notice";
import { apiFetch, isGithubTokenError, readApiError } from "@/lib/api";

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

const repoUrl = (repo: Repository) => repo.url || `https://github.com/${repo.name}`;

const MINE_LIMIT_BROWSING = 9;
const MINE_LIMIT_SEARCHING = 6;
const GITHUB_LIMIT = 9;

const toRepository = (repo: GitHubRepo): ExtendedRepository => ({
  id: repo.id,
  name: repo.full_name,
  description: repo.description || "",
  stars: repo.stargazers_count || 0,
  forks: repo.forks_count || 0,
  language: repo.language || undefined,
  issuesCount: repo.open_issues_count || 0,
  ownerType: repo.owner?.type || "User",
  url: repo.html_url,
});

async function getRepos(url: string, token: string): Promise<{ repos: ExtendedRepository[]; pagination?: PaginationMeta }> {
  const res = await apiFetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw await readApiError(res, "Request failed");
  const data = await res.json().catch(() => null);
  if (!data?.success || !Array.isArray(data.data)) throw new Error("Unexpected response");
  return { repos: data.data.map(toRepository), pagination: data.pagination };
}

function SectionHeading({ title, meta, children }: { title: string; meta?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {meta && <span className="text-sm text-muted-foreground tabular-nums">{meta}</span>}
      {children && <div className="ml-auto">{children}</div>}
    </div>
  );
}

/** Calls `onLoadMore` when the returned sentinel scrolls near the viewport */
function useLoadMore(onLoadMore: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, enabled]);
  return ref;
}

function RepoGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading repositories">
      {Array.from({ length: count }).map((_, i) => (
        <RepositoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

function GitHubReposContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();

  const queryParam = (searchParams.get("q") || "").trim();
  const includeOrgParam = searchParams.get("includeOrg") === "true";
  // GitHub results limited to repos with open good first issues
  const goodFirstOnly = searchParams.get("goodFirst") === "true";
  const searching = queryParam !== "";

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [includeOrg, setIncludeOrg] = useState(includeOrgParam);

  // Your own repositories: all of them while browsing, top matches while searching
  const [mine, setMine] = useState<ExtendedRepository[]>([]);
  const [mineTotal, setMineTotal] = useState(0);
  const [minePage, setMinePage] = useState(1);
  const [mineHasMore, setMineHasMore] = useState(false);
  const [mineLoading, setMineLoading] = useState(true);
  const [mineLoadingMore, setMineLoadingMore] = useState(false);
  const [mineError, setMineError] = useState<string | null>(null);
  const [mineTokenExpired, setMineTokenExpired] = useState(false);

  // Everything else on GitHub, only while searching
  const [github, setGithub] = useState<ExtendedRepository[]>([]);
  const [githubTotal, setGithubTotal] = useState(0);
  const [githubPage, setGithubPage] = useState(1);
  const [githubHasMore, setGithubHasMore] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubLoadingMore, setGithubLoadingMore] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Responses for an older query or filter are dropped
  const mineRequest = useRef(0);
  const githubRequest = useRef(0);

  const [importedUrls, setImportedUrls] = useState<Record<string, string>>({});
  // Repos queued for import in this session (lower-cased URLs), until the import list catches up
  const [queuedUrls, setQueuedUrls] = useState<Set<string>>(new Set());

  // The last `q` this page wrote; any other change to it came from outside (e.g. the sidebar link)
  const writtenQuery = useRef(queryParam);
  useEffect(() => {
    if (queryParam === writtenQuery.current) return;
    writtenQuery.current = queryParam;
    setSearchQuery(queryParam);
  }, [queryParam]);

  // Debounced search sync to URL
  useEffect(() => {
    if (searchQuery.trim() === queryParam) return;

    const handler = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      writtenQuery.current = searchQuery.trim();
      router.replace(`${pathname}?${params.toString()}`);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery, queryParam, router, pathname]);

  useEffect(() => { setIncludeOrg(includeOrgParam); }, [includeOrgParam]);

  const fetchMine = useCallback(async (page: number) => {
    if (!token) return;
    const requestId = ++mineRequest.current;
    const first = page === 1;
    // While searching only your best matches are shown, above the GitHub results
    const limit = searching ? MINE_LIMIT_SEARCHING : MINE_LIMIT_BROWSING;
    if (first) {
      setMineLoading(true);
      setMineError(null);
      setMineTokenExpired(false);
    } else {
      setMineLoadingMore(true);
    }
    try {
      const { repos, pagination } = await getRepos(
        `${API_URL}/repositories/github?page=${page}&limit=${limit}&q=${encodeURIComponent(queryParam)}&includeOrg=${includeOrg}`,
        token
      );
      if (requestId !== mineRequest.current) return;
      setMine((prev) => (first ? repos : [...prev, ...repos.filter((r) => !prev.some((p) => p.id === r.id))]));
      setMineTotal(pagination?.total ?? repos.length);
      setMinePage(page);
      setMineHasMore(!searching && !!pagination && page < pagination.totalPages);
    } catch (err) {
      if (requestId !== mineRequest.current) return;
      if (first) {
        setMine([]);
        setMineTotal(0);
        setMineTokenExpired(isGithubTokenError(err));
        setMineError("Couldn't load your GitHub repositories.");
      } else {
        setMineHasMore(false);
        toast.error("Couldn't load more of your repositories");
      }
    } finally {
      if (requestId === mineRequest.current) {
        setMineLoading(false);
        setMineLoadingMore(false);
      }
    }
  }, [token, searching, queryParam, includeOrg]);

  const fetchGithub = useCallback(async (page: number) => {
    if (!token || !searching) return;
    const requestId = ++githubRequest.current;
    const first = page === 1;
    if (first) {
      setGithubLoading(true);
      setGithubError(null);
    } else {
      setGithubLoadingMore(true);
    }
    try {
      const { repos, pagination } = await getRepos(
        `${API_URL}/repositories/github/search?page=${page}&limit=${GITHUB_LIMIT}&q=${encodeURIComponent(queryParam)}${goodFirstOnly ? "&goodFirst=true" : ""}`,
        token
      );
      if (requestId !== githubRequest.current) return;
      setGithub((prev) => (first ? repos : [...prev, ...repos.filter((r) => !prev.some((p) => p.id === r.id))]));
      setGithubTotal(pagination?.total ?? repos.length);
      setGithubPage(page);
      setGithubHasMore(!!pagination && page < pagination.totalPages && repos.length > 0);
    } catch {
      if (requestId !== githubRequest.current) return;
      if (first) {
        setGithub([]);
        setGithubError("Couldn't search GitHub right now.");
      } else {
        setGithubHasMore(false);
        toast.error("Couldn't load more results");
      }
    } finally {
      if (requestId === githubRequest.current) {
        setGithubLoading(false);
        setGithubLoadingMore(false);
      }
    }
  }, [token, searching, queryParam, goodFirstOnly]);

  // New query or filter: start both lists over
  useEffect(() => { fetchMine(1); }, [fetchMine]);
  useEffect(() => {
    if (searching) {
      fetchGithub(1);
    } else {
      githubRequest.current++;
      setGithub([]);
      setGithubHasMore(false);
    }
  }, [searching, fetchGithub]);

  const loadMoreMine = useCallback(() => {
    if (!mineLoading && !mineLoadingMore && mineHasMore) fetchMine(minePage + 1);
  }, [mineLoading, mineLoadingMore, mineHasMore, minePage, fetchMine]);
  const loadMoreGithub = useCallback(() => {
    if (!githubLoading && !githubLoadingMore && githubHasMore) fetchGithub(githubPage + 1);
  }, [githubLoading, githubLoadingMore, githubHasMore, githubPage, fetchGithub]);

  const mineSentinel = useLoadMore(loadMoreMine, !searching && mineHasMore);
  const githubSentinel = useLoadMore(loadMoreGithub, searching && githubHasMore);

  // Already-imported repos, to show "Open" instead of "Import"
  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_URL}/repositories?scope=imported&limit=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.success || !Array.isArray(data.data)) return;
        const urlMap: Record<string, string> = {};
        data.data.forEach((r: ImportedRepo) => {
          if (r.url) urlMap[r.url.toLowerCase()] = r.id;
        });
        setImportedUrls(urlMap);
      })
      .catch(() => {
        // Best-effort: cards just show Import
      });
  }, [token]);

  const toggleGoodFirst = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (goodFirstOnly) params.delete("goodFirst");
    else params.set("goodFirst", "true");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleIncludeOrgChange = (checked: boolean) => {
    setIncludeOrg(checked);
    const params = new URLSearchParams(searchParams.toString());
    params.set("includeOrg", checked.toString());
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleImport = async (repo: Repository) => {
    const targetUrl = repoUrl(repo);
    if (importedUrls[targetUrl.toLowerCase()]) {
      const internalId = importedUrls[targetUrl.toLowerCase()];
      toast("Already imported", {
        description: "This repository has already been imported into OSCA.",
        action: { label: "Open", onClick: () => router.push(`/dashboard/repository/${internalId}`) },
      });
      return;
    }

    try {
      const res = await apiFetch(`${API_URL}/repositories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();
      if (!data.success) {
        toast.error("Import failed", { description: data.message || "Failed to queue repository for import." });
      } else {
        setQueuedUrls(prev => new Set(prev).add(targetUrl.toLowerCase()));
        toast.success("Queued for import", {
          description: `${repo.name} will appear in Imported repositories soon.`,
        });
      }
    } catch {
      toast.error("Import failed", { description: "Error importing repository." });
    }
  };

  const importStatusFor = (repo: Repository): RepositoryImportStatus | undefined => {
    const key = repoUrl(repo).toLowerCase();
    if (importedUrls[key]) return { state: "imported", internalId: importedUrls[key] };
    if (queuedUrls.has(key)) return { state: "queued" };
    return undefined;
  };

  const renderGrid = (repos: ExtendedRepository[]) => (
    <div className="stagger-in grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {repos.map((repo) => (
        <RepositoryCard key={repo.id} repo={repo} mode="import" importStatus={importStatusFor(repo)} onAction={handleImport} />
      ))}
    </div>
  );

  const orgToggle = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={includeOrg}
      onClick={() => handleIncludeOrgChange(!includeOrg)}
      className="aria-pressed:border-emerald-500/40 aria-pressed:text-emerald-700 dark:aria-pressed:text-emerald-300"
    >
      {includeOrg ? <Check /> : <Building2 />}
      Include organizations
    </Button>
  );

  // Your repos already appear above, so leave them out of the GitHub results
  const mineNames = new Set(mine.map((r) => r.name.toLowerCase()));
  const githubOnly = github.filter((r) => !mineNames.has(r.name.toLowerCase()));

  return (
    <PageContainer>
      <SearchHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* Your repositories */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          title="Your repositories"
          meta={!mineLoading && !mineError && mineTotal > 0 ? mineTotal.toLocaleString() : undefined}
        >
          {orgToggle}
        </SectionHeading>

        {mineLoading ? (
          <RepoGridSkeleton count={searching ? 3 : 6} />
        ) : mineTokenExpired ? (
          <GithubReconnectNotice action="list your repositories" />
        ) : mineError ? (
          searching ? (
            <p className="text-sm text-muted-foreground">{mineError}</p>
          ) : (
            <ErrorState message={mineError} onRetry={() => fetchMine(1)} />
          )
        ) : mine.length > 0 ? (
          <>
            {renderGrid(mine)}
            {searching && mineTotal > mine.length && (
              <p className="text-xs text-muted-foreground">
                Showing your {mine.length} best matches of {mineTotal}. Refine the search to narrow them down.
              </p>
            )}
          </>
        ) : searching ? (
          <p className="text-sm text-muted-foreground">None of your repositories match &ldquo;{queryParam}&rdquo;.</p>
        ) : (
          <EmptyState
            icon={<SearchX />}
            title="No public repositories yet"
            description="Search above to find any public repository on GitHub."
          />
        )}

        {!searching && mineLoadingMore && <RepoGridSkeleton count={3} />}
        {!searching && mineHasMore && <div ref={mineSentinel} aria-hidden className="h-px" />}
      </section>

      {/* All of GitHub */}
      {searching && (
        <section className="flex flex-col gap-4">
          <div className="h-px bg-border" />
          <SectionHeading
            title="On GitHub"
            meta={
              !githubLoading && !githubError && githubTotal > 0
                ? `${githubTotal.toLocaleString()} ${githubTotal === 1 ? "result" : "results"}`
                : undefined
            }
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={goodFirstOnly}
              onClick={toggleGoodFirst}
              className="aria-pressed:border-emerald-500/40 aria-pressed:text-emerald-700 dark:aria-pressed:text-emerald-300"
            >
              {goodFirstOnly ? <Check /> : <Sprout />}
              Good first issues
            </Button>
          </SectionHeading>

          {githubLoading ? (
            <RepoGridSkeleton count={6} />
          ) : githubError ? (
            <ErrorState message={githubError} onRetry={() => fetchGithub(1)} />
          ) : githubOnly.length > 0 ? (
            renderGrid(githubOnly)
          ) : (
            <EmptyState
              icon={<SearchX />}
              title="Nothing found on GitHub"
              description="Try other keywords, or a qualifier like language:rust or topic:cli."
              action={
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              }
            />
          )}

          {githubLoadingMore && <RepoGridSkeleton count={3} />}
          {githubHasMore && <div ref={githubSentinel} aria-hidden className="h-px" />}
          {!githubLoading && !githubError && !githubHasMore && githubOnly.length > 0 && (
            <p className="py-2 text-center text-sm text-muted-foreground">
              {githubTotal > github.length && github.length >= 1000
                ? "That's as far as GitHub search goes. Refine the search to see more."
                : "That's everything for this search."}
            </p>
          )}
        </section>
      )}
    </PageContainer>
  );
}

export default function RepositoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-24">
          <Spinner />
        </div>
      }
    >
      <GitHubReposContent />
    </Suspense>
  );
}
