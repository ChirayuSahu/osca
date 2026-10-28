"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// One look for every "pick one of a few" switch: view toggles, card filters and page tabs.
// The Tabs primitive reuses these classes so tabbed pages match.
export const segmentedListVariants = {
  default: "inline-flex h-9 w-fit items-center rounded-md bg-muted p-1 text-sm",
  sm: "inline-flex h-8 w-fit items-center rounded-md bg-muted p-1 text-xs",
}

export const segmentedItemVariants = {
  default: "h-7 px-2.5",
  sm: "h-6 px-2",
}

export const segmentedItemBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"

export const segmentedItemActive = "bg-background text-foreground shadow-xs"

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  icon?: LucideIcon
}

interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  size?: "default" | "sm"
  className?: string
  "aria-label"?: string
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = "default",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} data-slot="segmented-control" className={cn(segmentedListVariants[size], className)}>
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const active = optionValue === value
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(optionValue)}
            className={cn(segmentedItemBase, segmentedItemVariants[size], active && segmentedItemActive)}
          >
            {Icon && <Icon />}
            {label}
          </button>
        )
      })}
    </div>
  )
}
