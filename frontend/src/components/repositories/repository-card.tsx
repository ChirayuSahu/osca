"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Download, Star, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { DitherCard, LanguageDot, RepoTitle, StatusPill, compactNumber } from "@/components/repo-ui";

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
  const imported = isImportMode ? importStatus?.state === "imported" : true;
  const detailsHref =
    isImportMode && importStatus?.state === "imported"
      ? `/dashboard/repository/${importStatus.internalId}`
      : `/dashboard/repository/${repo.id}`;

  let action: React.ReactNode;
  if (!isImportMode) {
    action = (
      <>
        {onDelete && (
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
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={detailsHref}>
            Open <ArrowRight />
          </Link>
        </Button>
      </>
    );
  } else if (importStatus?.state === "imported") {
    action = (
      <Button variant="outline" size="sm" asChild>
        <Link href={detailsHref}>
          Open <ArrowRight />
        </Link>
      </Button>
    );
  } else if (importStatus?.state === "queued") {
    action = (
      <Button variant="outline" size="sm" disabled>
        <Clock /> Queued
      </Button>
    );
  } else {
    action = (
      <Button size="sm" onClick={handleAction} disabled={isLoading}>
        {isLoading ? <Spinner className="text-current" /> : <Download />}
        {isLoading ? "Importing…" : "Import"}
      </Button>
    );
  }

  return (
    <DitherCard className="h-full" logo={owner || undefined}>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <RepoTitle owner={owner} name={name} />
          {imported && (
            <div className="ml-auto">
              <StatusPill>Imported</StatusPill>
            </div>
          )}
        </div>
        {repo.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{repo.description}</p>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-3 whitespace-nowrap px-5 pb-4 text-xs text-muted-foreground">
        {repo.language && <LanguageDot language={repo.language} />}
        <span className="inline-flex items-center gap-1 tabular-nums" title="Stars">
          <Star className="size-3.5" aria-hidden />
          <span className="sr-only">Stars</span>
          {compactNumber(repo.stars)}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">{action}</div>
      </div>
    </DitherCard>
  );
}

export function RepositoryCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 rounded-md border border-border bg-card p-5">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-3/4" />
      <div className="mt-1 flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
