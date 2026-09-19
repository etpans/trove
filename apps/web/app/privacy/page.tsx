import Link from "next/link";

const sections = [
  {
    title: "Information we collect",
    body: "Trove stores account details, classroom records you create, uploaded attachments, and technical information needed to keep sessions, security, and file handling working.",
  },
  {
    title: "How information is used",
    body: "We use information to provide the classroom notes product, authenticate users, send verification or reset emails, store attachments, and support sharing workflows that you initiate.",
  },
  {
    title: "Sharing",
    body: "Trove does not sell classroom data. Notes and attachments are shared only through product features, such as parent-facing share links, or where required to operate and protect the service.",
  },
  {
    title: "Retention",
    body: "Classroom content remains available while your account or workspace keeps it. Deletion and retention behavior may depend on school policy, product settings, and backup requirements.",
  },
  {
    title: "Contact",
    body: "Privacy questions should be directed to the Trove team through the support contact provided by your account or school.",
  },
];

export default function PrivacyPage() {
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
          Privacy Policy
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
