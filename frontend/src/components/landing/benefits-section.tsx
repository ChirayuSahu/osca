import React from "react";

export default function BenefitsSection() {
  const features = [
    {
      title: "Efficiency",
      description: "You do not need to spend hours trying to find relevant issues",
      icon: (
        <svg className="w-4 h-4 text-[#E07A5F]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-[#E07A5F]/15",
    },
    {
      title: "Skill-based matches",
      description: "Repository matches based on actual skills, not just language tags",
      icon: (
        <svg className="w-4 h-4 text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      iconBg: "bg-[#4A90E2]/15",
    },
    {
      title: "Roadmaps",
      description: "Personalized onboarding roadmap for every project",
      icon: (
        <svg className="w-4 h-4 text-[#81C784]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      iconBg: "bg-[#81C784]/15",
    },
    {
      title: "Relevancy",
      description: "Discover projects that actually align with your career goals",
      icon: (
        <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      iconBg: "bg-[#D4AF37]/15",
    },
    {
      title: "Accuracy",
      description: "Attract contributors who genuinely fit the codebase",
      icon: (
        <svg className="w-4 h-4 text-[#A3B18A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-[#A3B18A]/15",
    },
    {
      title: "Code Quality",
      description: "Reduce low-quality or mismatched pull requests",
      icon: (
        <svg className="w-4 h-4 text-[#A3B18A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      iconBg: "bg-[#A3B18A]/15",
    },
    {
      title: "Project management",
      description: "Issues automatically categorized by difficulty and domain",
      icon: (
        <svg className="w-4 h-4 text-[#A3B18A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      iconBg: "bg-[#A3B18A]/15",
    },
    {
      title: "Analytics",
      description: "Data-driven insights based on contributor patterns",
      icon: (
        <svg className="w-4 h-4 text-[#A3B18A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      iconBg: "bg-[#A3B18A]/15",
    },
  ];

  return (
    <section id="features" className="w-full h-full bg-[#030905] text-white flex items-center select-none py-16 md:py-24 relative">
      <div className="w-full max-w-7xl mx-auto px-6 md:px-12">
        
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8 mb-24">
          <h2 className="font-serif italic font-medium text-4xl md:text-5xl lg:text-[54px] text-[#F0FFF2] leading-tight">
            Our Features
          </h2>
          <p className="w-full max-w-[440px] text-[#F0FFF2] font-normal text-[25px] md:text-[25px] lg:text-[25px] leading-relaxed pt-2">
            From profile to perfect match in minutes, with a personalized contribution roadmap
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-6">
          {features.map((item, index) => (
            <div 
              key={index} 
              className="border-3 border-[#808F81] bg-transparent rounded-[24px] p-7 flex flex-col justify-between min-h-[220px] transition-all duration-300 hover:border-emerald-500/60"
            >
              <div>
                <div className={`w-8 h-8 ${item.iconBg} rounded-[10px] flex items-center justify-center mb-5`}>
                  {item.icon}
                </div>
                
                <h3 className="font-semibold text-[#F0FFF2] text-lg mb-2.5 tracking-tight">
                  {item.title}
                </h3>
                
                <p className="text-[#F0FFF2] text-[14px] font-normal leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}