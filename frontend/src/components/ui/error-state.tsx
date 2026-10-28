"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message?: string;
  digest?: string;
  onRetry?: () => void;
  variant?: "full" | "inline";
}

export function ErrorState({
  message = "An unexpected error occurred. Please try again.",
  digest,
  onRetry,
  variant = "inline",
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 text-center",
        variant === "full" ? "min-h-svh" : "rounded-md border border-dashed py-14"
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium">Something went wrong</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{message}</p>
        {digest && <p className="font-mono text-xs text-muted-foreground">Ref: {digest}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
      )}
    </div>
  );
}
