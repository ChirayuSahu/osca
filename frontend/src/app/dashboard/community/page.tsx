"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderGit2, Users } from "lucide-react";
import { ContributorCard, ContributorCardSkeleton } from "@/components/community/contributor-card";
import { CollaborationCard, CollaborationCardSkeleton } from "@/components/community/collaboration-card";
import { useAuth } from "@/context/auth-context";
import {
  CommunityService,
  CommunityContributor,
  CollaborationOpportunity,
} from "@/services/community.service";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Loadable<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };
type CommunityTab = "contributors" | "collaborations";

const GRID = "grid gap-5 md:grid-cols-2 xl:grid-cols-3";
const LOAD_ERROR = "We couldn't load the community. Try again in a moment.";

export default function CommunityPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<CommunityTab>("contributors");
  const [contributors, setContributors] = useState<Loadable<CommunityContributor[]>>({ status: "loading" });
  const [collaborations, setCollaborations] = useState<Loadable<CollaborationOpportunity[]>>({ status: "loading" });

  useEffect(() => {
    if (!token) return;
    CommunityService.listContributors(token)
      .then((data) => setContributors({ status: "ready", data }))
      .catch((err) => {
        console.error(err);
        setContributors({ status: "error" });
      });
    CommunityService.listCollaborations(token)
      .then((data) => setCollaborations({ status: "ready", data }))
      .catch((err) => {
        console.error(err);
        setCollaborations({ status: "error" });
      });
  }, [token]);

  return (
    <PageContainer>
      <PageHeader
        title={<em>Community</em>}
        description="People who share your skills, and projects where they're active."
      />

      <Tabs className="gap-5" value={activeTab} onValueChange={(value) => setActiveTab(value as CommunityTab)}>
        <TabsList>
          <TabsTrigger value="contributors">Contributors</TabsTrigger>
          <TabsTrigger value="collaborations">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="contributors">
          {contributors.status === "loading" && (
            <div className={GRID} aria-busy="true" aria-label="Loading contributors">
              {Array.from({ length: 6 }).map((_, i) => (
                <ContributorCardSkeleton key={i} />
              ))}
            </div>
          )}
          {contributors.status === "error" && <ErrorState message={LOAD_ERROR} />}
          {contributors.status === "ready" &&
            (contributors.data.length > 0 ? (
              <div className={`${GRID} stagger-in`}>
                {contributors.data.map((contributor) => (
                  <ContributorCard key={contributor.id} contributor={contributor} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Users />}
                title="No matches yet"
                description="Contributors appear once your GitHub profile is analyzed and others share your skills."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/profile">Analyze your profile</Link>
                  </Button>
                }
              />
            ))}
        </TabsContent>

        <TabsContent value="collaborations">
          {collaborations.status === "loading" && (
            <div className={GRID} aria-busy="true" aria-label="Loading opportunities">
              {Array.from({ length: 6 }).map((_, i) => (
                <CollaborationCardSkeleton key={i} />
              ))}
            </div>
          )}
          {collaborations.status === "error" && <ErrorState message={LOAD_ERROR} />}
          {collaborations.status === "ready" &&
            (collaborations.data.length > 0 ? (
              <div className={`${GRID} stagger-in`}>
                {collaborations.data.map((collab) => (
                  <CollaborationCard key={collab.repositoryId} collaboration={collab} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FolderGit2 />}
                title="No opportunities yet"
                description="As contributors like you star, like and contribute to repositories, the projects they're active in will show up here."
              />
            ))}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
