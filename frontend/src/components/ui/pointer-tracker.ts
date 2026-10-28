"use client"

import { useEffect } from "react"

// One window-level pointer listener shared by every interactive dither, so a
// page full of cards adds a single listener and a single rAF loop, not one each.

type Listener = (x: number, y: number) => void

const listeners = new Set<Listener>()
const FAR = -1e6
let x = FAR
let y = FAR
let frame = 0
let attached = false

const flush = () => {
  frame = 0
  listeners.forEach(fn => fn(x, y))
}

const schedule = () => {
  if (!frame) frame = requestAnimationFrame(flush)
}

const onMove = (e: PointerEvent) => {
  x = e.clientX
  y = e.clientY
  schedule()
}

// Pointer left the window: move it far away so spotlights fade out
const onLeave = () => {
  x = FAR
  y = FAR
  schedule()
}

// Elements moved under a still pointer (scrolling): re-evaluate positions
const onScroll = () => schedule()

/** Calls `fn` with the pointer's viewport position, at most once per frame */
export function subscribePointer(fn: Listener): () => void {
  listeners.add(fn)
  if (!attached) {
    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    attached = true
  }
  fn(x, y)
  return () => {
    listeners.delete(fn)
    if (listeners.size === 0 && attached) {
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("scroll", onScroll, { capture: true })
      attached = false
    }
  }
}

/**
 * Moves an SVG radial-gradient spotlight to the pointer, in the SVG's own cell
 * coordinates, and fades the lit layer in near the element and out away from it.
 * Writes attributes directly, so pointer movement never re-renders React.
 */
export function useSvgSpotlight(
  svgRef: React.RefObject<SVGSVGElement | null>,
  gradientRef: React.RefObject<SVGRadialGradientElement | null>,
  litRef: React.RefObject<SVGGElement | null>,
  cols: number,
  rows: number,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return
    return subscribePointer((px, py) => {
      const svg = svgRef.current
      const gradient = gradientRef.current
      const lit = litRef.current
      if (!svg || !gradient || !lit) return
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const margin = 48
      const near =
        px > rect.left - margin && px < rect.right + margin && py > rect.top - margin && py < rect.bottom + margin
      lit.style.opacity = near ? "1" : "0"
      if (!near) return
      gradient.setAttribute("cx", String(((px - rect.left) / rect.width) * cols))
      gradient.setAttribute("cy", String(((py - rect.top) / rect.height) * rows))
    })
  }, [svgRef, gradientRef, litRef, cols, rows, enabled])
}
