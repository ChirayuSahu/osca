
import HeroSection from "@/components/landing/hero-section";
import FeaturesSection from "@/components/landing/features-section";
import BenefitsSection from "@/components/landing/benefits-section";

export default function Home() {
  return (
    <main className="relative w-full bg-[#020503] antialiased">
      
      <div className="relative md:h-[200vh] w-full flex flex-col md:block">
        
        <div className="relative min-h-screen md:h-screen w-full md:sticky top-0 z-10 md:overflow-hidden">
          <HeroSection />
        </div>

        <div className="relative min-h-screen md:h-screen w-full md:sticky top-0 z-20 md:shadow-[0_-20px_50px_rgba(0,0,0,0.5)] md:overflow-hidden">
          <FeaturesSection />
        </div>
        
      </div>

      <div className="relative w-full bg-[#020503] z-30">
        <BenefitsSection />
      </div>
    </main>
  );
}