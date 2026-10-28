"use client";
import { ErrorState } from "@/components/ui/error-state";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RepositoryService } from "@/services/repository.service";
import { JobService } from "@/services/job.service";
import { Eyebrow } from "@/components/repo-ui";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";

function ImportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const url = searchParams.get("url");

  const [status, setStatus] = useState("Initializing repository import...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url || !token) return;

    let pollingInterval: NodeJS.Timeout;

    const startImport = async () => {
      try {
        setStatus("Starting analysis...");
        const response = await RepositoryService.analyzeRepository(url, token);
        const jobId = response.data.jobId;

        if (!jobId) {
          throw new Error("Failed to receive Job ID from server");
        }

        // Poll job status
        pollingInterval = setInterval(async () => {
          try {
            const jobRes = await JobService.getJob('dev-repository-analysis', jobId, token);
            const job = jobRes.data;

            if (job.progress && typeof job.progress === 'object') {
              if (job.progress.message) {
                setStatus(job.progress.message);
              }
            }

            if (job.state === 'completed') {
              clearInterval(pollingInterval);
              setStatus("Analysis Complete! Redirecting...");

              // The backend maps the BullMQ returnvalue to result
              if (job.result && job.result.repositoryId) {
                router.push(`/dashboard/repository/${job.result.repositoryId}`);
              } else {
                setError("Repository imported but ID missing from response.");
              }
            } else if (job.state === 'failed') {
              clearInterval(pollingInterval);
              setError(job.failedReason || "Analysis failed");
            }
          } catch (err: unknown) {
            console.error("Polling error", err);
          }
        }, 2000);

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to start import");
      }
    };

    startImport();

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [url, token, router]);

  return (
    <PageContainer size="narrow">
      <PageHeader
        eyebrow="Repositories"
        title="Import"
        description="We scan the repository and match it against your skills. This can take a minute."
      />

      {!url ? (
        <ErrorState message="Missing repository URL." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : (
        <div className="rounded-md border border-border bg-card p-5">
          <Eyebrow>Importing</Eyebrow>
          <p className="mt-2 font-mono text-sm break-all text-muted-foreground">{url}</p>
          <div className="mt-4 flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3" role="status" aria-live="polite">
            <Spinner />
            <p className="text-sm">{status}</p>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default function ImportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-24">
          <Spinner />
        </div>
      }
    >
      <ImportContent />
    </Suspense>
  );
}
