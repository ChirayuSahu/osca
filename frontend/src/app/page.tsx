import Hero from "@/components/landing/hero";
import HowItWorks from "@/components/landing/howitworks";
import { BenefitsSection } from "@/components/landing/benefits-section";

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <BenefitsSection />
    </main>
  );
}