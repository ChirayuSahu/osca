import {
  Activity,
  Code2,
  Compass,
  GitMerge,
  Hash,
  MessageCircle,
  Sprout,
  Tags,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Reason, ReasonKind } from "@/types/feed";
import { cn } from "@/lib/utils";

const ICONS: Record<ReasonKind, LucideIcon> = {
  preferred: Target,
  language: Code2,
  keywords: Tags,
  topics: Hash,
  people: Users,
  starters: Sprout,
  merges: GitMerge,
  responsive: MessageCircle,
  active: Activity,
  explore: Compass,
};

/** "Why this?" list for a recommendation: plain icons, short facts, strongest first */
export function Reasons({ reasons, max = 3, className }: { reasons?: Reason[]; max?: number; className?: string }) {
  if (!reasons?.length) return null;
  return (
    <ul className={cn("flex flex-col gap-1.5 text-xs text-muted-foreground", className)} aria-label="Why this was recommended">
      {reasons.slice(0, max).map((reason) => {
        const Icon = ICONS[reason.kind] ?? Sprout;
        return (
          <li key={reason.kind} className="flex items-start gap-2">
            <Icon className="mt-px size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span className="min-w-0">{reason.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
