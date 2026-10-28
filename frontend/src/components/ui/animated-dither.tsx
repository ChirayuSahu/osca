"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { subscribePointer } from "@/components/ui/pointer-tracker"

// 4×4 Bayer matrix for ordered dithering
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

interface AnimatedDitherProps {
  /** Grid size in cells */
  cols?: number
  rows?: number
  /** Cell size in px */
  cell?: number
  /** >1 makes the radial fade fall off faster */
  falloff?: number
  /** Maximum density (0–1) */
  peak?: number
  /** Frames per second; low keeps it calm (and cheap) */
  fps?: number
  /** Dots gather around the pointer and a click sends out a ripple (default on) */
  interactive?: boolean
  className?: string
}

// Pointer glow radius and strength, in cells / added density
const GLOW_RADIUS = 14
const GLOW_STRENGTH = 0.55
// Click ripples: how fast the ring grows (cells per second), its width, its life
const RIPPLE_SPEED = 55
const RIPPLE_WIDTH = 3
const RIPPLE_LIFE = 1.4

// The radial 1-bit dither, alive: slow waves drift through its density so dots
// appear and fade in place. Drawn on a canvas in currentColor; pauses when
// off-screen or in a background tab, and holds still for reduced motion.
function AnimatedDither({
  cols = 160,
  rows = 70,
  cell = 5,
  falloff = 1.3,
  peak = 0.6,
  fps = 12,
  interactive = true,
  className,
}: AnimatedDitherProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = cols * cell * dpr
    canvas.height = rows * cell * dpr
    ctx.scale(dpr, dpr)

    // The radial fade never changes; only the wave on top of it moves
    const base = new Float32Array(cols * rows)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = cols <= 1 ? 0 : x / (cols - 1)
        const ny = rows <= 1 ? 0 : y / (rows - 1)
        const r = Math.max(0, 1 - Math.hypot((nx - 0.5) / 0.5, (ny - 0.5) / 0.5))
        base[y * cols + x] = Math.pow(r, falloff) * peak
      }
    }

    // Pointer in cell coordinates: the target, and a smoothed position that trails it
    const pointer = { tx: -1e4, ty: -1e4, x: -1e4, y: -1e4, active: false }
    const ripples: { x: number; y: number; start: number }[] = []

    const draw = (t: number) => {
      ctx.clearRect(0, 0, cols * cell, rows * cell)
      ctx.fillStyle = getComputedStyle(canvas).color
      if (pointer.active) {
        pointer.x += (pointer.tx - pointer.x) * 0.25
        pointer.y += (pointer.ty - pointer.y) * 0.25
      }
      while (ripples.length && t - ripples[0].start > RIPPLE_LIFE) ripples.shift()
      for (let y = 0; y < rows; y++) {
        const ny = y / rows
        for (let x = 0; x < cols; x++) {
          const b = base[y * cols + x]
          if (b <= 0) continue
          const nx = x / cols
          // Two slow, crossing waves keep the motion organic without looking busy
          const wave = 0.5 + 0.25 * Math.sin(nx * 7 + t * 0.55) + 0.25 * Math.cos(ny * 6 - t * 0.4 + nx * 2)
          let value = b * (0.55 + 0.45 * wave)
          if (pointer.active) {
            const d2 = ((x - pointer.x) ** 2 + (y - pointer.y) ** 2) / (GLOW_RADIUS * GLOW_RADIUS)
            if (d2 < 4) value += GLOW_STRENGTH * Math.exp(-d2) * Math.sqrt(b / peak)
          }
          for (const r of ripples) {
            const age = t - r.start
            const ring = Math.abs(Math.hypot(x - r.x, y - r.y) - age * RIPPLE_SPEED)
            if (ring < RIPPLE_WIDTH) value += 0.5 * (1 - ring / RIPPLE_WIDTH) * (1 - age / RIPPLE_LIFE)
          }
          if (value > (BAYER[y % 4][x % 4] + 0.5) / 16) ctx.fillRect(x * cell, y * cell, cell, cell)
        }
      }
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) {
      draw(0)
      return
    }

    // Pointer position in cells; the glow follows it while it's over or near the canvas
    const toCells = (px: number, py: number) => {
      const rect = canvas.getBoundingClientRect()
      return { x: ((px - rect.left) / rect.width) * cols, y: ((py - rect.top) / rect.height) * rows, rect }
    }
    const unsubscribe = interactive
      ? subscribePointer((px, py) => {
          const { x, y } = toCells(px, py)
          const inside = x > -GLOW_RADIUS && x < cols + GLOW_RADIUS && y > -GLOW_RADIUS && y < rows + GLOW_RADIUS
          if (inside && !pointer.active) {
            pointer.x = x
            pointer.y = y
          }
          pointer.active = inside
          pointer.tx = x
          pointer.ty = y
        })
      : () => {}
    // Clicks anywhere over the canvas area send out a ripple (the canvas itself ignores pointer events)
    const onPointerDown = (e: PointerEvent) => {
      const { x, y } = toCells(e.clientX, e.clientY)
      if (x < 0 || y < 0 || x > cols || y > rows) return
      ripples.push({ x, y, start: performance.now() / 1000 })
      if (ripples.length > 4) ripples.shift()
    }
    if (interactive) window.addEventListener("pointerdown", onPointerDown, { passive: true })

    let frame = 0
    let last = 0
    let visible = true
    const interval = 1000 / fps
    // Smoother while the pointer is interacting; calm (and cheap) otherwise
    const activeInterval = 1000 / 30
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      const wait = pointer.active || ripples.length > 0 ? activeInterval : interval
      if (!visible || document.hidden || now - last < wait) return
      last = now
      draw(now / 1000)
    }
    frame = requestAnimationFrame(loop)

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      unsubscribe()
      window.removeEventListener("pointerdown", onPointerDown)
    }
  }, [cols, rows, cell, falloff, peak, fps, interactive])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ width: cols * cell, height: rows * cell }}
      className={cn("pointer-events-none select-none", className)}
    />
  )
}

export { AnimatedDither }
