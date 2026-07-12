
import HeroSection from "@/components/landing/hero-section";
import FeaturesSection from "@/components/landing/features-section";
import BenefitsSection from "@/components/landing/benefits-section";
import Navbar from "@/components/landing/navbar";

export default function Home() {
  return (
    <main className="relative w-full bg-[#020503] antialiased">
      <Navbar />

      <div className="relative h-screen w-full sticky top-0 z-10 overflow-hidden">
        <HeroSection />
      </div>

      <div className="relative w-full z-20 ">
        <FeaturesSection />
      </div>

      <div className="relative w-full bg-[#020503] z-30">
        <BenefitsSection />
      </div>
    </main>
  );
}