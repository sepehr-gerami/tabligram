import { Hero } from "@/components/home/hero";
import { StoriesSection } from "@/components/home/stories-section";
import { Benefits } from "@/components/home/benefits";
import { HowItWorks } from "@/components/home/how-it-works";
import { SamplePages } from "@/components/home/sample-pages";
import { CtaBanner } from "@/components/home/cta-banner";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StoriesSection />
      <Benefits />
      <HowItWorks />
      <SamplePages />
      <CtaBanner />
    </>
  );
}
