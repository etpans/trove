import Link from "next/link";

const sections = [
  {
    title: "Use of Trove",
    body: "Trove is intended for teachers and school staff to organize classroom notes, student observations, attachments, and parent-facing share links. You are responsible for using the service according to your school policies and applicable student privacy requirements.",
  },
  {
    title: "Account responsibilities",
    body: "Keep your login credentials secure, use accurate account information, and only upload classroom information that you are authorized to manage. You are responsible for activity that occurs through your account.",
  },
  {
    title: "Classroom content",
    body: "You retain responsibility for notes, files, and other content you add to Trove. Do not upload content that is unlawful, harmful, or outside your authority to store or share.",
  },
  {
    title: "Availability and changes",
    body: "Trove may change as features are improved, corrected, or removed. We aim to keep the service reliable, but we do not guarantee uninterrupted availability.",
  },
  {
    title: "Contact",
    body: "Questions about these terms should be directed to the Trove team through the support contact provided by your account or school.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#fafaf8] px-6 py-12 text-[#111111]">
      <article className="mx-auto max-w-3xl">
        <Link
          className="text-lg font-semibold tracking-[-0.04em] lowercase text-[#111111]"
          href="/"
        >
          trove
        </Link>
        <h1 className="mt-10 text-[2.6rem] font-semibold leading-none tracking-[-0.06em]">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#6b6b6b]">
          Last updated September 2026
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold tracking-[-0.03em]">
                {section.title}
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-[#5f5f5f]">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
