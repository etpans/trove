import SignUpCta from "../SignUpCta";

export default function FinalCtaSection() {
  return (
    <section className="px-6 pb-16 pt-14 sm:pb-20">
      <div className="mx-auto max-w-6xl rounded-[28px] bg-[#edf4fc] px-8 py-12 text-center sm:px-12">
        <h2 className="mx-auto max-w-[11ch] text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.07em] text-[#111111] sm:text-[3rem]">
          Ready to start noticing?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#5f5f5f]">
          Free for individual teachers. No credit card needed.
        </p>
        <div className="mt-8">
          <SignUpCta label="Create your account" />
        </div>
      </div>
    </section>
  );
}
