"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Clock, Download, GitFork, Star, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { RepoCard, LanguageDot, RepoTitle, StatusPill, compactNumber } from "@/components/repo-ui";

export interface Repository {
  id: number | string;
  /** Full name, "owner/name" */
  name: string;
  description: string;
  stars: number;
  forks: number;
  language?: string;
  /** @deprecated Languages render as dots; kept for API compatibility. */
  languageColor?: string;
  matchScore?: number;
  issuesCount?: number;
  url?: string;
}

/** Import state of a GitHub repo in OSCA, shown on cards in import mode. */
export type RepositoryImportStatus =
  | { state: "imported"; internalId: string }
  | { state: "queued" };

interface RepositoryCardProps {
  repo: Repository;
  mode?: "import" | "view";
  importStatus?: RepositoryImportStatus;
  onAction?: (repo: Repository) => void | Promise<void>;
  onDelete?: (repo: Repository) => void | Promise<void>;
}

const splitName = (fullName: string): [string, string] => {
  const i = fullName.indexOf("/");
  return i === -1 ? ["", fullName] : [fullName.slice(0, i), fullName.slice(i + 1)];
};

export function RepositoryCard({ repo, mode = "view", importStatus, onAction, onDelete }: RepositoryCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAction) {
      setIsLoading(true);
      try {
        await onAction(repo);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const [owner, name] = splitName(repo.name);
  const isImportMode = mode === "import";
  // Only search results need the tag; everything on the Imported page is imported
  const imported = isImportMode && importStatus?.state === "imported";
  const detailsHref =
    isImportMode && importStatus?.state === "imported"
      ? `/dashboard/repository/${importStatus.internalId}`
      : `/dashboard/repository/${repo.id}`;

  // Imported repos open from anywhere on the card; search results not yet imported don't open
  const openable = !isImportMode || importStatus?.state === "imported";

  let action: React.ReactNode = null;
  if (!isImportMode) {
    action = onDelete && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove from imported"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              onDelete(repo);
            }}
          >
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Remove from imported</TooltipContent>
      </Tooltip>
    );
  } else if (importStatus?.state === "queued") {
    action = (
      <Button variant="outline" size="sm" disabled>
        <Clock /> Queued
      </Button>
    );
  } else if (importStatus?.state !== "imported") {
    action = (
      <Button size="sm" onClick={handleAction} disabled={isLoading}>
        {isLoading ? <Spinner className="text-current" /> : <Download />}
        {isLoading ? "Importing…" : "Import"}
      </Button>
    );
  }

  return (
    <RepoCard className={openable ? "h-full cursor-pointer has-[a:focus-visible]:border-ring" : "h-full"}>
      <div className="flex flex-1 flex-col gap-2 px-6 pb-5 pt-6">
        <div className="flex items-center gap-3">
          {openable ? (
            // Stretched over the whole card; the buttons sit above it
            <Link href={detailsHref} className="min-w-0 outline-none after:absolute after:inset-0 after:content-['']">
              <RepoTitle owner={owner} name={name} />
            </Link>
          ) : (
            <RepoTitle owner={owner} name={name} />
          )}
          {imported && (
            <div className="ml-auto">
              <StatusPill>Imported</StatusPill>
            </div>
          )}
        </div>
        {/* Always two lines tall, so the footers line up across a row */}
        <p className="line-clamp-2 min-h-[2lh] text-sm leading-relaxed text-muted-foreground">{repo.description}</p>
      </div>
      <div className="flex min-h-14 min-w-0 items-center gap-4 whitespace-nowrap px-6 pb-6 text-xs text-muted-foreground">
        {repo.language && <LanguageDot language={repo.language} />}
        {repo.forks > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums" title="Forks">
            <GitFork className="size-3.5" aria-hidden />
            <span className="sr-only">Forks</span>
            {compactNumber(repo.forks)}
          </span>
        )}
        <span className="inline-flex items-center gap-1 tabular-nums" title="Stars">
          <Star className="size-3.5" aria-hidden />
          <span className="sr-only">Stars</span>
          {compactNumber(repo.stars)}
        </span>
        {action && <div className="relative z-10 ml-auto flex shrink-0 items-center gap-1">{action}</div>}
      </div>
    </RepoCard>
  );
}

export function RepositoryCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-2 rounded-md border border-border bg-card p-6">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="mb-6 h-3.5 w-3/4" />
      <div className="mt-auto flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
