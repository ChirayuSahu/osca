'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

// ForceGraph2D needs to be dynamically imported with ssr: false since it uses HTML5 Canvas and window
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })
import { Maximize, Minimize } from 'lucide-react'

// Types based on the backend data structures
interface TreeNode {
  path: string
  type: string
  size?: number
}

interface ManifestNode {
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

const colorMap: Record<string, string> = {
  tree: '#3b82f6', // blue for folders
  blob: '#9ca3af', // gray for files
  dependency: '#10b981', // green for dependencies
  manifest: '#f59e0b', // orange for manifest files
}

export function VisualMap({ folderStructure, dependencies }: VisualMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFolders, setShowFolders] = useState(true)
  const [showFiles, setShowFiles] = useState(false) // Hide files by default to reduce initial noise
  const [showDependencies, setShowDependencies] = useState(true)

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 500,
      })
    }
  }, [isFullscreen])

  // Process data into nodes and links for the force graph
  const graphData = useMemo(() => {
    const nodes: any[] = [{ id: 'root', name: 'Repository Root', val: 10, color: colorMap.tree }]
    const links: any[] = []
    const addedNodes = new Set<string>(['root'])

    // 1. Process Folder Structure
    if (folderStructure && Array.isArray(folderStructure)) {
      folderStructure.forEach(item => {
        // Check filters
        if (item.type === 'tree' && !showFolders) return
        if (item.type === 'blob' && !showFiles) return

        // Ensure node exists
        if (!addedNodes.has(item.path)) {
          nodes.push({
            id: item.path,
            name: item.path.split('/').pop() || item.path,
            val: item.type === 'tree' ? 5 : 2,
            color: colorMap[item.type] || colorMap.blob,
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
            color: colorMap.manifest
          })
          addedNodes.add(manifestPath)
          links.push({ source: 'root', target: manifestPath })
        } else {
          // Color it orange to highlight it's a manifest
          const node = nodes.find(n => n.id === manifestPath)
          if (node) node.color = colorMap.manifest
        }

        manifest.dependencies?.nodes?.forEach(dep => {
          const depId = `dep:${dep.packageName}`
          if (!addedNodes.has(depId)) {
            nodes.push({
              id: depId,
              name: dep.packageName,
              val: 3,
              color: colorMap.dependency
            })
            addedNodes.add(depId)
          }
          links.push({ source: manifestPath, target: depId, label: dep.requirements })
        })
      })
    }

    return { nodes, links }
  }, [folderStructure, dependencies, showFolders, showFiles, showDependencies])

  const fgRef = useRef<any>()

  useEffect(() => {
    // Tweak the d3 physics to spread nodes out and prevent the "clumpy" look
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-150) // Stronger repulsion between nodes (default is ~ -30)
      fgRef.current.d3Force('link').distance(50) // Longer links between nodes (default is ~ 30)
    }
  }, [graphData]) // Re-run when data changes just in case

  if (!folderStructure && !dependencies) {
    return <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/20">No visualization data available for this repository yet.</div>
  }

  return (
    <div 
      className={`relative rounded-xl overflow-hidden border border-neutral-800/60 bg-neutral-950/50 transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-neutral-950' : 'w-full h-[600px]'}`}
      ref={containerRef}
    >
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2.5 bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-lg shadow-sm hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      <div className="absolute top-4 left-4 z-10 p-4 bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-xl shadow-lg text-sm text-neutral-300 min-w-[200px]">
        <div className="font-semibold mb-3 text-neutral-100 flex items-center justify-between">
          Legend & Filters
        </div>
        
        <label className="flex items-center justify-between gap-3 mb-2 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#3b82f6]" style={{backgroundColor: colorMap.tree}}></div> 
            <span className="group-hover:text-neutral-100 transition-colors">Folders</span>
          </div>
          <input type="checkbox" checked={showFolders} onChange={(e) => setShowFolders(e.target.checked)} className="accent-emerald-500 w-4 h-4 rounded border-neutral-700 bg-neutral-800" />
        </label>
        
        <label className="flex items-center justify-between gap-3 mb-2 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#9ca3af]" style={{backgroundColor: colorMap.blob}}></div> 
            <span className="group-hover:text-neutral-100 transition-colors">Files</span>
          </div>
          <input type="checkbox" checked={showFiles} onChange={(e) => setShowFiles(e.target.checked)} className="accent-emerald-500 w-4 h-4 rounded border-neutral-700 bg-neutral-800" />
        </label>

        <label className="flex items-center justify-between gap-3 mb-2 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#f59e0b]" style={{backgroundColor: colorMap.manifest}}></div> 
            <span className="group-hover:text-neutral-100 transition-colors">Manifests</span>
          </div>
          <input type="checkbox" checked={showDependencies} onChange={(e) => setShowDependencies(e.target.checked)} className="accent-emerald-500 w-4 h-4 rounded border-neutral-700 bg-neutral-800" />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#10b981]" style={{backgroundColor: colorMap.dependency}}></div> 
            <span className="group-hover:text-neutral-100 transition-colors">Dependencies</span>
          </div>
          <input type="checkbox" checked={showDependencies} onChange={(e) => setShowDependencies(e.target.checked)} className="accent-emerald-500 w-4 h-4 rounded border-neutral-700 bg-neutral-800" />
        </label>
      </div>

      {typeof window !== 'undefined' && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor="color"
          nodeRelSize={4}
          linkColor={() => '#64748b60'}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          backgroundColor="rgba(0,0,0,0)" // Ensures canvas background is transparent
        />
      )}
    </div>
  )
}
