"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RepositoryCard, type Repository } from "@/components/repositories/repository-card";

const mockRepositories: Repository[] = [
  {
    id: 1,
    name: "anikethgalla/OSCA",
    description: "Open Source Contributor Assistant with smart recommendations",
    stars: 120,
    forks: 45,
    language: "TypeScript",
    languageColor: "bg-blue-400",
    matchScore: 98,
    issuesCount: 12,
  },
  {
    id: 2,
    name: "anikethgalla/CPP",
    description: "Comprehensive C++ Data Structures and Algorithms collection",
    stars: 85,
    forks: 20,
    language: "C++",
    languageColor: "bg-pink-500",
    matchScore: 92,
    issuesCount: 5,
  },
  {
    id: 3,
    name: "anikethgalla/Memory_verse",
    description: "Interactive application for learning memory verses",
    stars: 42,
    forks: 10,
    language: "JavaScript",
    languageColor: "bg-yellow-400",
    matchScore: 85,
    issuesCount: 8,
  }
];

const monthLabels = [
  { label: "Jun", weekIndex: 0 },
  { label: "Jul", weekIndex: 4 },
  { label: "Aug", weekIndex: 8 },
  { label: "Sep", weekIndex: 13 },
  { label: "Oct", weekIndex: 17 },
  { label: "Nov", weekIndex: 21 },
  { label: "Dec", weekIndex: 26 },
  { label: "Jan", weekIndex: 30 },
  { label: "Feb", weekIndex: 34 },
  { label: "Mar", weekIndex: 38 },
  { label: "Apr", weekIndex: 43 },
  { label: "May", weekIndex: 47 },
  { label: "Jun", weekIndex: 51 },
];

const weeks = Array.from({ length: 53 }, (_, weekIdx) => {
  return Array.from({ length: 7 }, (_, dayIdx) => {
    // Generate organic-looking contribution values (0 to 4) deterministically
    return (weekIdx * 7 + dayIdx) % 13 === 0 
      ? 3 
      : (weekIdx * 3 + dayIdx * 2) % 7 === 0 
      ? 2 
      : (weekIdx + dayIdx * 5) % 5 === 0 
      ? 1 
      : (weekIdx * 11 + dayIdx * 3) % 19 === 0 
      ? 4 
      : 0;
  });
});

export function MainDashboard() {
  return (
    <div className="space-y-8 w-full">
      <Card className="p-6 md:p-12 bg-[#121212] border border-[#444444] rounded-3xl">
        {/* GitHub-style Heatmap */}
        <div className="mb-8 overflow-x-auto w-full">
          <div className="mx-auto w-max">
            <div className="flex gap-3 pb-4">
              {/* Day labels - aligned vertically to the grid */}
              <div className="flex flex-col gap-[3px] text-[#D9D9D9] font-medium text-[10px] leading-[10px] select-none pr-1">
                <div className="h-[10px]" /> {/* Sunday */}
                <div className="h-[10px] flex items-center">Mon</div>
                <div className="h-[10px]" /> {/* Tuesday */}
                <div className="h-[10px] flex items-center">Wed</div>
                <div className="h-[10px]" /> {/* Thursday */}
                <div className="h-[10px] flex items-center">Fri</div>
                <div className="h-[10px]" /> {/* Saturday */}
              </div>

              {/* Heatmap grid and Month labels */}
              <div className="flex flex-col gap-2">
                {/* Month labels row */}
                <div className="relative h-4 text-xs text-[#D9D9D9] font-medium select-none">
                  {monthLabels.map((ml, idx) => (
                    <span
                      key={idx}
                      className="absolute"
                      style={{ left: `${ml.weekIndex * 13}px` }}
                    >
                      {ml.label}
                    </span>
                  ))}
                </div>

                {/* Contribution squares */}
                <div className="flex gap-[3px]">
                  {weeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-[3px]">
                      {week.map((val, dayIdx) => (
                        <div
                          key={dayIdx}
                          className="w-[10px] h-[10px] rounded-[1.5px] border border-[#444444] hover:ring-1 hover:ring-[#62BE8B] cursor-pointer transition"
                          style={{
                            backgroundColor:
                              val === 0
                                ? "rgb(18, 18, 18)"
                                : val === 1
                                ? "rgba(0, 103, 43, 0.5)"
                                : val === 2
                                ? "rgb(0, 103, 43)"
                                : val === 3
                                ? "rgb(0, 132, 60)"
                                : "rgb(98, 190, 139)",
                          }}
                          title={`${val} contributions`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#444444]">
            <a href="#" className="text-xs text-[#D9D9D9] hover:text-[#FFFFFF] transition">
              Learn how we count contributions
            </a>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#D9D9D9]">Less</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="w-3 h-3 rounded-[1.5px] border border-[#444444]"
                    style={{
                      backgroundColor:
                        level === 0
                          ? "rgb(18, 18, 18)"
                          : level === 1
                          ? "rgba(0, 103, 43, 0.5)"
                          : level === 2
                          ? "rgb(0, 103, 43)"
                          : level === 3
                          ? "rgb(0, 132, 60)"
                          : "rgb(98, 190, 139)",
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-[#D9D9D9]">More</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Welcome Section */}
      <div className="p-4 md:p-8">
        <h3 className="text-4xl text-[#FFFFFF] mb-8 text-center italic">
          Welcome, <span className="font-semibold text-[#62BE8B]">Name!</span>
        </h3>
        <div className="flex justify-center items-center gap-3 mb-12 max-w-md mx-auto">
          <Input
            placeholder="Search or type a command..."
            className="bg-[#FFFFFF]/10 border border-[#444444] text-[#FFFFFF] placeholder-[#D9D9D9]/50 rounded-full py-3 px-6 w-full focus:border-[#00843C] transition-colors"
          />
          <button className="bg-[#00843C] rounded-full p-3 hover:bg-[#62BE8B] transition transform hover:scale-105 flex-shrink-0">
            <span className="text-[#FFFFFF] text-xl">→</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockRepositories.map((repo) => (
            <RepositoryCard key={repo.id} repo={repo} />
          ))}
        </div>
      </div>
    </div>
  );
}
