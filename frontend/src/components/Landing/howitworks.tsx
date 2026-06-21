import React from "react";

export default function HowItWorks() {
  return (
    <div className="w-full bg-[#020503] text-white flex flex-col overflow-hidden select-none font-sans">
      
      <section id="how-it-works" className="relative w-full max-w-7xl mx-auto px-6 md:px-12 py-16 z-10 scroll-mt-20">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 mb-12">
          <h2 className="w-full max-w-[420px] font-serif italic font-medium text-3xl md:text-4xl lg:text-[48px] text-white leading-[1.2]">
            How does our product work?
          </h2>
          <p className="w-full max-w-[480px] text-white-400 font-medium text-lg md:text-xl lg:text-[24px] leading-[1.3] lg:mt-1">
            From profile to perfect match in minutes, with a personalized contribution roadmap
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="w-full lg:max-w-[700px] min-h-[180px] bg-white text-black rounded-[20px] p-8 flex flex-col justify-center">
              <span className="text-xs font-semibold tracking-wider text-neutral-400 mb-4 uppercase block">Step 1</span>
              <p className="font-medium text-xl md:text-2xl lg:text-[26px] leading-[1.25] text-black">
                Connect your GitHub via Github or Gitlab to securely import your repositories
              </p>
            </div>

            <div className="w-full lg:max-w-[700px] min-h-[180px] bg-white text-black rounded-[20px] p-8 flex flex-col justify-center">
              <span className="text-xs font-semibold tracking-wider text-neutral-400 mb-4 uppercase block">Step 2</span>
              <p className="font-medium text-xl md:text-2xl lg:text-[26px] leading-[1.25] text-black">
                The engine scans your contribution history and coding pattern to build your skill profile
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="w-full lg:max-w-[448px] bg-white text-black rounded-[20px] p-8 flex flex-col justify-start">
              <span className="text-xs font-semibold tracking-wider text-neutral-400 mb-4 uppercase block">Step 3</span>
              <p className="font-medium text-xl lg:text-[26px] leading-[1.25] text-black">
                Your repositories are analysed for multiple metrics to understand their needs
              </p>
            </div>

            <div className="w-full lg:max-w-[448px] bg-white text-black rounded-[20px] p-8 flex flex-col justify-start">
              <span className="text-xs font-semibold tracking-wider text-neutral-400 mb-4 uppercase block">Step 4</span>
              <p className="font-medium text-xl lg:text-[26px] leading-[1.25] text-black">
                Our matching engine pairs you with projects that align with your skills & interests
              </p>
            </div>

            <div className="w-full lg:max-w-[448px] bg-white text-black rounded-[20px] p-8 flex flex-col justify-start md:col-span-2 lg:col-span-1">
              <span className="text-xs font-semibold tracking-wider text-neutral-400 mb-4 uppercase block">Step 5</span>
              <p className="font-medium text-xl lg:text-[26px] leading-[1.25] text-black">
                Receive a personalized roadmap and start contributing
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}