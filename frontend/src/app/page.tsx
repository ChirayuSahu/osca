import Navbar from "@/components/landing/navbar";
import HeroSection from "@/components/landing/hero-section";
import FeaturesSection from "@/components/landing/features-section";
import BenefitsSection from "@/components/landing/benefits-section";

export default function Home() {
  return (
    <div className="min-h-svh bg-background text-foreground antialiased">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <BenefitsSection />
      </main>
    </div>
  );
}
