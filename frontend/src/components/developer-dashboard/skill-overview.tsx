"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Skill {
  name: string;
  level: number; // 0-100
  color: string;
}

const skills: Skill[] = [
  { name: "TypeScript", level: 95, color: "bg-blue-500" },
  { name: "React", level: 92, color: "bg-cyan-500" },
  { name: "Node.js", level: 88, color: "bg-green-500" },
  { name: "Database Design", level: 85, color: "bg-yellow-500" },
  { name: "DevOps", level: 72, color: "bg-purple-500" },
  { name: "System Design", level: 80, color: "bg-orange-500" },
];

export function SkillOverview() {
  return (
    <Card className="p-12 bg-[#121212] border border-[#444444] rounded-3xl">
      <h3 className="text-2xl font-bold text-[#FFFFFF] mb-8 italic">Skill Overview</h3>
      <div className="space-y-6">
        {skills.map((skill) => (
          <div key={skill.name}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[#D9D9D9] font-medium text-base">{skill.name}</span>
              <span className="text-[#62BE8B] font-semibold text-base">{skill.level}%</span>
            </div>
            <Progress
              value={skill.level}
              className="h-3 bg-[#444444] rounded-full"
              indicatorClassName="bg-[#62BE8B] rounded-full"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
