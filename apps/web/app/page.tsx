import FeaturesSection from "./components/marketing/FeaturesSection";
import FinalCtaSection from "./components/marketing/FinalCtaSection";
import HeroSection from "./components/marketing/HeroSection";
import SchoolsSection from "./components/marketing/SchoolsSection";
import SiteHeader from "./components/marketing/SiteHeader";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <SiteHeader />

      <main>
        <HeroSection />
        <FeaturesSection />
        <SchoolsSection />
        <FinalCtaSection />
      </main>
    </div>
  );
}
