"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Boxes,
  Container,
  FileText,
  FlaskConical,
  Folder,
  Handshake,
  Scale,
  ScrollText,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Eyebrow, Meter } from "@/components/repo-ui";
import { VisualMap, type ManifestNode, type TreeNode } from "@/components/visual-map";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

/* ─── Analysis ─────────────────────────────────────────────────────────────── */

type KeyFile = { label: string; hint: string; path: string; icon: LucideIcon; isDir?: boolean };

// Files a newcomer should open first, in reading order. First match wins per entry.
const KEY_FILES: { label: string; hint: string; icon: LucideIcon; isDir?: boolean; match: (p: string) => boolean }[] = [
  { label: "README", hint: "What the project is", icon: BookOpen, match: (p) => /^readme(\.\w+)?$/i.test(p) },
  {
    label: "Contributing guide",
    hint: "How to send changes",
    icon: Handshake,
    match: (p) => /^(\.github\/|docs\/)?contributing(\.\w+)?$/i.test(p),
  },
  {
    label: "Code of conduct",
    hint: "Community rules",
    icon: ScrollText,
    match: (p) => /^(\.github\/)?code_of_conduct(\.\w+)?$/i.test(p),
  },
  { label: "License", hint: "How it can be used", icon: Scale, match: (p) => /^(license|licence|copying)(\.\w+)?$/i.test(p) },
  { label: "CI workflows", hint: "Checks your PR must pass", icon: Workflow, isDir: true, match: (p) => p === ".github/workflows" },
  { label: "Docs", hint: "Longer guides", icon: FileText, isDir: true, match: (p) => /^(docs?|documentation)$/i.test(p) },
  {
    label: "Tests",
    hint: "Where to add tests",
    icon: FlaskConical,
    isDir: true,
    match: (p) => /^(tests?|__tests__|spec|specs|e2e)$/i.test(p) || /^[^/]+\/(tests?|__tests__)$/i.test(p),
  },
  {
    label: "Docker",
    hint: "Run it in a container",
    icon: Container,
    match: (p) => /^(dockerfile|docker-compose\.ya?ml|compose\.ya?ml)$/i.test(p),
  },
];

function extensionOf(path: string): string | null {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

const PACKAGE_NAME = /^@?[a-z0-9][\w.\-]*(\/[\w.\-]+)*(\[[\w,\-]+\])?$/i;

const ECOSYSTEMS: [RegExp, string][] = [
  [/package\.json$/, "npm"],
  [/(requirements[^/]*\.txt|pyproject\.toml|setup\.(py|cfg)|Pipfile)$/i, "pip"],
  [/Cargo\.toml$/, "cargo"],
  [/go\.mod$/, "go"],
  [/(pom\.xml|build\.gradle(\.kts)?)$/, "maven"],
  [/Gemfile$/, "gem"],
  [/composer\.json$/, "composer"],
];

function ecosystemOf(path: string) {
  return ECOSYSTEMS.find(([re]) => re.test(path))?.[1] ?? null;
}

function analyze(tree: TreeNode[], manifests: ManifestNode[]) {
  const files = tree.filter((n) => n.type === "blob");
  const folders = tree.filter((n) => n.type === "tree");

  // Top-level areas by file count; root-level files are grouped together
  const areaCounts = new Map<string, number>();
  for (const f of files) {
    const slash = f.path.indexOf("/");
    const area = slash === -1 ? "" : f.path.slice(0, slash);
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  }
  const areas = [...areaCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => Number(a.name.startsWith(".")) - Number(b.name.startsWith(".")) || b.count - a.count);

  const extCounts = new Map<string, number>();
  for (const f of files) {
    const ext = extensionOf(f.path);
    if (ext) extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
  }
  const extensions = [...extCounts.entries()]
    .map(([ext, count]) => ({ ext, count }))
    .sort((a, b) => b.count - a.count);

  const keyFiles: KeyFile[] = [];
  for (const k of KEY_FILES) {
    const hit = tree.find((n) => (k.isDir ? n.type === "tree" : n.type === "blob") && k.match(n.path));
    if (hit) keyFiles.push({ label: k.label, hint: k.hint, icon: k.icon, isDir: k.isDir, path: hit.path });
  }

  const deps = manifests
    .map((m) => {
      const raw = (m.dependencies?.nodes ?? []).map((d) => d.packageName.split(";")[0].trim()).filter(Boolean);
      const packages = [...new Set(raw.filter((p) => PACKAGE_NAME.test(p)))];
      // A manifest the parser misread (code lines, TOML tables) is noise, not dependencies
      const clean = raw.length > 0 && packages.length / raw.length >= 0.8;
      const path = m.blobPath.replace(/^\//, "");
      return { path, ecosystem: ecosystemOf(path), packages: clean ? packages : [] };
    })
    .filter((m) => m.packages.length > 0)
    .sort((a, b) => b.packages.length - a.packages.length);

  return { fileCount: files.length, folderCount: folders.length, areas, extensions, keyFiles, deps };
}

/* ─── UI ───────────────────────────────────────────────────────────────────── */

const MAX_AREAS = 8;
const MAX_PACKAGES = 8;
const MAX_MANIFESTS = 5;
// Emerald steps from strongest to faintest; no gradients, just flat fills
const TYPE_SWATCHES = ["bg-emerald-500", "bg-emerald-500/70", "bg-emerald-500/50", "bg-emerald-500/35", "bg-emerald-500/20"];

function githubPath(repoUrl: string | undefined, path: string, isDir?: boolean) {
  if (!repoUrl) return undefined;
  return `${repoUrl.replace(/\/$/, "")}/${isDir ? "tree" : "blob"}/HEAD/${path}`;
}

function RowLink({ href, className, children }: { href?: string; className?: string; children: React.ReactNode }) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn(className, "transition-colors hover:bg-muted/40")}>
      {children}
    </a>
  );
}

function Overview({
  data,
  repoUrl,
}: {
  data: ReturnType<typeof analyze>;
  repoUrl?: string;
}) {
  const { fileCount, folderCount, areas, extensions, keyFiles, deps } = data;
  const shownAreas = areas.slice(0, MAX_AREAS);
  const otherFiles = areas.slice(MAX_AREAS).reduce((n, a) => n + a.count, 0);
  const depCount = deps.reduce((n, d) => n + d.packages.length, 0);
  const extTotal = extensions.reduce((n, e) => n + e.count, 0) || 1;
  const top = extensions.slice(0, TYPE_SWATCHES.length);
  const rest = extTotal - top.reduce((n, e) => n + e.count, 0);
  const typeSlices = [
    ...top.map((e, i) => ({ ext: e.ext, label: `.${e.ext}`, share: (e.count / extTotal) * 100, swatch: TYPE_SWATCHES[i] })),
    ...(rest > 0 ? [{ ext: "other", label: "other", share: (rest / extTotal) * 100, swatch: "bg-muted-foreground/25" }] : []),
  ];

  return (
    <div className="flex flex-col divide-y divide-border">
      {/* Totals */}
      <div className="grid grid-cols-3 divide-x divide-border">
        {[
          { label: "Files", value: fileCount },
          { label: "Folders", value: folderCount },
          { label: "Dependencies", value: depCount },
        ].map((t) => (
          <div key={t.label} className="px-5 py-4">
            <p className="text-lg font-semibold leading-none tabular-nums">{t.value.toLocaleString()}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>

      {/* File types: one bar, emerald steps for the top types, muted for the rest */}
      {typeSlices.length > 0 && (
        <div className="flex flex-col gap-3 px-5 py-4">
          <Eyebrow>File types</Eyebrow>
          <div className="flex h-2 w-full gap-[3px]" role="img" aria-label="File types by share of files">
            {typeSlices.map((t) => (
              <span
                key={t.ext}
                className={cn("h-full rounded-[1px]", t.swatch)}
                style={{ width: `${t.share}%` }}
                title={`${t.label} · ${t.share.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
            {typeSlices.map((t) => (
              <span key={t.ext} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-[1px]", t.swatch)} aria-hidden />
                <span className="font-mono">{t.label}</span>
                <span className="text-muted-foreground tabular-nums">{Math.round(t.share)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Where the code lives */}
      <div className="flex flex-col py-3">
        <Eyebrow className="px-5 pb-2 pt-1">Where the code lives</Eyebrow>
        <ul>
          {shownAreas.map((a) => (
            <li key={a.name || "(root)"}>
              <RowLink
                href={a.name ? githubPath(repoUrl, a.name, true) : repoUrl}
                className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)_3.5rem] items-center gap-4 px-5 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className={cn("truncate font-mono text-[13px]", !a.name && "text-muted-foreground")}>
                    {a.name ? `${a.name}/` : "root files"}
                  </span>
                </span>
                <Meter value={(a.count / Math.max(fileCount, 1)) * 100} />
                <span className="text-right text-xs text-muted-foreground tabular-nums">{a.count.toLocaleString()}</span>
              </RowLink>
            </li>
          ))}
        </ul>
        {otherFiles > 0 && (
          <p className="px-5 pt-1.5 text-xs text-muted-foreground">
            + {areas.length - MAX_AREAS} more folders · {otherFiles.toLocaleString()} files
          </p>
        )}
      </div>

      {/* Start here */}
      <div className="flex flex-col py-3">
        <Eyebrow className="px-5 pb-2 pt-1">Start here</Eyebrow>
        {keyFiles.length === 0 ? (
          <p className="px-5 py-1.5 text-sm text-muted-foreground">No README, guide or tests found at the top level.</p>
        ) : (
          <ul className="grid sm:grid-cols-2">
            {keyFiles.map((k) => (
              <li key={k.label}>
                <RowLink
                  href={githubPath(repoUrl, k.path, k.isDir)}
                  className="flex items-center gap-2.5 px-5 py-1.5 text-sm"
                >
                  <k.icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-medium" title={k.hint}>{k.label}</span>
                  <span className="ml-auto truncate font-mono text-[11px] text-muted-foreground">
                    {k.path}
                    {k.isDir ? "/" : ""}
                  </span>
                </RowLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dependencies: one row per manifest */}
      {deps.length > 0 && (
        <div className="flex flex-col py-3">
          <Eyebrow className="px-5 pb-2 pt-1">Dependencies</Eyebrow>
          <ul>
            {deps.slice(0, MAX_MANIFESTS).map((m) => (
              <li key={m.path}>
                <RowLink href={githubPath(repoUrl, m.path)} className="flex flex-col gap-0.5 px-5 py-1.5">
                  <span className="flex items-center gap-2 text-sm">
                    <Boxes className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-[13px]">{m.path}</span>
                    {m.ecosystem && <span className="text-xs text-muted-foreground">{m.ecosystem}</span>}
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                      {m.packages.length} {m.packages.length === 1 ? "package" : "packages"}
                    </span>
                  </span>
                  <span className="truncate pl-5.5 text-xs text-muted-foreground">
                    {m.packages.slice(0, MAX_PACKAGES).join(", ")}
                    {m.packages.length > MAX_PACKAGES ? ", …" : ""}
                  </span>
                </RowLink>
              </li>
            ))}
          </ul>
          {deps.length > MAX_MANIFESTS && (
            <p className="px-5 pt-1.5 text-xs text-muted-foreground">+ {deps.length - MAX_MANIFESTS} more manifests</p>
          )}
        </div>
      )}
    </div>
  );
}

export function CodebaseCard({
  folderStructure,
  dependencies,
  repoUrl,
}: {
  folderStructure?: TreeNode[];
  dependencies?: ManifestNode[];
  repoUrl?: string;
}) {
  const [view, setView] = useState<"overview" | "graph">("overview");
  const data = useMemo(
    () => analyze(Array.isArray(folderStructure) ? folderStructure : [], Array.isArray(dependencies) ? dependencies : []),
    [folderStructure, dependencies]
  );
  const hasData = data.fileCount > 0 || data.deps.length > 0;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <h2 className="text-base font-semibold">Codebase</h2>
        {hasData && (
          <SegmentedControl
            size="sm"
            aria-label="Codebase view"
            className="ml-auto"
            value={view}
            onValueChange={setView}
            options={[
              { value: "overview", label: "Overview" },
              { value: "graph", label: "Graph" },
            ]}
          />
        )}
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">This repository hasn&apos;t been mapped yet.</p>
        </div>
      ) : view === "overview" ? (
        <Overview data={data} repoUrl={repoUrl} />
      ) : (
        <VisualMap folderStructure={folderStructure} dependencies={dependencies} />
      )}
    </div>
  );
}
