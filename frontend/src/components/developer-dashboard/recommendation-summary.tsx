"use client";

import { Card } from "@/components/ui/card";

interface Recommendation {
  title: string;
  description: string;
  impact: string;
}

const recommendations: Recommendation[] = [
  {
    title: "Deepen testing coverage",
    description:
      "Only 12% of your commits include test files. Contributors who add tests alongside features see 40% fewer review cycles.",
    impact: "Save ~2 days/week",
  },
  {
    title: "Strong TypeScript ownership",
    description:
      "You're in the top 5% for TS contribution across the org. Consider mentoring teammates in the design-system repo.",
    impact: "Grow team skills",
  },
  {
    title: "Large PRs slow review time",
    description:
      "22 of your PRs exceeded 500 lines. Splitting them into smaller units could cut your average cycle time by ~0.5 days.",
    impact: "Faster merges",
  },
];

export function RecommendationSummary() {
  return (
    <Card className="p-12 bg-[#121212] border border-[#444444] rounded-3xl">
      <h3 className="text-2xl font-bold text-[#FFFFFF] mb-8 italic">Recommendation Summary</h3>
      <div className="space-y-5">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="p-6 rounded-2xl border border-[#444444] hover:border-[#62BE8B]/50 transition-colors bg-[#121212]"
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-[#FFFFFF] font-semibold text-lg">{rec.title}</h4>
              <span className="text-xs bg-[#00843C]/20 text-[#62BE8B] border border-[#00843C]/30 px-3 py-1 rounded-lg font-medium">
                {rec.impact}
              </span>
            </div>
            <p className="text-[#D9D9D9] text-base leading-relaxed">{rec.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
