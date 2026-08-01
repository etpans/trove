import FeatureCard from "./FeatureCard";
import { features } from "./marketing-content";

export default function FeaturesSection() {
  return (
    <section className="px-6 py-14 sm:py-18" id="features">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div>
          <span className="text-sm font-medium text-[#8a8a8a]">Features</span>
          <h2 className="mt-3 max-w-[12ch] text-[2.4rem] font-semibold leading-[1] tracking-[-0.07em] text-[#111111] sm:text-[3.2rem]">
            A calmer way to document learning
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-7 text-[#5f5f5f]">
            trove keeps the workflow simple: notice something, write one clear
            comment, attach the work if it helps, and decide whether that moment
            belongs in the parent conversation.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
