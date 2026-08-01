import SignUpCta from "../SignUpCta";
import HeroWorkflowPreview from "./HeroWorkflowPreview";
import { heroHighlights } from "./marketing-content";
import { secondaryButtonClassName } from "./styles";

export default function HeroSection() {
  return (
    <section className="px-6 pb-12 pt-16 sm:pb-16 sm:pt-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center rounded-full bg-[#f7f7f5] px-4 py-1.5 text-sm font-medium text-[#6b6b6b]">
            Comment-based notes for elementary teachers
          </span>
          <h1 className="mt-6 text-[3.2rem] font-semibold leading-[0.95] tracking-[-0.08em] text-[#111111] sm:text-[4.8rem] lg:text-[5.6rem]">
            The notes that actually tell parents what happened
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#5f5f5f]">
            Built for elementary teachers who&apos;d rather write a sentence
            than fill in a score. Capture the moment, attach the work, share it
            home.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SignUpCta label="Start free" />
            <a className={secondaryButtonClassName} href="#features">
              See how it works
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#8a8a8a]">
            {heroHighlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>

        <HeroWorkflowPreview />
      </div>
    </section>
  );
}
