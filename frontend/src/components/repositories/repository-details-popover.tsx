"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Repository } from "./repository-card";
import { Lightbulb, ArrowRight, GitFork, Star } from "lucide-react";

interface RepositoryDetailsPopoverProps {
  repo: Repository | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RepositoryDetailsPopover({ repo, isOpen, onClose }: RepositoryDetailsPopoverProps) {
  const router = useRouter();

  if (!repo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0A0A0A] border border-[#222222] text-white sm:max-w-2xl rounded-3xl p-0 overflow-hidden shadow-2xl">
        <div className="p-8 space-y-6 relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none -z-10 -translate-y-1/2 translate-x-1/2" />
          
          <DialogHeader className="space-y-4">
            <div className="flex justify-between items-start pr-8">
              <div>
                <DialogTitle className="text-2xl font-light tracking-tight text-white mb-2">{repo.name}</DialogTitle>
                <DialogDescription className="text-neutral-400 text-base font-light">
                  {repo.description}
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-neutral-400 font-light pt-2">
              <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${repo.languageColor}`} /> {repo.language}</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4" /> {repo.stars}</span>
              <span className="flex items-center gap-1"><GitFork className="w-4 h-4" /> {repo.forks}</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">{repo.matchScore}% Match</span>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl p-5 space-y-3">
              <h3 className="text-emerald-400 font-medium flex items-center gap-2 text-sm">
                <Lightbulb className="w-4 h-4" /> Why It&apos;s a Good Fit
              </h3>
              <p className="text-neutral-300 text-sm font-light leading-relaxed">
                This repository relies heavily on {repo.language}, matching your primary skill set. They have {repo.issuesCount} open issues specifically tagged for &quot;good first issue&quot; which aligns perfectly with your recent contribution patterns.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
                <h4 className="text-neutral-200 text-sm font-medium mb-2">Repository Insights</h4>
                <ul className="text-xs text-neutral-400 space-y-2 font-light">
                  <li>• Active community (12 PRs merged this week)</li>
                  <li>• Comprehensive testing setup</li>
                  <li>• Well-documented contributing guidelines</li>
                </ul>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
                <h4 className="text-neutral-200 text-sm font-medium mb-2">Contributor Comments</h4>
                <p className="text-xs text-neutral-400 italic font-light">
                  &quot;The maintainers here are incredibly responsive and helpful for first-time contributors!&quot; - @devUser
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-white/[0.02] border-t border-white/[0.05] p-5 flex sm:justify-between items-center w-full">
          <Button 
            variant="ghost" 
            className="text-neutral-400 hover:text-white gap-2 text-sm"
            onClick={() => {
              onClose();
              router.push(`/dashboard/repository/${repo.id}`);
            }}
          >
            View Full Details <ArrowRight className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-white/[0.08] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 rounded-xl px-5 text-sm font-medium transition-all">
               Skip
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl px-6 text-sm font-semibold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
               Accept & Start
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
