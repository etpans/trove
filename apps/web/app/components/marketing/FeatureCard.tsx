import type { ReactNode } from "react";

type FeatureCardProps = {
  description: string;
  icon: ReactNode;
  tintClassName: string;
  title: string;
};

export default function FeatureCard({
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
      <p className="mt-3 text-[15px] leading-7 text-[#5f5f5f]">{description}</p>
    </article>
  );
}
