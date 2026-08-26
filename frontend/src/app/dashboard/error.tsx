"use client";
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorState variant="full" message={error.message} digest={error.digest} onRetry={reset} />;
}