"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useSvgSpotlight } from "@/components/ui/pointer-tracker"

// 4×4 Bayer matrix for ordered dithering
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

interface DitheredImageProps extends Omit<React.SVGProps<SVGSVGElement>, "children"> {
  src: string
  /** Sampling grid (square), in cells */
  cols?: number
  /** Cell size in px */
  cell?: number
  /** Dot where the image is light instead of dark */
  invert?: boolean
  /** Rendered if the image can't be read (e.g. no CORS) */
  fallback?: React.ReactNode
  /** The image brightens around the pointer (default on) */
  interactive?: boolean
}

// Spotlight radius in screen pixels
const SPOTLIGHT_PX = 80

// Finished paths (null = image unreadable), shared across cards and page visits,
// and in-flight work so cards with the same owner download the avatar once.
const done = new Map<string, string | null>()
const pending = new Map<string, Promise<string | null>>()

function ditherImage(src: string, cols: number, invert: boolean): Promise<string | null> {
  const key = `${src}|${cols}|${invert ? 1 : 0}`
  const inFlight = pending.get(key)
  if (inFlight) return inFlight

  const work = new Promise<string | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.decoding = "async"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = cols
        canvas.height = cols
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) throw new Error("no 2d context")
        ctx.drawImage(img, 0, 0, cols, cols)
        const { data } = ctx.getImageData(0, 0, cols, cols)

        const parts: string[] = []
        for (let y = 0; y < cols; y++) {
          for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4
            const alpha = data[i + 3] / 255
            const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
            const ink = alpha * (invert ? lum : 1 - lum)
            const threshold = (BAYER[y % 4][x % 4] + 0.5) / 16
            if (ink > threshold) parts.push(`M${x} ${y}h1v1h-1z`)
          }
        }
        resolve(parts.join(""))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  }).then((path) => {
    done.set(key, path)
    pending.delete(key)
    return path
  })

  pending.set(key, work)
  return work
}

// Redraws an image (e.g. a GitHub avatar) as 1-bit ordered-dither dots in
// currentColor, for decorative backgrounds. The image needs CORS
// (avatars.githubusercontent.com allows it). Work starts only once the element
// is near the viewport, and results are cached for the session.
function DitheredImage({
  src,
  cols = 48,
  cell = 4,
  invert = false,
  fallback = null,
  interactive = true,
  className,
  ...props
}: DitheredImageProps) {
  const key = `${src}|${cols}|${invert ? 1 : 0}`
  const cached = done.get(key)
  const [path, setPath] = React.useState<string | null | undefined>(cached)
  // Fade in only when drawn fresh; cached art appears instantly on revisits
  const [fresh, setFresh] = React.useState(false)
  const anchorRef = React.useRef<HTMLSpanElement>(null)
  const id = React.useId().replace(/:/g, "")
  const svgRef = React.useRef<SVGSVGElement>(null)
  const gradientRef = React.useRef<SVGRadialGradientElement>(null)
  const litRef = React.useRef<SVGGElement>(null)
  useSvgSpotlight(svgRef, gradientRef, litRef, cols, cols, interactive && typeof path === "string")

  React.useEffect(() => {
    const hit = done.get(key)
    if (hit !== undefined) {
      setPath(hit)
      return
    }
    setPath(undefined)

    let cancelled = false
    const start = () =>
      ditherImage(src, cols, invert).then((result) => {
        if (cancelled) return
        setFresh(true)
        setPath(result)
      })

    const el = anchorRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      start()
      return () => {
        cancelled = true
      }
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect()
          start()
        }
      },
      { rootMargin: "300px" }
    )
    observer.observe(el)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [key, src, cols, invert])

  if (path === null) return <>{fallback}</>
  if (path === undefined) {
    // Invisible placeholder the observer can watch until the art is ready
    return <span ref={anchorRef} aria-hidden className="block" style={{ width: cols * cell, height: cols * cell }} />
  }

  return (
    <svg
      ref={svgRef}
      aria-hidden
      width={cols * cell}
      height={cols * cell}
      viewBox={`0 0 ${cols} ${cols}`}
      shapeRendering="crispEdges"
      className={cn("pointer-events-none select-none", fresh && "animate-in fade-in duration-700", className)}
      {...props}
    >
      <path d={path} fill="currentColor" />
      {interactive && (
        <>
          <defs>
            <radialGradient ref={gradientRef} id={`${id}-g`} gradientUnits="userSpaceOnUse" cx={-1000} cy={-1000} r={SPOTLIGHT_PX / cell}>
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={0} y={0} width={cols} height={cols}>
              <rect width={cols} height={cols} fill={`url(#${id}-g)`} />
            </mask>
          </defs>
          {/* The logo's own dots, drawn twice more under the pointer so it glows there */}
          <g ref={litRef} mask={`url(#${id}-m)`} style={{ opacity: 0, transition: "opacity 400ms var(--ease-fluid)" }}>
            <path d={path} fill="currentColor" />
            <path d={path} fill="currentColor" />
          </g>
        </>
      )}
    </svg>
  )
}

export { DitheredImage }
export { githubAvatarUrl } from "@/lib/github-avatar"
