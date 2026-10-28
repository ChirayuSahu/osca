"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RepositoryService } from "@/services/repository.service";
import { ThreadService } from "@/services/thread.service";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  GitFork,
  GitPullRequest,
  HandHelping,
  MessageSquare,
  Plus,
  Sprout,
  Star,
  ThumbsUp,
} from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dither } from "@/components/ui/dither";
import { DitheredImage, githubAvatarUrl } from "@/components/ui/dithered-image";
import { GithubIcon } from "@/components/icons";
import { StatStrip, Tag, compactNumber, timeAgo, topLanguages } from "@/components/repo-ui";
import CreateThreadDialog from "@/components/threads/create-thread-dialog";
import { GithubReconnectNotice } from "@/components/github-reconnect-notice";
import { isGithubTokenError } from "@/lib/api";
import type { TreeNode, ManifestNode } from "@/components/visual-map";
import { CodebaseCard } from "@/components/codebase-card";
import { RepositorySkeleton } from "@/components/skeletons";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useBreadcrumbLabel } from "@/components/breadcrumbs";
import { RepositoryInsights } from "@/components/repository-insights";
import { NewcomerPanel } from "@/components/newcomer-panel";
import { useStickyEnd } from "@/hooks/use-sticky-end";
import { cn } from "@/lib/utils";
import { trackRecommendation } from "@/lib/recommendation-events";

interface Thread {
  id: string;
  title: string;
  content: string;
  createdAt: string | number | Date;
  isPR?: boolean;
  [key: string]: unknown;
}

interface RepositoryDetail {
  id?: string;
  name?: string;
  url?: string;
  description?: string;
  techStack?: string[];
  folderStructure?: TreeNode[];
  dependencies?: ManifestNode[];
  stars?: number;
  forks?: number;
  likeCount?: number;
  likedByMe?: boolean;
  openIssuesCount?: number;
  pushedAt?: string | null;
  [key: string]: unknown;
}

export default function RepositoryPage() {
  const params = useParams();
  const repositoryId = params.id as string;
  const { token } = useAuth();
  const sidebar = useStickyEnd<HTMLDivElement>();

  const [repo, setRepo] = useState<RepositoryDetail | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [isCreateThreadOpen, setIsCreateThreadOpen] = useState(false);
  const [threadsError, setThreadsError] = useState<"github-token" | "other" | null>(null);
  const [threadFilter, setThreadFilter] = useState<"open" | "prs">("open");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likePending, setLikePending] = useState(false);
  useBreadcrumbLabel(
    `/dashboard/repository/${repositoryId}`,
    repo?.owner && repo?.name ? `${repo.owner}/${repo.name}` : null
  );

  useEffect(() => {
    if (!token || !repositoryId) return;

    const loadRepo = async () => {
      try {
        setLoading(true);
        const repoRes = await RepositoryService.getRepository(repositoryId, token);
        setRepo(repoRes.data);
        setLiked(!!repoRes.data?.likedByMe);
        setLikeCount(repoRes.data?.likeCount ?? 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadRepo();
  }, [repositoryId, token]);

  useEffect(() => {
    if (!token || !repo || !repo.owner || !repo.name) return;

    const loadThreads = async () => {
      try {
        setThreadsLoading(true);
        setThreadsError(null);
        const threadsRes = await ThreadService.listThreads(repo.owner as string, repo.name as string, token, page);
        const mappedThreads = (threadsRes.data || []).map((issue: { number: string | number; title: string; body: string; created_at?: string; pull_request?: object; [key: string]: unknown }) => ({
          ...issue,
          id: issue.number,
          title: issue.title,
          content: issue.body,
          createdAt: issue.created_at || new Date().toISOString(),
          isPR: !!issue.pull_request
        }));
        setThreads(mappedThreads);
        setTotalPages(threadsRes.meta?.totalPages || 1);
      } catch (e) {
        // An expired GitHub token is expected and shown as a reconnect notice
        if (!isGithubTokenError(e)) console.error("Failed to load threads", e);
        setThreads([]);
        setThreadsError(isGithubTokenError(e) ? "github-token" : "other");
      } finally {
        setThreadsLoading(false);
      }
    };

    loadThreads();
  }, [repo, token, page]);

  const handleToggleLike = async () => {
    if (!token || likePending) return;
    const wasLiked = liked;
    const prevCount = likeCount;
    const apply = (isLiked: boolean) => {
      setLiked(isLiked);
      setLikeCount(prevCount + (isLiked ? 1 : 0) - (wasLiked ? 1 : 0));
    };
    setLikePending(true);
    apply(!wasLiked); // optimistic
    try {
      const { liked: nowLiked } = await RepositoryService.toggleLike(repositoryId, token);
      apply(nowLiked);
    } catch (err) {
      console.error("Failed to toggle like", err);
      apply(wasLiked);
    } finally {
      setLikePending(false);
    }
  };

  const handleThreadCreated = (newThread: Record<string, unknown>) => {
    const mapped = {
      ...newThread,
      id: newThread.number as string | number,
      title: newThread.title as string,
      content: newThread.body as string,
      createdAt: (newThread.created_at as string) || new Date().toISOString()
    };
    setThreads([mapped as unknown as Thread, ...threads]);
  };

  if (loading) return <RepositorySkeleton />;

  if (!repo) {
    return (
      <PageContainer size="narrow">
        <ErrorState
          message="We couldn't load the details for this repository. It may have been deleted or you don't have access."
          onRetry={() => window.location.reload()}
        />
      </PageContainer>
    );
  }

  const owner = typeof repo.owner === "string" ? repo.owner : "";
  const frameworks = Array.isArray(repo.frameworks) ? (repo.frameworks as string[]) : [];
  const tags = Array.from(
    new Map([...topLanguages(repo.languages), ...frameworks.slice(0, 3)].map((t) => [t.toLowerCase(), t])).values()
  ); // header stays short; the full framework list is in the insights card
  const goodFirst = typeof repo.goodFirstIssueCount === "number" ? repo.goodFirstIssueCount : null;
  const helpWanted = typeof repo.helpWantedCount === "number" ? repo.helpWantedCount : 0;
  const hasGuide = repo.hasContributingGuide === true;

  const stats = [
    ...(typeof repo.stars === "number" ? [{ label: "Stars", value: compactNumber(repo.stars), icon: Star }] : []),
    ...(typeof repo.forks === "number" ? [{ label: "Forks", value: compactNumber(repo.forks), icon: GitFork }] : []),
    ...(typeof repo.openIssuesCount === "number"
      ? [{ label: "Open issues", value: repo.openIssuesCount.toLocaleString(), icon: CircleDot }]
      : []),
    ...(goodFirst !== null
      ? [{ label: "Good first issues", value: goodFirst.toLocaleString(), icon: Sprout, accent: true }]
      : []),
  ];

  const visibleThreads = threadFilter === "prs" ? threads.filter((t) => t.isPR) : threads;
  const showThreadsEmpty = !threadsError && !threadsLoading && threads.length === 0;

  const headerDither = (
    <Dither cols={110} rows={40} cell={5} direction="radial" falloff={1.4} className="text-emerald-500/20" />
  );

  return (
    <PageContainer>
      {/* Repository header (D1) */}
      <div className="relative isolate overflow-hidden rounded-md border border-border bg-card">
        <div className="pointer-events-none absolute -right-10 top-1/2 -z-10 -translate-y-[58%] [mask-image:radial-gradient(closest-side,black_45%,transparent)]">
          {owner ? (
            <DitheredImage
              src={githubAvatarUrl(owner, 200)}
              cols={72}
              cell={5}
              className="text-emerald-500/25"
              fallback={headerDither}
            />
          ) : (
            headerDither
          )}
        </div>

        <div className="flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="min-w-0">
              {owner && (
                <p className="text-sm text-muted-foreground">
                  {owner} <span className="text-muted-foreground/50">/</span>
                </p>
              )}
              <h1 className="break-words font-serif text-4xl font-medium italic tracking-wide md:text-5xl">{repo.name}</h1>
            </div>
            {repo.description && (
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{repo.description}</p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((t) => <Tag key={t}>{t}</Tag>)}
              </div>
            )}
            {(repo.pushedAt || hasGuide || helpWanted > 0) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                {repo.pushedAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Pushed {timeAgo(repo.pushedAt)}
                  </span>
                )}
                {hasGuide && (
                  <span className="inline-flex items-center gap-1.5"><BookOpen className="size-3.5" /> Contributing guide</span>
                )}
                {helpWanted > 0 && (
                  <span className="inline-flex items-center gap-1.5"><HandHelping className="size-3.5" /> {helpWanted} help wanted</span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {repo.url && (
              <Button variant="outline" size="icon" asChild>
                <a href={repo.url} target="_blank" rel="noreferrer" aria-label="Open on GitHub" title="Open on GitHub" onClick={() => trackRecommendation({ type: "github", surface: "repository", repositoryId: repo.id })}>
                  <GithubIcon />
                </a>
              </Button>
            )}
            <Button
              variant={liked ? "outline" : "default"}
              onClick={handleToggleLike}
              disabled={likePending}
              aria-pressed={liked}
              className={cn("min-w-32", liked && "border-emerald-500/40 text-emerald-700 dark:text-emerald-300")}
            >
              <ThumbsUp className={cn(liked && "fill-current")} />
              {liked ? "Liked" : "Like"}
              <span className="tabular-nums opacity-70">{likeCount}</span>
            </Button>
          </div>
        </div>

        <StatStrip stats={stats} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {/* Issues (D3 / D4) */}
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
              <h2 className="text-base font-semibold">Issues</h2>
              {typeof repo.openIssuesCount === "number" && (
                <span className="text-sm text-muted-foreground tabular-nums">{repo.openIssuesCount.toLocaleString()}</span>
              )}
              {threads.length > 0 && (
                <SegmentedControl
                  size="sm"
                  aria-label="Filter issues"
                  className="ml-2"
                  value={threadFilter}
                  onValueChange={setThreadFilter}
                  options={[
                    { value: "open", label: "All open" },
                    { value: "prs", label: "Pull requests" },
                  ]}
                />
              )}
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => setIsCreateThreadOpen(true)}>
                <Plus /> New issue
              </Button>
            </div>

            {threadsError === "github-token" && (
              <div className="p-4">
                <GithubReconnectNotice action="load this repository's issues" />
              </div>
            )}
            {threadsError === "other" && (
              <p className="px-5 py-6 text-sm text-muted-foreground">Couldn&apos;t load issues right now.</p>
            )}

            {!threadsError && threadsLoading && threads.length === 0 && (
              <div className="divide-y divide-border" aria-busy="true">
                {["w-4/5", "w-3/5", "w-2/3", "w-1/2"].map((w) => (
                  <div key={w} className="flex items-start gap-3 px-5 py-3.5">
                    <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className={`h-3.5 ${w}`} />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showThreadsEmpty && (
              <div className="relative isolate flex flex-col items-center justify-center px-6 py-14 text-center">
                <Dither
                  cols={70}
                  rows={22}
                  cell={4}
                  direction="radial"
                  peak={0.6}
                  className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-emerald-500/[0.12]"
                />
                <p className="font-medium">No open issues</p>
                <p className="mt-1 text-sm text-muted-foreground">Nothing is open on GitHub right now.</p>
              </div>
            )}

            {threads.length > 0 && (
              <>
                {visibleThreads.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted-foreground">No pull requests on this page.</p>
                ) : (
                  <ul className={cn("divide-y divide-border transition-opacity", threadsLoading && "opacity-50")}>
                    {visibleThreads.map((thread) => (
                      <li key={thread.id}>
                        <Link
                          href={`/dashboard/repository/${repositoryId}/threads/${thread.id}`}
                          className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
                        >
                          {thread.isPR ? (
                            <GitPullRequest className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Pull request" />
                          ) : (
                            <CircleDot className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Issue" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{thread.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                              #{thread.id} · opened {timeAgo(thread.createdAt)}
                            </p>
                          </div>
                          {typeof thread.comments === "number" && (
                            <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-xs text-muted-foreground tabular-nums">
                              <MessageSquare className="size-3.5" /> {thread.comments}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-5 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || threadsLoading}
                    >
                      <ChevronLeft /> Prev
                    </Button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || threadsLoading}
                    >
                      Next <ChevronRight />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <CodebaseCard folderStructure={repo.folderStructure} dependencies={repo.dependencies} repoUrl={repo.url} />
        </div>

        {/* Pinned while the page scrolls; when taller than the screen it scrolls to its end first (desktop only) */}
        <div ref={sidebar.ref} style={{ top: sidebar.top }} className="flex min-w-0 flex-col gap-6 lg:sticky">
          {token && <NewcomerPanel repositoryId={repositoryId} token={token} repo={repo} />}
          <RepositoryInsights repo={repo} />
        </div>
      </div>

      <CreateThreadDialog
        isOpen={isCreateThreadOpen}
        onClose={() => setIsCreateThreadOpen(false)}
        owner={repo.owner as string}
        repo={repo.name as string}
        onThreadCreated={handleThreadCreated}
      />
    </PageContainer>
  );
}
