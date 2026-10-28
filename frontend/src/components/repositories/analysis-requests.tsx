"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCw, X } from "lucide-react";
import { RepositoryService, AnalysisRequest } from "@/services/repository.service";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SegmentedMeter, timeAgo } from "@/components/repo-ui";
import { GithubIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const POLL_MS = 4000;

const STATUS_LABEL: Record<AnalysisRequest["status"], string> = {
  queued: "Queued",
  analyzing: "Analyzing",
  failed: "Failed",
};

function StatusBadge({ request }: { request: AnalysisRequest }) {
  const percent = request.progress?.percent;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
        request.status === "queued" && "bg-muted text-muted-foreground",
        request.status === "analyzing" && "bg-tint-emerald-500 text-emerald-700 dark:text-emerald-300",
        request.status === "failed" && "bg-tint-red-500 text-red-700 dark:text-red-300"
      )}
    >
      {request.status === "analyzing" && <Spinner className="size-3 text-current" />}
      {STATUS_LABEL[request.status]}
      {request.status === "analyzing" && typeof percent === "number" && ` ${Math.round(percent)}%`}
    </span>
  );
}

/**
 * Repositories you asked OSCA to analyze that aren't imports yet. Polls while any
 * are queued or analyzing; when one finishes it drops off here and `onFinished`
 * refreshes the imported list it now belongs to.
 */
export function AnalysisRequests({ token, onFinished }: { token: string; onFinished: () => void }) {
  const [requests, setRequests] = useState<AnalysisRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const known = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const next = await RepositoryService.listAnalysisRequests(token);
      const ids = new Set(next.map((r) => r.id));
      // Something that was in progress is gone: it finished and is now an import
      const finished = [...known.current].some((id) => !ids.has(id));
      known.current = new Set(next.filter((r) => r.status !== "failed").map((r) => r.id));
      setRequests(next);
      if (finished) onFinished();
    } catch (err) {
      console.error(err);
    }
  }, [token, onFinished]);

  useEffect(() => {
    load();
  }, [load]);

  const active = requests.some((r) => r.status !== "failed");
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [active, load]);

  const retry = async (request: AnalysisRequest) => {
    setBusy(request.id);
    try {
      await RepositoryService.analyzeRepository(request.url, token);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't retry the analysis.");
    } finally {
      setBusy(null);
    }
  };

  const dismiss = async (request: AnalysisRequest) => {
    setBusy(request.id);
    try {
      await RepositoryService.dismissAnalysisRequest(request.id, token);
      setRequests((list) => list.filter((r) => r.id !== request.id));
    } catch {
      toast.error("Couldn't dismiss it.");
    } finally {
      setBusy(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-md border border-border bg-card" aria-label="Analyses in progress">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <h2 className="text-base font-semibold">In progress</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{requests.length}</span>
        <p className="ml-auto hidden text-xs text-muted-foreground sm:block">Analyses usually take a minute or two.</p>
      </div>
      <ul className="divide-y divide-border">
        {requests.map((request) => (
          <li key={request.id} className="flex flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <a
                  href={`https://github.com/${request.fullName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-0 items-center gap-1.5 truncate text-sm font-medium hover:underline"
                >
                  <GithubIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{request.fullName}</span>
                </a>
                <StatusBadge request={request} />
              </div>
              {request.status === "analyzing" && typeof request.progress?.percent === "number" && (
                <SegmentedMeter value={request.progress.percent} segments={32} className="max-w-sm" />
              )}
              <p className={cn("text-xs", request.status === "failed" ? "text-red-700 dark:text-red-300" : "text-muted-foreground")}>
                {request.status === "failed"
                  ? request.error ?? "The analysis failed."
                  : request.status === "analyzing"
                    ? request.progress?.message ?? "Analyzing…"
                    : `Waiting for a free worker · requested ${timeAgo(request.createdAt)}`}
              </p>
            </div>
            {request.status === "failed" && (
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" disabled={busy === request.id} onClick={() => retry(request)}>
                  {busy === request.id ? <Spinner className="text-current" /> : <RotateCw />} Retry
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Dismiss ${request.fullName}`} disabled={busy === request.id} onClick={() => dismiss(request)}>
                  <X />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
