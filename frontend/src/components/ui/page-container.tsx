import * as React from "react"

import { cn } from "@/lib/utils"

// Uniform content width, padding and vertical rhythm for every dashboard page.
function PageContainer({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "narrow" | "wide" }) {
  return (
    <div
      data-slot="page-container"
      className={cn(
        "relative mx-auto flex w-full flex-col gap-8 px-4 pt-2 pb-16 md:px-6",
        size === "narrow" && "max-w-3xl",
        size === "default" && "max-w-7xl",
        size === "wide" && "max-w-[1400px]",
        className
      )}
      {...props}
    >
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-8 duration-500">{children}</div>
    </div>
  )
}

export { PageContainer }
