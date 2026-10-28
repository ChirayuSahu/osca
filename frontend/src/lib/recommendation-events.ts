import { API_URL } from "@/lib/api";
import type { FeedItem } from "@/types/feed";

// What people do with recommendations, sent to the backend in small batches.
// It's how the ranking learns each person's taste and how we measure whether
// recommendations lead anywhere. Fire-and-forget: tracking never blocks the UI.

export type RecommendationEventType = "impression" | "open" | "github" | "like" | "hide" | "unhide" | "skip" | "issue_open";
export type RecommendationSurface = "feed" | "focus" | "issues" | "repository";

type TrackedEvent = {
  type: RecommendationEventType;
  surface: RecommendationSurface;
  repositoryId?: string;
  issueUrl?: string;
  position?: number;
  explore?: boolean;
  breakdown?: Record<string, number>;
};

const FLUSH_MS = 3000;
const FLUSH_AT = 20;
const MAX_BATCH = 50;

const queue: TrackedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

const flush = (keepalive = false) => {
  if (timer) clearTimeout(timer);
  timer = null;
  if (queue.length === 0) return;
  let token: string | null = null;
  try {
    token = localStorage.getItem("osca_token");
  } catch {
    // no storage: nothing to authenticate with
  }
  const batch = queue.splice(0, MAX_BATCH);
  if (!token) return;
  void fetch(`${API_URL}/recommendations/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ events: batch }),
    keepalive,
  }).catch(() => {});
  if (queue.length > 0) flush(keepalive);
};

export const trackRecommendation = (event: TrackedEvent) => {
  if (typeof window === "undefined") return;
  if (!listening) {
    // Leaving the page shouldn't lose the last few events
    window.addEventListener("pagehide", () => flush(true));
    listening = true;
  }
  queue.push(event);
  if (queue.length >= FLUSH_AT) flush();
  else if (!timer) timer = setTimeout(() => flush(), FLUSH_MS);
};

/** An event about a feed item, carrying its score breakdown so the ranking can learn */
export const trackFeedItem = (
  item: FeedItem,
  type: RecommendationEventType,
  surface: RecommendationSurface,
  position?: number
) => {
  const b = item.scoreInfo.breakdown;
  trackRecommendation({
    type,
    surface,
    repositoryId: item.repository.id,
    position,
    explore: !!item.scoreInfo.reasons?.some((r) => r.kind === "explore"),
    breakdown: b.fallback
      ? undefined
      : {
          content: b.contentScore,
          collab: b.collabScore,
          topic: b.topicScore,
          keyword: b.keywordScore ?? 0,
          stars: b.starsScore ?? 0,
          approachability: b.approachabilityScore ?? 0,
        },
  });
};
