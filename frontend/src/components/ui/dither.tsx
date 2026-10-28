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

type Direction = "radial" | "top-right" | "top-left" | "bottom-right" | "top" | "bottom" | "right" | "left"

// Intensity 0..1 at a cell for the chosen fade direction
function intensity(x: number, y: number, cols: number, rows: number, direction: Direction): number {
  const nx = cols <= 1 ? 0 : x / (cols - 1)
  const ny = rows <= 1 ? 0 : y / (rows - 1)
  switch (direction) {
    // Densest in the middle, fading to nothing at every edge (no hard cut-offs)
    case "radial":
      return Math.max(0, 1 - Math.hypot((nx - 0.5) / 0.5, (ny - 0.5) / 0.5))
    case "top":
      return 1 - ny
    case "bottom":
      return ny
    case "left":
      return 1 - nx
    case "right":
      return nx
    case "top-left":
      return Math.max(0, 1 - Math.hypot(nx, ny) / Math.SQRT2)
    case "bottom-right":
      return Math.max(0, 1 - Math.hypot(1 - nx, 1 - ny) / Math.SQRT2)
    case "top-right":
    default:
      return Math.max(0, 1 - Math.hypot(1 - nx, ny) / Math.SQRT2)
  }
}

// Every DitherCard draws the same corner pattern, so finished paths are shared
const pathCache = new Map<string, string>()

export function ditherPath(cols: number, rows: number, direction: Direction, falloff: number, peak: number): string {
  const key = `${cols}:${rows}:${direction}:${falloff}:${peak}`
  const cached = pathCache.get(key)
  if (cached !== undefined) return cached

  const parts: string[] = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const value = Math.pow(intensity(x, y, cols, rows, direction), falloff) * peak
      const threshold = (BAYER[y % 4][x % 4] + 0.5) / 16
      if (value > threshold) parts.push(`M${x} ${y}h1v1h-1z`)
    }
  }
  const d = parts.join("")
  pathCache.set(key, d)
  return d
}

interface DitherProps extends React.SVGProps<SVGSVGElement> {
  /** Grid size in cells */
  cols?: number
  rows?: number
  /** Cell size in px */
  cell?: number
  /** Where the pattern is densest */
  direction?: Direction
  /** >1 makes the fade fall off faster */
  falloff?: number
  /** Maximum density (0–1); below 1 so the pattern never turns into a solid block */
  peak?: number
  /** Dots fill in around the pointer (default on) */
  interactive?: boolean
}

// Spotlight radius in screen pixels
const SPOTLIGHT_PX = 75

// Decorative 1-bit ordered-dither fade, drawn in currentColor. Colour and
// opacity come from the className (e.g. "text-emerald-500/30").
function Dither({
  cols = 48,
  rows = 16,
  cell = 4,
  direction = "top-right",
  falloff = 1.4,
  peak = 0.85,
  interactive = true,
  className,
  ...props
}: DitherProps) {
  const path = React.useMemo(() => ditherPath(cols, rows, direction, falloff, peak), [cols, rows, direction, falloff, peak])
  // Same shape, denser: revealed under the pointer
  const litPath = React.useMemo(
    () => (interactive ? ditherPath(cols, rows, direction, falloff * 0.5, Math.min(1, peak + 0.35)) : ""),
    [interactive, cols, rows, direction, falloff, peak]
  )
  const id = React.useId().replace(/:/g, "")
  const svgRef = React.useRef<SVGSVGElement>(null)
  const gradientRef = React.useRef<SVGRadialGradientElement>(null)
  const litRef = React.useRef<SVGGElement>(null)
  useSvgSpotlight(svgRef, gradientRef, litRef, cols, rows, interactive)
  const radius = SPOTLIGHT_PX / cell

  return (
    <svg
      ref={svgRef}
      aria-hidden
      width={cols * cell}
      height={rows * cell}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      className={cn("pointer-events-none select-none", className)}
      {...props}
    >
      <path d={path} fill="currentColor" />
      {interactive && (
        <>
          <defs>
            <radialGradient ref={gradientRef} id={`${id}-g`} gradientUnits="userSpaceOnUse" cx={-1000} cy={-1000} r={radius}>
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={0} y={0} width={cols} height={rows}>
              <rect width={cols} height={rows} fill={`url(#${id}-g)`} />
            </mask>
          </defs>
          <g ref={litRef} mask={`url(#${id}-m)`} style={{ opacity: 0, transition: "opacity 400ms var(--ease-fluid)" }}>
            <path d={litPath} fill="currentColor" />
          </g>
        </>
      )}
    </svg>
  )
}

export { Dither }
