"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

// Pages with dynamic segments (repo name, issue number) register labels here.
const LabelsContext = React.createContext<{
  labels: Record<string, string>;
  setLabel: (href: string, label: string | null) => void;
} | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const setLabel = React.useCallback((href: string, label: string | null) => {
    setLabels((prev) => {
      if (label === null) {
        if (!(href in prev)) return prev;
        const next = { ...prev };
        delete next[href];
        return next;
      }
      return prev[href] === label ? prev : { ...prev, [href]: label };
    });
  }, []);
  const value = React.useMemo(() => ({ labels, setLabel }), [labels, setLabel]);
  return <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>;
}

/** Give the crumb for `href` a readable label (e.g. the repo's full name) */
export function useBreadcrumbLabel(href: string, label: string | null | undefined) {
  const ctx = React.useContext(LabelsContext);
  const setLabel = ctx?.setLabel;
  React.useEffect(() => {
    if (!setLabel || !label) return;
    setLabel(href, label);
    return () => setLabel(href, null);
  }, [setLabel, href, label]);
}

// Trail for nested dashboard pages; dynamic segments are filled from labels.
function crumbsFor(pathname: string, labels: Record<string, string>): Crumb[] {
  const p = pathname.replace(/\/$/, "");
  // Only nested pages get a trail; top-level pages are already in the sidebar.
  if (p.startsWith("/dashboard/repository/import"))
    return [{ label: "Repositories", href: "/dashboard/imported-repos" }, { label: "Import" }];

  const thread = p.match(/^\/dashboard\/repository\/([^/]+)\/threads\/([^/]+)/);
  if (thread) {
    const repoHref = `/dashboard/repository/${thread[1]}`;
    return [
      { label: "Repositories", href: "/dashboard/imported-repos" },
      { label: labels[repoHref] ?? "Repository", href: repoHref },
      { label: labels[p] ?? `#${thread[2]}` },
    ];
  }
  const repo = p.match(/^\/dashboard\/repository\/([^/]+)/);
  if (repo) {
    return [
      { label: "Repositories", href: "/dashboard/imported-repos" },
      { label: labels[`/dashboard/repository/${repo[1]}`] ?? "Repository" },
    ];
  }
  return [];
}

export function AppBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const ctx = React.useContext(LabelsContext);
  const crumbs = crumbsFor(pathname, ctx?.labels ?? {});
  if (crumbs.length === 0) return <div aria-hidden className="h-6 md:h-8" />;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex h-12 items-center", className)}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-foreground">{crumb.label}</span>
              ) : crumb.href ? (
                <Link href={crumb.href} className="truncate transition-colors hover:text-foreground">{crumb.label}</Link>
              ) : (
                <span className="truncate">{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
