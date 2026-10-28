'use client'

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Deeper paths are left out so large repos stay readable
const MAX_DEPTH = 3

// ForceGraph2D needs to be dynamically imported with ssr: false since it uses HTML5 Canvas and window
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

// Types based on the backend data structures
export interface TreeNode {
  path: string
  type: string
  size?: number
}

export interface ManifestNode {
  blobPath: string
  dependencies: {
    nodes: Array<{
      packageName: string
      requirements: string
    }>
  }
}

interface VisualMapProps {
  folderStructure?: TreeNode[]
  dependencies?: ManifestNode[]
}

type NodeKind = 'tree' | 'blob' | 'dependency' | 'manifest'

interface GraphNode { id: string; name: string; val: number; kind: NodeKind; path?: string }
interface GraphLink { source: string; target: string; label?: string }

const KIND_LABEL: Record<NodeKind, string> = {
  tree: 'Folder',
  blob: 'File',
  manifest: 'Manifest',
  dependency: 'Dependency',
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

// Minimum hit radius in screen pixels, so small nodes are still easy to hover
const MIN_HIT_RADIUS = 7

interface GraphPalette {
  tree: string
  blob: string
  dependency: string
  manifest: string
  link: string
}

// Each node kind maps to a theme token; the legend uses the matching Tailwind class
// and the canvas reads the same CSS variable at runtime, so both follow the theme.
const NODE_TOKENS: Record<NodeKind, { cssVar: string; swatch: string }> = {
  tree: { cssVar: '--chart-3', swatch: 'bg-chart-3' },
  blob: { cssVar: '--muted-foreground', swatch: 'bg-muted-foreground' },
  dependency: { cssVar: '--primary', swatch: 'bg-primary' },
  manifest: { cssVar: '--warning', swatch: 'bg-warning' },
}

function readPalette(): GraphPalette {
  const styles = getComputedStyle(document.documentElement)
  const v = (name: string) => styles.getPropertyValue(name).trim()
  return {
    tree: v(NODE_TOKENS.tree.cssVar),
    blob: v(NODE_TOKENS.blob.cssVar),
    dependency: v(NODE_TOKENS.dependency.cssVar),
    manifest: v(NODE_TOKENS.manifest.cssVar),
    link: v('--border'),
  }
}

export function VisualMap({ folderStructure, dependencies }: VisualMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const [palette, setPalette] = useState<GraphPalette | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFolders, setShowFolders] = useState(true)
  const [showFiles, setShowFiles] = useState(false) // Hide files by default to reduce initial noise
  const [showDependencies, setShowDependencies] = useState(true)
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)

  // Re-read the theme tokens whenever the resolved theme changes. Wait a frame so
  // next-themes has applied the `.dark` class before we read the variables.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPalette(readPalette()))
    return () => cancelAnimationFrame(frame)
  }, [resolvedTheme])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setDimensions({ width: el.clientWidth, height: el.clientHeight || 480 })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [isFullscreen])

  // Process data into nodes and links for the force graph
  const graphData = useMemo(() => {

    const nodes: GraphNode[] = [{ id: 'root', name: 'Repository Root', val: 10, kind: 'tree' }]
    const links: GraphLink[] = []
    const addedNodes = new Set<string>(['root'])

    // 1. Process Folder Structure
    if (folderStructure && Array.isArray(folderStructure)) {
      folderStructure.forEach(item => {
        // Check filters
        if (item.path.split('/').length > MAX_DEPTH) return
        if (item.type === 'tree' && !showFolders) return
        if (item.type === 'blob' && !showFiles) return

        // Ensure node exists
        if (!addedNodes.has(item.path)) {
          nodes.push({
            id: item.path,
            name: item.path.split('/').pop() || item.path,
            val: item.type === 'tree' ? 5 : 2,
            kind: item.type === 'tree' ? 'tree' : 'blob',
            path: item.path
          })
          addedNodes.add(item.path)
        }

        // Create link to parent
        const parts = item.path.split('/')
        if (parts.length === 1) {
          links.push({ source: 'root', target: item.path })
        } else {
          parts.pop()
          const parentPath = parts.join('/')
          if (addedNodes.has(parentPath)) {
            links.push({ source: parentPath, target: item.path })
          } else {
            // Connect to root if parent is filtered out
            links.push({ source: 'root', target: item.path })
          }
        }
      })
    }

    // 2. Process Deep Dependencies
    if (dependencies && Array.isArray(dependencies) && showDependencies) {
      dependencies.forEach(manifest => {
        const manifestPath = manifest.blobPath.replace(/^\//, '') // strip leading slash

        // Add manifest node if not exists
        if (!addedNodes.has(manifestPath)) {
          nodes.push({
            id: manifestPath,
            name: manifestPath.split('/').pop() || manifestPath,
            val: 6,
            kind: 'manifest'
          })
          addedNodes.add(manifestPath)
          links.push({ source: 'root', target: manifestPath })
        } else {
          // Highlight existing file nodes that are manifests
          const node = nodes.find(n => n.id === manifestPath)
          if (node) node.kind = 'manifest'
        }

        manifest.dependencies?.nodes?.forEach(dep => {
          const depId = `dep:${dep.packageName}`
          if (!addedNodes.has(depId)) {
            nodes.push({
              id: depId,
              name: dep.packageName,
              val: 3,
              kind: 'dependency'
            })
            addedNodes.add(depId)
          }
          links.push({ source: manifestPath, target: depId, label: dep.requirements })
        })
      })
    }

    return { nodes, links }
  }, [folderStructure, dependencies, showFolders, showFiles, showDependencies])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null)
  const fitted = useRef(false)

  // Refit after the filters change the node set
  useEffect(() => {
    fitted.current = false
  }, [graphData])

  useEffect(() => {
    // Tweak the d3 physics to spread nodes out and prevent the "clumpy" look
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-150) // Stronger repulsion between nodes (default is ~ -30)
      fgRef.current.d3Force('link').distance(50) // Longer links between nodes (default is ~ 30)
    }
  }, [graphData]) // Re-run when data changes just in case

  const fitOnce = useCallback(() => {
    if (!fitted.current) {
      fgRef.current?.zoomToFit(400, 48)
      fitted.current = true
    }
  }, [])

  const handleHover = useCallback((node: GraphNode | null) => {
    setHoverNode(node)
    if (containerRef.current) containerRef.current.style.cursor = node ? 'pointer' : ''
  }, [])

  const graph = useMemo(() => {
    if (typeof window === 'undefined' || !palette) return null
    return (
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        // Built-in HTML tooltip (styled in globals.css); no canvas redraw needed on hover
        nodeLabel={(node: object) => {
          const n = node as GraphNode
          return `<span class="graph-tip-kind">${KIND_LABEL[n.kind]}</span>${escapeHtml(n.path ?? n.name)}`
        }}
        nodeColor={(node: object) => palette[(node as GraphNode).kind] || palette.blob}
        nodeRelSize={4}
        nodePointerAreaPaint={(node: object, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const n = node as GraphNode & { x?: number; y?: number }
          const r = Math.max(Math.sqrt(n.val) * 4, MIN_HIT_RADIUS / globalScale)
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI)
          ctx.fill()
        }}
        linkColor={() => palette.link}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        backgroundColor="transparent"
        onNodeHover={handleHover as (node: object | null) => void}
        cooldownTicks={120}
        onEngineStop={fitOnce}
      />
    )
  }, [palette, dimensions.width, dimensions.height, graphData, handleHover, fitOnce])

  if (!folderStructure && !dependencies) {
    return (
      <div className="flex items-center justify-center rounded-md border border-border bg-background px-6 py-14 text-center">
        <p className="text-sm text-muted-foreground">No map data for this repository yet.</p>
      </div>
    )
  }

  // Manifests and their packages toggle together
  const filters: { label: string; kinds: NodeKind[]; on: boolean; set: (v: boolean) => void }[] = [
    { label: 'Folders', kinds: ['tree'], on: showFolders, set: setShowFolders },
    { label: 'Files', kinds: ['blob'], on: showFiles, set: setShowFiles },
    { label: 'Dependencies', kinds: ['manifest', 'dependency'], on: showDependencies, set: setShowDependencies },
  ]

  return (
    <div
      className={cn('relative overflow-hidden bg-background', isFullscreen ? 'fixed inset-0 z-50' : 'h-[480px] w-full')}
      ref={containerRef}
      onPointerLeave={() => handleHover(null)}
    >
      <div className="absolute top-3 left-3 right-14 z-10 flex flex-wrap items-center gap-1.5">
        {filters.map(f => (
          <button
            key={f.label}
            type="button"
            aria-pressed={f.on}
            onClick={() => f.set(!f.on)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
              f.on ? 'border-border bg-card text-foreground' : 'border-dashed border-border bg-background text-muted-foreground'
            )}
          >
            {f.kinds.map(k => (
              <span key={k} className={cn('size-2 rounded-full', NODE_TOKENS[k].swatch, !f.on && 'opacity-30')} aria-hidden />
            ))}
            {f.label}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 z-10">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize /> : <Maximize />}
        </Button>
      </div>

      <p className="pointer-events-none absolute bottom-3 left-3 z-10 text-[11px] text-muted-foreground">
        {hoverNode ? (
          <>
            <span className="mr-1.5">{KIND_LABEL[hoverNode.kind]}</span>
            <span className="font-mono text-foreground">{hoverNode.path ?? hoverNode.name}</span>
          </>
        ) : (
          'Scroll to zoom · drag to pan · hover a node'
        )}
      </p>

      {graph}
    </div>
  )
}
