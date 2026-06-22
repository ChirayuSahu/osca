"use client";

import { User } from "lucide-react";

export function ContributorProfile() {
  return (
    <div className="space-y-8 w-full">
      <h3 className="text-2xl font-semibold text-[#FFFFFF] mb-6 italic">Contributor profile</h3>

      {/* Main Profile Header Box */}
      <div className="p-6 bg-[#121212] border border-[#444444] rounded-[24px] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#00843C] flex items-center justify-center text-[#FFFFFF]">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[#FFFFFF] text-lg font-medium leading-tight">Name</h4>
            <p className="text-[#D9D9D9]/60 text-sm">@username</p>
          </div>
        </div>

        <div className="flex gap-8 lg:gap-12 pr-4">
          <div className="text-center md:text-right">
            <p className="text-[#FFFFFF] text-2xl font-bold leading-tight">647</p>
            <p className="text-[#D9D9D9]/60 text-[11px] uppercase tracking-wider mt-0.5">Commits</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[#FFFFFF] text-2xl font-bold leading-tight">142</p>
            <p className="text-[#D9D9D9]/60 text-[11px] uppercase tracking-wider mt-0.5">PRs merged</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[#FFFFFF] text-2xl font-bold leading-tight">41</p>
            <p className="text-[#D9D9D9]/60 text-[11px] uppercase tracking-wider mt-0.5">Reviews</p>
          </div>
        </div>
      </div>

      {/* 3 Metrics Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Box 1: Lines of code added */}
        <div className="p-8 bg-[#121212] border border-[#444444] rounded-[24px] flex flex-col justify-between items-center text-center min-h-[180px]">
          <p className="text-[#D9D9D9] text-[15px] font-light">Lines of code added</p>
          <p className="text-[#FFFFFF] text-4xl font-bold my-4">48.2k</p>
          <p className="text-[#62BE8B] text-[13px] font-medium flex items-center gap-1">
            <span>↗</span> +12% vs prev period
          </p>
        </div>

        {/* Box 2: Avg PR cycle time */}
        <div className="p-8 bg-[#121212] border border-[#444444] rounded-[24px] flex flex-col justify-between items-center text-center min-h-[180px]">
          <p className="text-[#D9D9D9] text-[15px] font-light">Avg PR cycle time</p>
          <p className="text-[#FFFFFF] text-4xl font-bold my-4">1.4 d</p>
          <p className="text-[#62BE8B] text-[13px] font-medium flex items-center gap-1">
            <span>↘</span> -0.3d faster
          </p>
        </div>

        {/* Box 3: Code review score */}
        <div className="p-8 bg-[#121212] border border-[#444444] rounded-[24px] flex flex-col justify-between items-center text-center min-h-[180px]">
          <p className="text-[#D9D9D9] text-[15px] font-light">Code review score</p>
          <p className="text-[#FFFFFF] text-4xl font-bold my-4">4.6/5</p>
          <p className="text-[#864B4B] text-[13px] font-medium flex items-center gap-1">
            <span>↘</span> -0.1 vs prev
          </p>
        </div>
      </div>
    </div>
  );
}
