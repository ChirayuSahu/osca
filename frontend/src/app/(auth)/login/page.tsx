"use client";

import React, { useState, Suspense } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Code2, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

// Custom Github SVG Icon to bypass Lucide version export issues
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

function LoginContent() {
  const { loginWithGithub, loading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const handleLogin = () => {
    setIsRedirecting(true);
    loginWithGithub();
  };

  const isLoading = authLoading || isRedirecting;

  let errorMessage = "";
  if (error === "access_denied") {
    errorMessage = errorDescription ? decodeURIComponent(errorDescription).replace(/\+/g, ' ') : "You denied the authorization request.";
  } else if (error === "session_error") {
    errorMessage = "Failed to establish a secure session. Please try again.";
  } else if (error === "invalid_params") {
    errorMessage = "Authentication request is missing required parameters.";
  } else if (error) {
    errorMessage = errorDescription ? decodeURIComponent(errorDescription).replace(/\+/g, ' ') : "An unexpected authentication error occurred. Please try again.";
  }

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center px-4 select-none relative">
      {/* Subtle Background Glow */}
      <div className="absolute right-1/2 translate-x-1/2 top-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-emerald-500/[0.03] blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] p-8 border border-white/[0.04] rounded-3xl bg-neutral-950/40 backdrop-blur-2xl space-y-8 shadow-2xl z-10 relative flex flex-col items-center text-center">
        
        {/* Brand Header Icon */}
        <div className="p-4 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
          <Code2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-light tracking-tight text-white leading-none">
            Welcome to <span className="font-serif italic font-medium text-neutral-200">osca</span>
          </h1>
          <p className="text-xs text-neutral-400 font-light leading-relaxed px-4">
            Connect your GitHub account to dynamically match and contribute to recommended open-source projects.
          </p>
        </div>

        <div className="w-full flex flex-col gap-4">
          {/* Error Notification Banner */}
          {errorMessage && (
            <div className="w-full flex items-start gap-3 p-3 text-left bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-normal">{errorMessage}</p>
            </div>
          )}

          <div className="w-full">
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            variant="outline"
            className="w-full flex items-center justify-center gap-3 h-12 border border-white/[0.06] hover:border-emerald-500/20 bg-neutral-950/60 hover:bg-emerald-500/[0.01] text-white hover:text-emerald-400 font-normal rounded-xl transition-all duration-300 shadow-md group disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <GithubIcon className="text-neutral-400 group-hover:text-emerald-400 transition-colors" />
            )}
            <span>
              {isRedirecting
                ? "Connecting to GitHub..."
                : authLoading
                ? "Checking session..."
                : "Continue with GitHub"}
            </span>
          </Button>
        </div>
        </div>

        <div className="text-[10px] text-neutral-500 font-light leading-normal">
          By signing in, you agree to our Terms of Service <br /> and Privacy Guidelines.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[85vh] w-full flex items-center justify-center px-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
