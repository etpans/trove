import { cardClassName } from "./styles";
import { CheckIcon, PhotoIcon } from "./icons";

export default function HeroWorkflowPreview() {
  return (
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
            Completed her writing journal entry with three full sentences, up
            from one last week.
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
              Choose which notes go home. Everything else stays private to the
              teacher.
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
  );
}
