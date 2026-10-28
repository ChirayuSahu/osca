import * as React from "react"

import { cn } from "@/lib/utils"

interface PageHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Sans title; wrap the key word in <em> for the serif italic, e.g. <>Search <em>repositories</em></> */
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}

// Page heading: title (sans, with a serif italic word), subtitle and actions.
function PageHeader({ title, description, actions, className, children, ...props }: PageHeaderProps) {
  return (
    <div data-slot="page-header" className={cn("flex flex-col gap-5", className)} {...props}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight md:text-4xl [&_em]:font-serif [&_em]:font-medium [&_em]:italic">
            {title}
          </h1>
          {description && <p className="max-w-2xl text-[15px] leading-relaxed text-foreground/75">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {children}
    </div>
  )
}

export { PageHeader }
