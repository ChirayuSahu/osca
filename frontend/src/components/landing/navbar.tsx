import React from "react";

export default function Navbar() {
  return (
  
    <div className="w-full fixed top-0 left-0 z-50 backdrop-blur-sm bg-black/[0.04] border-b border-white/[0.08]">
      
      <nav className="w-full max-w-7xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
        <div className="text-xl font-semibold tracking-tight italic text-[#F0FFF2] font-serif">
          osca
        </div>

        <div className="hidden lg:flex items-center gap-20 text-[13px] font-normal text-[#F0FFF2]">
          <a href="#home" className="text-white transition-colors duration-200">Home</a>
          <a href="#how-it-works" className="hover:text-white transition-colors duration-200 whitespace-nowrap">How it works</a>
          <a href="#" className="hover:text-white transition-colors duration-200">About</a>
          <a href="#benefits" className="hover:text-white transition-colors duration-200">Features</a>
        </div>

        <a href="/dashboard" className="bg-[#3CAE6B] text-[#F0FFF2] font-medium px-6 py-2 rounded-full text-sm hover:bg-emerald-600 transition-all duration-200">
          Sign up
        </a>
      </nav>
    </div>
  );
}