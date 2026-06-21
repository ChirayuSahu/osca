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

  const [status, setStatus] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url || !token) return;

    let pollingInterval: NodeJS.Timeout;

    const startImport = async () => {
      try {
        setStatus("Starting analysis...");
        const response = await RepositoryService.analyzeRepository(url, token);
        const jobId = response.data.id;

        // Poll job status
        pollingInterval = setInterval(async () => {
          try {
            const jobRes = await JobService.getJob(jobId, token);
            const job = jobRes.data;

            if (job.progress && typeof job.progress === 'object') {
              setProgress(job.progress.percent || 0);
              if (job.progress.message) {
                setStatus(job.progress.message);
              }
            } else if (typeof job.progress === 'number') {
              setProgress(job.progress);
            }

            if (job.state === 'completed') {
              clearInterval(pollingInterval);
              setStatus("Complete! Redirecting...");
              setProgress(100);
              
              // The worker returns repositoryId
              if (job.returnvalue && job.returnvalue.repositoryId) {
                router.push(`/dashboard/repository/${job.returnvalue.repositoryId}`);
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
    <div className="max-w-2xl mx-auto mt-20 p-8 bg-neutral-950 border border-white/[0.04] rounded-2xl text-center">
      <h1 className="text-xl font-medium text-white mb-6">Importing Repository</h1>
      
      {error ? (
        <div className="text-red-400 bg-red-500/10 p-4 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-neutral-400 text-sm">{status}</p>
          <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-neutral-500">{progress}%</p>
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
