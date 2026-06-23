import Hero from "@/components/landing/hero-section";
import FeaturesSection from "@/components/landing/features-section";
import { BenefitsSection } from "@/components/landing/benefits-section";

export default function Home() {
  return (
    <main>
      <Hero />
      <FeaturesSection />
      <BenefitsSection />
    </main>
  );
}