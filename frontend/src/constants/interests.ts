// Interest areas for onboarding and Settings; values match the backend's
// INTEREST_AREAS (lib/text/keywords.ts), which maps each to project keywords.
export const INTEREST_AREAS = [
  { value: "web", label: "Web frontends" },
  { value: "backend", label: "APIs & backends" },
  { value: "mobile", label: "Mobile apps" },
  { value: "ai", label: "AI & machine learning" },
  { value: "data", label: "Data & analytics" },
  { value: "devtools", label: "Developer tools & CLIs" },
  { value: "devops", label: "DevOps & cloud" },
  { value: "games", label: "Games & graphics" },
  { value: "security", label: "Security & privacy" },
  { value: "docs", label: "Docs & education" },
  { value: "systems", label: "Systems & compilers" },
  { value: "design", label: "Design & UI" },
] as const;

/** Fired when preferences that shape recommendations change, so open feeds reload */
export const PREFERENCES_CHANGED = "osca:preferences-changed";
