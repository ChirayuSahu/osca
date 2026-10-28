"use client";

import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { GithubIcon } from "@/components/icons";
import { DitherCard, Tag } from "@/components/repo-ui";
import type { CommunityContributor } from "@/services/community.service";

interface ContributorCardProps {
  contributor: CommunityContributor;
}

// The whole card opens the contributor's profile (a stretched link on the name),
// while "View on GitHub" stays its own link above it.
export function ContributorCard({ contributor }: ContributorCardProps) {
  return (
    <DitherCard className="h-full cursor-pointer has-[a:focus-visible]:border-ring">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-11 rounded-md border border-border">
            {contributor.avatarUrl && <AvatarImage src={contributor.avatarUrl} alt={contributor.name} />}
            <AvatarFallback className="font-semibold">{contributor.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link
              href={`/dashboard/community/${contributor.id}`}
              className="block truncate font-semibold leading-tight outline-none after:absolute after:inset-0 after:content-['']"
            >
              {contributor.name}
            </Link>
            <p className="truncate text-sm text-muted-foreground">@{contributor.username}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-md bg-tint-emerald-500 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {contributor.matchScore}%
          </span>
        </div>
        {contributor.sharedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {contributor.sharedSkills.slice(0, 3).map((skill) => <Tag key={skill}>{skill}</Tag>)}
          </div>
        )}
      </div>
      <div className="px-5 pb-4">
        <a
          href={`https://github.com/${contributor.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <GithubIcon className="size-3.5" /> View on GitHub
        </a>
      </div>
    </DitherCard>
  );
}

export function ContributorCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="h-3.5 w-24" />
    </div>
  );
}
