import * as React from "react"

import { cn } from "@/lib/utils"
import { Dither } from "@/components/ui/dither"

interface PageHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode
  description?: React.ReactNode
  /** Small label above the title, e.g. the section ("Discover") */
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
}

// Page heading: eyebrow, italic display title, muted subtitle and actions,
// over a soft emerald dither cloud on the right that fades out on every side.
function PageHeader({ title, description, eyebrow, actions, className, children, ...props }: PageHeaderProps) {
  return (
    <div data-slot="page-header" className={cn("relative isolate flex flex-col gap-4", className)} {...props}>
      <Dither
        cols={120}
        rows={34}
        cell={4}
        direction="radial"
        falloff={1.2}
        peak={0.75}
        className="absolute -top-8 -right-6 -z-10 text-emerald-500/[0.16]"
      />

      {eyebrow && (
        <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {eyebrow}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight italic md:text-5xl">{title}</h1>
          {description && <p className="max-w-2xl text-base text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {children}

      <div className="mt-2 h-px bg-border" />
    </div>
  )
}

export { PageHeader }
