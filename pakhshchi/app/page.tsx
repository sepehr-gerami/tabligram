import { Hero } from "@/components/home/hero";
import { Benefits } from "@/components/home/benefits";
import { HowItWorks } from "@/components/home/how-it-works";
import { MarketPages } from "@/components/home/market-pages";
import { CtaBanner } from "@/components/home/cta-banner";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Benefits />
      <HowItWorks />
      <MarketPages />
      <CtaBanner />
    </>
  );
}
