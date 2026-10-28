"use client";

import { INTEREST_AREAS } from "@/constants/interests";
import { cn } from "@/lib/utils";

/** Toggleable chips for what someone wants to work on */
export function InterestPicker({ selected, onToggle }: { selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {INTEREST_AREAS.map(({ value, label }) => {
        const on = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(value)}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-sm transition-colors",
              on
                ? "border-emerald-500/40 bg-tint-emerald-500 font-medium text-emerald-700 dark:text-emerald-300"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
