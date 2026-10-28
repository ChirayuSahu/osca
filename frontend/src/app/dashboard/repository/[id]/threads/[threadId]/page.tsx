"use client";
import { isGithubTokenError } from "@/lib/api";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { ThreadService } from "@/services/thread.service";
import { RepositoryService } from "@/services/repository.service";
import { ArrowRight, Check, CircleDot, GitBranch, GitPullRequest, Link2 } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Dither } from "@/components/ui/dither";
import { DitheredImage, githubAvatarUrl } from "@/components/ui/dithered-image";
import { Eyebrow, StatusPill, timeAgo } from "@/components/repo-ui";
import CommentSection from "@/components/comments/comment-section";
import { GithubBody } from "@/components/markdown-lazy";
import { Reactions, type ReactionRollup } from "@/components/reactions";
import { GithubReconnectNotice } from "@/components/github-reconnect-notice";
import { GithubIcon } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBreadcrumbLabel } from "@/components/breadcrumbs";
import { ThreadSkeleton } from "@/components/skeletons";

interface ThreadDetail {
  id?: string | number;
  number?: string | number;
  title?: string;
  body?: string;
  body_html?: string;
  created_at: string | number | Date;
  updated_at?: string | number | Date;
  user?: { login: string; avatar_url: string };
  state?: string;
  labels?: { name: string; color: string }[];
  reactions?: ReactionRollup;
  viewer_reactions?: string[];
  comments?: number;
  [key: string]: unknown;
}

export default function ThreadPage() {
  const params = useParams();
  const repositoryId = params.id as string;
  const threadId = params.threadId as string;
  const { token } = useAuth();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [repoDetails, setRepoDetails] = useState<{owner: string, name: string} | null>(null);
  const [relatedThreads, setRelatedThreads] = useState<ThreadDetail[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prData, setPrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  useBreadcrumbLabel(
    `/dashboard/repository/${repositoryId}`,
    repoDetails ? `${repoDetails.owner}/${repoDetails.name}` : null
  );

  useEffect(() => {
    if (!token || !repositoryId || !threadId) return;

    const loadData = async () => {
      try {
        const repoRes = await RepositoryService.getRepository(repositoryId, token);
        const owner = repoRes.data.owner;
        const repo = repoRes.data.name;
        setRepoDetails({ owner, name: repo });

        const threadRes = await ThreadService.getThread(owner, repo, threadId, token);
        setThread(threadRes.data);

        if (threadRes.data?.pull_request) {
          try {
            const prRes = await ThreadService.getPull(owner, repo, threadId, token);
            // Handling both formats { data: ... } or just raw object
            setPrData(prRes.data || prRes);
          } catch (e) {
            console.error("Failed to fetch PR data", e);
          }
        }

        // Fetch related threads (using recent threads for now)
        const allThreadsRes = await ThreadService.listThreads(owner, repo, token, 1);
        const otherThreads = (allThreadsRes.data || [])
          .filter((t: { number: string | number }) => String(t.number) !== String(threadId))
          .slice(0, 3); // Take top 3
        setRelatedThreads(otherThreads);
      } catch (err) {
        // An expired GitHub token is expected and shown as a reconnect notice
        if (isGithubTokenError(err)) setTokenExpired(true);
        else console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repositoryId, threadId, token]);

  if (loading) return <ThreadSkeleton />;

  if (tokenExpired && !thread) {
    return (
      <PageContainer size="narrow">
        <GithubReconnectNotice action="load this issue" />
      </PageContainer>
    );
  }

  if (!thread || !repoDetails) {
    return (
      <PageContainer size="narrow">
        <ErrorState message="Failed to load thread." onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  const isPR = !!thread.pull_request;
  const isClosed = thread.state === "closed";
  const isMerged = isPR && !!prData?.merged;
  const authorLogin = thread.user?.login;
  const commentCount = typeof thread.comments === "number" ? thread.comments : null;
  const baseRef: string | undefined = prData?.base?.ref || prData?.base?.label;
  const headRef: string | undefined = prData?.head?.ref || prData?.head?.label;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const headerDither = (
    <Dither cols={110} rows={34} cell={5} direction="radial" peak={0.75} className="text-emerald-500/[0.16]" />
  );
  const htmlUrl = typeof thread.html_url === "string" ? thread.html_url : undefined;
  const assignees = Array.isArray(thread.assignees) ? (thread.assignees as { login: string }[]) : [];
  const milestone = (thread.milestone as { title?: string } | null)?.title;

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Author", value: authorLogin ?? "Unknown" },
    { label: "Opened", value: timeAgo(thread.created_at) },
    ...(thread.updated_at ? [{ label: "Updated", value: timeAgo(thread.updated_at) }] : []),
    ...(commentCount !== null ? [{ label: "Comments", value: commentCount }] : []),
    ...(assignees.length > 0 ? [{ label: "Assignees", value: assignees.map((a) => a.login).join(", ") }] : []),
    ...(milestone ? [{ label: "Milestone", value: milestone }] : []),
    ...(isPR && typeof prData?.commits === "number" ? [{ label: "Commits", value: prData.commits }] : []),
    ...(isPR && typeof prData?.changed_files === "number"
      ? [{
          label: "Changes",
          value: (
            <span className="tabular-nums">
              {prData.changed_files} files{" "}
              <span className="text-emerald-600 dark:text-emerald-400">+{prData.additions ?? 0}</span>{" "}
              <span className="text-destructive">−{prData.deletions ?? 0}</span>
            </span>
          ),
        }]
      : []),
  ];

  return (
    <PageContainer>
      {/* Header: status, title, meta; actions on the right */}
      <header className="relative isolate flex flex-col gap-6">
        <div className="pointer-events-none absolute -right-6 -top-8 -z-10 [mask-image:radial-gradient(closest-side,black_40%,transparent)]">
          <DitheredImage
            src={githubAvatarUrl(repoDetails.owner, 160)}
            cols={64}
            cell={5}
            className="text-emerald-500/[0.18]"
            fallback={headerDither}
          />
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {isMerged ? (
                <StatusPill>Merged</StatusPill>
              ) : isClosed ? (
                <StatusPill className="border-border bg-muted text-muted-foreground dark:text-muted-foreground [&>span]:bg-muted-foreground/50">
                  Closed
                </StatusPill>
              ) : (
                <StatusPill>Open</StatusPill>
              )}
              <span className="inline-flex items-center gap-1.5">
                {isPR ? <GitPullRequest className="size-3.5" /> : <CircleDot className="size-3.5" />}
                {isPR ? "Pull request" : "Issue"}
              </span>
            </div>

            <h1 className="max-w-3xl break-words text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
              {thread.title}{" "}
              <span className="font-normal text-muted-foreground tabular-nums">#{thread.number ?? threadId}</span>
            </h1>

            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
              {authorLogin && <span className="font-medium text-foreground">{authorLogin}</span>}
              <span>opened this {timeAgo(thread.created_at)}</span>
              {commentCount !== null && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="tabular-nums">{commentCount} {commentCount === 1 ? "comment" : "comments"}</span>
                </>
              )}
            </p>

            {isPR && baseRef && headRef && (
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <GitBranch className="size-3.5" />
                <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-foreground">{headRef}</code>
                <ArrowRight className="size-3" />
                <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-foreground">{baseRef}</code>
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm" onClick={handleShare} aria-label="Copy link">
                  {copied ? <Check /> : <Link2 />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied" : "Copy link"}</TooltipContent>
            </Tooltip>
            {htmlUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={htmlUrl} target="_blank" rel="noreferrer">
                  <GithubIcon /> Open on GitHub
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="h-px bg-border" />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <article className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-sm">
              <span className="font-medium">{authorLogin ?? "Unknown"}</span>
              <span className="text-muted-foreground">wrote {timeAgo(thread.created_at)}</span>
              {typeof thread.author_association === "string" && thread.author_association !== "NONE" && (
                <span className="ml-auto rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] capitalize text-muted-foreground">
                  {thread.author_association.toLowerCase().replace(/_/g, " ")}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-4 px-5 py-4">
              {thread.body ? (
                <GithubBody html={thread.body_html} markdown={thread.body} />
              ) : (
                <p className="text-sm italic text-muted-foreground">No description provided.</p>
              )}
              <Reactions
                key={thread.id}
                reactions={thread.reactions}
                viewerReactions={thread.viewer_reactions}
                onToggle={(content) => ThreadService.toggleReaction(repoDetails.owner, repoDetails.name, threadId, content, token!)}
              />
            </div>
          </article>

          <CommentSection owner={repoDetails.owner} repo={repoDetails.name} threadId={threadId} />
        </div>

        {/* Pinned beside the issue and comments while they scroll (desktop only) */}
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto">

          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <Eyebrow>Details</Eyebrow>
            </div>
            <dl className="divide-y divide-border text-sm">
              {details.map((d) => (
                <div key={d.label} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="min-w-0 truncate text-right font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
            {thread.labels && thread.labels.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border px-5 py-3.5">
                <span className="text-sm text-muted-foreground">Labels</span>
                <div className="flex flex-wrap gap-1.5">
                  {thread.labels.map((label) => (
                    <span key={label.name} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-xs">
                      <span className="size-2 rounded-full" style={{ backgroundColor: `#${label.color}` }} aria-hidden />
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {relatedThreads.length > 0 && (
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <div className="border-b border-border px-5 py-3.5">
                <Eyebrow>More open issues</Eyebrow>
              </div>
              <ul className="divide-y divide-border">
                {relatedThreads.map((rt) => (
                  <li key={rt.number}>
                    <Link
                      href={`/dashboard/repository/${repositoryId}/threads/${rt.number}`}
                      className="flex items-start gap-2.5 px-5 py-3 transition-colors hover:bg-muted/40"
                      title={rt.title}
                    >
                      {rt.pull_request ? (
                        <GitPullRequest className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <CircleDot className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-medium">{rt.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                          #{rt.number} · {timeAgo(rt.created_at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}
