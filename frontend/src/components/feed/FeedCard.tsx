import React from 'react'
import Link from 'next/link'
import { FeedItem } from '@/types/feed'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, GitFork, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react'

const getTagColor = (tag: string) => {
  const lower = tag.toLowerCase()
  if (lower === 'backend' || lower === 'ruby' || lower === 'java') return 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
  if (lower === 'css' || lower === 'vue' || lower === 'python') return 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
  if (lower === 'html' || lower === 'react' || lower === 'typescript') return 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30'
  
  const colors = [
    'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30',
    'bg-purple-500/20 text-purple-500 hover:bg-purple-500/30',
    'bg-pink-500/20 text-pink-500 hover:bg-pink-500/30',
    'bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30',
    'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30',
  ]
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

interface FeedCardProps {
  item: FeedItem
}

export function FeedCard({ item }: FeedCardProps) {
  const repo = item.repository
  

  return (
    <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300 overflow-hidden flex flex-col h-full">
      <div className="p-6 pb-4">
        <h3 className="text-[20px] font-bold text-white mb-1.5">
          <Link href={`/dashboard/repository/${repo.id}`} className="hover:text-emerald-400 transition-colors">
            {repo.fullName}
          </Link>
        </h3>
        <p className="text-[#a1a1aa] text-[15px] line-clamp-2">
          {repo.description || "No description provided."}
        </p>
      </div>
      
      <div className="px-6 pb-6 pt-2 space-y-5 flex-grow">
        {/* Why it's a match */}
        <div>
          <h4 className="text-lg font-medium text-emerald-500 mb-1.5">
            Why it&apos;s a match
          </h4>
          <p className="text-[15px] text-[#d4d4d8]">
            {item.scoreInfo.breakdown.fallback 
              ? "Recommended based on community popularity" 
              : "Recommended based on skill alignment"
            }
          </p>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {repo.languages && Object.keys(repo.languages).slice(0, 3).map(lang => (
            <Badge key={lang} variant="secondary" className={`font-medium border-transparent ${getTagColor(lang)}`}>
              {lang}
            </Badge>
          ))}
          {repo.frameworks.slice(0, 3).map(fw => (
            <Badge key={fw} variant="secondary" className={`font-medium border-transparent ${getTagColor(fw)}`}>
              {fw}
            </Badge>
          ))}
        </div>
      </div>
      
      <div className="px-6 py-4 border-t border-white/[0.05] flex justify-between items-center text-sm text-neutral-500">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <GitFork className="w-4 h-4" />
            <span className="text-[13px]">{repo.forks || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4" />
            <span className="text-[13px]">{repo.stars || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span className="text-[13px]">{repo.openIssuesCount || 0}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold h-7 text-xs px-3 rounded-full" asChild>
            <a href={repo.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1.5" /> Github
            </a>
          </Button>
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold h-7 text-xs px-3 rounded-full" asChild>
            <Link href={`/dashboard/repository/${repo.id}`}>
              View details <ArrowRight className="w-3 h-3 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

