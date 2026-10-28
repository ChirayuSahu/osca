"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sprout, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DitherCard, RepoTitle } from "@/components/repo-ui";
import type { CollaborationOpportunity } from "@/services/community.service";

interface CollaborationCardProps {
  collaboration: CollaborationOpportunity;
}

export function CollaborationCard({ collaboration }: CollaborationCardProps) {
  const router = useRouter();
  const href = `/dashboard/repository/${collaboration.repositoryId}`;
  const { peers, goodFirstIssueCount } = collaboration;

  return (
    <DitherCard
      className="h-full"
      logo={collaboration.owner}
      role="link"
      tabIndex={0}
      aria-label={`${collaboration.owner}/${collaboration.name}`}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
    >
      <div className="flex flex-1 flex-col gap-3 p-5">
        <RepoTitle owner={collaboration.owner} name={collaboration.name} />
        {collaboration.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{collaboration.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 whitespace-nowrap px-5 pb-4 text-xs text-muted-foreground tabular-nums">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" /> {peers} {peers === 1 ? "person" : "people"} like you
        </span>
        {goodFirstIssueCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Sprout className="size-3.5 text-emerald-600 dark:text-emerald-400" /> {goodFirstIssueCount} good first
          </span>
        )}
        <ArrowRight className="ml-auto size-4" />
      </div>
    </DitherCard>
  );
}

export function CollaborationCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 rounded-md border border-border bg-card p-5">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="mt-1 h-3.5 w-1/2" />
    </div>
  );
}
