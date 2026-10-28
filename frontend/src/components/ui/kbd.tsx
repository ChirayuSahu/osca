import * as React from "react"

import { cn } from "@/lib/utils"

/** A keyboard key, e.g. <Kbd>Enter</Kbd> */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-border bg-muted px-1 font-sans text-[11px] font-medium text-foreground/80",
        "[&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

/** Keys pressed together or as alternatives, e.g. ← → */
function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="kbd-group" className={cn("inline-flex items-center gap-1", className)} {...props} />
}

export { Kbd, KbdGroup }
