"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthForm from "./AuthForm";
import type { AuthMode } from "./auth-types";

type AuthPageShellProps = {
  mode: AuthMode;
  turnstileSiteKey?: string;
};

export default function AuthPageShell({
  mode,
  turnstileSiteKey,
}: AuthPageShellProps) {
  const router = useRouter();
  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen bg-[#fafaf8] px-6 py-10 text-[#111111]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <Link
          className="mx-auto text-lg font-semibold tracking-[-0.04em] lowercase text-[#111111]"
          href="/"
        >
          trove
        </Link>

        <section className="mt-8 rounded-[22px] border border-[#e7e5df] bg-white p-7 shadow-[0_24px_80px_rgba(17,17,17,0.08)] sm:p-8">
          <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.04em] text-[#111111]">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-[#6b6b6b]">
            {isSignup
              ? "Start capturing classroom notes and sharing moments home."
              : "Sign in to continue to your classroom notes."}
          </p>

          <AuthForm
            mode={mode}
            onModeChange={(nextMode) => router.push(`/${nextMode}`)}
            turnstileSiteKey={turnstileSiteKey}
          />
        </section>
      </div>
    </main>
  );
}
