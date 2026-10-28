import Navbar from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import HeroSection from "@/components/landing/hero-section";
import FeaturesSection from "@/components/landing/features-section";
import BenefitsSection from "@/components/landing/benefits-section";

export default function Home() {
  return (
    <main className="relative w-full bg-[#020503] antialiased">
      <Navbar />

      {/* The hero stays pinned while "How it works" slides up over it */}
      <div className="relative">
        <div className="relative z-10 w-full md:sticky md:top-0 md:h-screen md:overflow-hidden">
          <HeroSection />
        </div>

        <div className="relative z-20 w-full md:shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <FeaturesSection />
        </div>
      </div>

      <div className="relative z-30 w-full bg-[#020503]">
        <BenefitsSection />
        <Footer />
      </div>
    </main>
  );
}
