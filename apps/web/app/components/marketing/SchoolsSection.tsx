import { cardClassName } from "./styles";

export default function SchoolsSection() {
  return (
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
              context, and schools avoid turning every observation into a score
              just to keep a record.
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
  );
}
