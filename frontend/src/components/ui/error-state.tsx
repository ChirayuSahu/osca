"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

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
  if (variant === "full") {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black text-white p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-500/[0.04] blur-[110px] pointer-events-none" />
        <div className="absolute -right-24 -top-24 w-[300px] h-[300px] rounded-full bg-emerald-400/[0.03] blur-[90px] pointer-events-none" />

        <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center space-y-6 p-8 rounded-3xl border border-white/[0.04] bg-neutral-950/40 backdrop-blur-md">
          <ErrorIcon />
          <ErrorText message={message} digest={digest} />
          {onRetry && <RetryButton onRetry={onRetry} />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-red-500/20 rounded-3xl bg-gradient-to-b from-red-500/5 to-transparent relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
      <div className="relative z-10 flex flex-col items-center space-y-4">
        <ErrorIcon />
        <ErrorText message={message} digest={digest} />
        {onRetry && <RetryButton onRetry={onRetry} />}
      </div>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.1)]">
      <AlertTriangle className="w-6 h-6 text-red-400" />
    </div>
  );
}

function ErrorText({ message, digest }: { message: string; digest?: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-medium tracking-tight text-neutral-100">
        Something went wrong
      </h2>
      <p className="text-sm text-neutral-500 font-light leading-relaxed max-w-sm">
        {message}
      </p>
      {digest && (
        <p className="text-[11px] text-neutral-700 font-mono pt-1">
          Error ID: {digest}
        </p>
      )}
    </div>
  );
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      onClick={onRetry}
      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-sm font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5"
    >
      <RotateCcw className="w-4 h-4" />
      Try again
    </button>
  );
}