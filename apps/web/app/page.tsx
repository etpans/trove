const navLinkClassName = "rounded-md px-3 py-2 hover:text-[#111111]";

const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-lg bg-[#378ADD] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2f7aca]";

const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-lg border border-[#e7e5df] bg-white px-5 py-2 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#f7f7f5]";

const cardClassName = "rounded-[24px] border border-[#e7e5df] bg-white";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#schools", label: "For schools" },
  { href: "#", label: "Log in" },
];

const heroHighlights = [
  "Write in plain language",
  "Attach student work",
  "Share only selected notes",
];

const features = [
  {
    description:
      "Write what you noticed, in your own words. No rubrics to fill in.",
    icon: <MessageIcon />,
    tintClassName: "bg-[#E1F5EE] text-[#0F6E56]",
    title: "Comments, not scores",
  },
  {
    description:
      "Attach the actual work and annotate the part your comment is about.",
    icon: <PhotoIcon />,
    tintClassName: "bg-[#FAECE7] text-[#993C1D]",
    title: "Photos with context",
  },
  {
    description:
      "Pick which notes go to parents. Everything else stays private to you.",
    icon: <PeopleIcon />,
    tintClassName: "bg-[#EEEDFE] text-[#534AB7]",
    title: "Share moments home",
  },
];

type FeatureCardProps = {
  description: string;
  icon: React.ReactNode;
  tintClassName: string;
  title: string;
};

function LogoMark() {
  return (
    <div className="flex size-9 items-center justify-center rounded-[10px] border border-[#111111] bg-white">
      <svg
        aria-hidden="true"
        className="size-5 text-[#111111]"
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6.25 5.25h11.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5H6.25a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M8.5 8.75h7M8.5 12h7M8.5 15.25h4.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

function MessageIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.75 9a3.25 3.25 0 0 1 3.25-3.25h8A3.25 3.25 0 0 1 19.25 9v4A3.25 3.25 0 0 1 16 16.25H10.5l-3.75 2v-2H8A3.25 3.25 0 0 1 4.75 13V9Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.25 7.25A2.25 2.25 0 0 1 7.5 5h9A2.25 2.25 0 0 1 18.75 7.25v9.5A2.25 2.25 0 0 1 16.5 19h-9a2.25 2.25 0 0 1-2.25-2.25v-9.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="m7.75 15.25 2.4-2.65a1 1 0 0 1 1.49-.03l1.33 1.47a1 1 0 0 0 1.49-.03l1.79-2.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="9.75" r="1" fill="currentColor" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 11.25A2.75 2.75 0 1 0 9 5.75a2.75 2.75 0 0 0 0 5.5ZM15.5 12.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M4.75 18c.58-2.09 2.51-3.62 4.82-3.62h.01c2.3 0 4.24 1.53 4.82 3.62M14.25 17.5c.41-1.37 1.65-2.37 3.08-2.48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m8.75 12.5 2 2 4.5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function FeatureCard({
  description,
  icon,
  tintClassName,
  title,
}: FeatureCardProps) {
  return (
    <article className="rounded-[18px] border border-[#e7e5df] bg-white p-6">
      <div
        className={`mb-5 flex size-11 items-center justify-center rounded-xl ${tintClassName}`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#111111]">
        {title}
      </h3>
      <p className="mt-3 text-[15px] leading-7 text-[#5f5f5f]">
        {description}
      </p>
    </article>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <header className="border-b border-[#efede8] bg-white/95 backdrop-blur">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <a className="flex items-center gap-3" href="#">
            <LogoMark />
            <span className="text-lg font-semibold tracking-[-0.04em] lowercase">
              trove
            </span>
          </a>

          <ul className="flex flex-wrap items-center gap-2 text-sm text-[#6b6b6b] sm:justify-end">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a className={navLinkClassName} href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a className={primaryButtonClassName} href="#">
                Start free
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <main>
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
                than fill in a score. Capture the moment, attach the work, share
                it home.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a className={primaryButtonClassName} href="#">
                  Start free
                </a>
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

            <section
              aria-labelledby="hero-visual-heading"
              className="mx-auto mt-16 max-w-6xl rounded-[28px] border border-[#efede8] bg-[#fafaf8] p-4 sm:p-6"
            >
              <h2 className="sr-only" id="hero-visual-heading">
                Example note and sharing workflow
              </h2>
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <article className={`${cardClassName} p-5 sm:p-6`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#111111]">
                        Jul 24
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#E1F5EE] px-2.5 py-1 text-xs font-medium text-[#0F6E56]">
                        Academic
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8f8f8f]">
                      <CheckIcon />
                      Shared
                    </span>
                  </div>

                  <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#111111]">
                    Completed her writing journal entry with three full
                    sentences, up from one last week.
                  </p>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div
                      aria-label="Student work photo placeholder"
                      className="flex size-[68px] items-center justify-center rounded-2xl border border-[#ece9e1] bg-[#f7f7f5] text-[#8f8f8f]"
                      role="img"
                    >
                      <PhotoIcon />
                    </div>
                    <div className="rounded-2xl bg-[#f7f7f5] px-4 py-3 text-sm leading-6 text-[#6b6b6b]">
                      Highlight the exact sentence or math step your comment is
                      referring to.
                    </div>
                  </div>
                </article>

                <div className="grid gap-4">
                  <article className={`${cardClassName} p-5`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#111111]">
                        Parent sharing
                      </span>
                      <span className="text-[#378ADD]">Ready to send</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#6b6b6b]">
                      Choose which notes go home. Everything else stays private
                      to the teacher.
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="rounded-2xl bg-[#f7f7f5] px-4 py-3 text-sm text-[#111111]">
                        Writing growth note selected
                      </div>
                      <div className="rounded-2xl bg-[#f7f7f5] px-4 py-3 text-sm text-[#8f8f8f]">
                        Recess observation kept private
                      </div>
                    </div>
                  </article>

                  <article className={`${cardClassName} p-5`}>
                    <span className="text-sm font-semibold text-[#111111]">
                      Built for quick moments
                    </span>
                    <p className="mt-3 text-sm leading-6 text-[#6b6b6b]">
                      The flow stays short enough to use between lessons, during
                      centres, or right after a conference.
                    </p>
                  </article>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="px-6 py-14 sm:py-18" id="features">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <span className="text-sm font-medium text-[#8a8a8a]">Features</span>
              <h2 className="mt-3 max-w-[12ch] text-[2.4rem] font-semibold leading-[1] tracking-[-0.07em] text-[#111111] sm:text-[3.2rem]">
                A calmer way to document learning
              </h2>
              <p className="mt-4 max-w-sm text-[15px] leading-7 text-[#5f5f5f]">
                trove keeps the workflow simple: notice something, write one
                clear comment, attach the work if it helps, and decide whether
                that moment belongs in the parent conversation.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-8 sm:py-10" id="schools">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-x-4 -inset-y-6 rounded-[24px] bg-[#fafaf8] sm:-inset-x-6 sm:-inset-y-8 lg:-inset-8"
              />
              <div className="relative">
                <span className="text-sm font-medium text-[#8a8a8a]">
                  For schools
                </span>
                <h2 className="mt-3 max-w-[12ch] text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.07em] text-[#111111] sm:text-[3rem]">
                  Keep the evidence before report card season
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-7 text-[#5f5f5f]">
                  Teachers stay in their own voice, parents receive clearer
                  context, and schools avoid turning every observation into a
                  score just to keep a record.
                </p>
              </div>
            </div>

            <figure className={`${cardClassName} p-8`}>
              <blockquote className="max-w-xl text-[1.05rem] leading-8 text-[#111111]">
                “I used to dread report card season. Now I already have a
                term&apos;s worth of real moments written down, ready to share.”
              </blockquote>
              <figcaption className="mt-5 text-sm text-[#8f8f8f]">
                Maria Chen, grade 2 teacher
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="px-6 pb-16 pt-14 sm:pb-20">
          <div className="mx-auto max-w-6xl rounded-[28px] bg-[#edf4fc] px-8 py-12 text-center sm:px-12">
            <h2 className="mx-auto max-w-[11ch] text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.07em] text-[#111111] sm:text-[3rem]">
              Ready to start noticing?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#5f5f5f]">
              Free for individual teachers. No credit card needed.
            </p>
            <div className="mt-8">
              <a className={primaryButtonClassName} href="#">
                Create your account
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
