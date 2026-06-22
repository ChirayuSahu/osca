"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RepositoryService } from "@/services/repository.service";
import { JobService } from "@/services/job.service";

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
          } catch (err: any) {
            console.error("Polling error", err);
          }
        }, 2000);

      } catch (err: any) {
        setError(err.message || "Failed to start import");
      }
    };

    startImport();

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [url, token, router]);

  if (!url) {
    return <div className="text-red-500 text-center mt-20">Missing repository URL</div>;
  }

  return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center space-y-12 max-w-2xl mx-auto z-10 relative">
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />

      {error ? (
        <div className="w-full text-red-400 bg-red-500/10 border border-red-500/20 p-6 rounded-[24px]">
          <p className="font-medium mb-1">Import Failed</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      ) : (
        <div className="space-y-12 flex flex-col items-center w-full z-10">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white leading-none">
              Importing <span className="font-serif italic font-medium text-neutral-200">Repository</span>
            </h1>
            <p className="text-neutral-400 text-sm md:text-base font-light max-w-lg mx-auto">
              This process takes a little time. We are thoroughly scanning the repository's architecture, matching it against your interests, and generating personalized recommendations.
            </p>
          </div>

          <div className="relative w-24 h-24 flex items-center justify-center mt-4">
            <div className="absolute inset-0 border-t-2 border-emerald-500/40 rounded-full animate-spin duration-1000"></div>
            <div className="absolute inset-3 border-r-2 border-emerald-400/20 rounded-full animate-spin duration-700 reverse"></div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-full animate-pulse blur-md"></div>
          </div>

          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/[0.02] border border-white/[0.03] rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-emerald-400/90 text-sm font-medium tracking-wide">{status}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="text-center mt-20">Loading...</div>}>
      <ImportContent />
    </Suspense>
  );
}
