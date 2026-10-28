"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { AppSidebar } from "@/components/app-sidebar";
import { AppBreadcrumbs, BreadcrumbProvider } from "@/components/breadcrumbs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
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
      <SidebarInset>
        {/* Phones only: the sidebar is a drawer there, so it needs an opener */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b bg-background px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
        </header>
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
