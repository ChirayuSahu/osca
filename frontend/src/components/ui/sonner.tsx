"use client"

import { useTheme } from "next-themes"
import { CircleAlert, CircleCheck, Info, Loader2, TriangleAlert } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      gap={8}
      offset={24}
      mobileOffset={16}
      icons={{
        success: <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />,
        error: <CircleAlert className="size-4 text-red-600 dark:text-red-400" />,
        warning: <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" />,
        info: <Info className="size-4 text-muted-foreground" />,
        loading: <Loader2 className="size-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "osca-toast flex w-full cursor-default items-start gap-3 overflow-hidden rounded-md border border-border bg-popover py-3 pl-3.5 pr-3 text-popover-foreground shadow-md",
          // relative: sonner centres its loading spinner absolutely inside this slot
          icon: "relative mt-0.5 flex size-4 shrink-0 items-center justify-center",
          content: "flex min-w-0 flex-1 flex-col gap-0.5 py-px",
          title: "text-sm font-medium leading-snug",
          description: "!text-muted-foreground text-xs leading-relaxed",
          actionButton:
            "h-7 shrink-0 cursor-pointer self-center rounded-md border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted",
          cancelButton:
            "h-7 shrink-0 cursor-pointer self-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
