"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { AppSidebar } from "@/components/app-sidebar";
import { AppBreadcrumbs, BreadcrumbProvider } from "@/components/breadcrumbs";
import dynamic from "next/dynamic";
import { GithubReconnectBanner } from "@/components/github-reconnect-banner";

// Only people who haven't onboarded yet download the dialog
const OnboardingDialog = dynamic(() => import("@/components/onboarding-dialog").then((m) => m.OnboardingDialog), { ssr: false });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [token, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      {user && user.onboardedAt === null && <OnboardingDialog />}
      <SidebarInset>
        {/* Phones only: the sidebar is a drawer there, so it needs an opener */}
        <header className="sticky top-0 z-20 grid h-14 shrink-0 grid-cols-[2rem_1fr_2rem] items-center border-b border-border bg-background px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Link href="/dashboard" aria-label="osca home" className="justify-self-center font-serif text-[22px] font-semibold italic leading-none tracking-tight">
            osca
          </Link>
        </header>
        <GithubReconnectBanner />
        <BreadcrumbProvider>
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
            <AppBreadcrumbs />
          </div>
          <div className="flex flex-1 flex-col overflow-x-clip">{children}</div>
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
