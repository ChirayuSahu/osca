"use client";

import React, { useState } from "react";
import { MainDashboard } from "./main-dashboard";
import { ContributorProfile } from "./contributor-profile";
import { SkillOverview } from "./skill-overview";
import { RecommendationSummary } from "./recommendation-summary";

export function DeveloperDashboard() {
  const [activeSection, setActiveSection] = useState("main");

  const navigationItems = [
    { id: "main", label: "Main Dashboard", icon: "📊" },
    { id: "profile", label: "Contributor Profile", icon: "👤" },
    { id: "skills", label: "Skill Overview", icon: "⭐" },
    { id: "recommendations", label: "Recommendation", icon: "💡" },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "main":
        return <MainDashboard />;
      case "profile":
        return <ContributorProfile />;
      case "skills":
        return <SkillOverview />;
      case "recommendations":
        return <RecommendationSummary />;
      default:
        return <MainDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="w-full lg:w-72 bg-[#121212] border-b lg:border-b-0 lg:border-r border-[#444444] p-6 lg:p-8 flex flex-col lg:fixed lg:h-screen lg:left-0 lg:top-0 z-50">
        <div className="text-[#FFFFFF] text-2xl font-mono font-bold mb-6 lg:mb-12 text-center lg:text-left">
          osca
        </div>
        <nav className="flex flex-row lg:flex-col gap-3 lg:gap-4 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none flex-1 justify-center lg:justify-start">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`whitespace-nowrap py-2.5 px-4 lg:py-3 lg:px-5 rounded-full text-xs lg:text-sm font-medium transition-all duration-200 border ${
                activeSection === item.id
                  ? "bg-[#00843C] text-[#FFFFFF] border-[#00843C] shadow-lg shadow-[#00843C]/20"
                  : "bg-transparent text-[#FFFFFF] border-[#444444] hover:border-[#D9D9D9]/50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 w-full min-w-0 relative overflow-hidden bg-[#121212]">
        {/* Decorative background grid pattern on the right */}
        <div className="absolute right-0 top-0 bottom-0 w-24 hidden xl:grid grid-cols-2 grid-rows-[repeat(20,minmax(0,1fr))] gap-0 select-none pointer-events-none opacity-20">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className={`${
                (Math.floor(i / 2) + (i % 2)) % 2 === 0 ? "bg-[#00843C]" : "bg-transparent"
              } w-12 h-12`}
            />
          ))}
        </div>

        <div className="w-full px-6 md:px-12 lg:px-16 py-10 lg:py-16 relative z-10">
          <div className="mb-10 lg:mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#FFFFFF] mb-3 italic">Developer Dashboard</h1>
            <p className="text-[#D9D9D9] text-sm md:text-base">Track your contributions and improve your skills</p>
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
