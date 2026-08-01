"use client";

import Button from "@mui/material/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionState = {
  authenticated: boolean;
  message?: string;
  user?: {
    email?: string;
    userId?: string;
  };
};

export default function DashboardClient() {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session");
        const data = (await response.json()) as SessionState;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !data.authenticated) {
          router.replace("/");
          return;
        }

        setSession(data);
      } catch {
        if (isMounted) {
          router.replace("/");
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] px-6 py-8 text-[#111111]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link
          className="text-lg font-semibold tracking-[-0.04em] lowercase"
          href="/"
        >
          trove
        </Link>
        <Button
          onClick={handleLogout}
          sx={{
            borderColor: "#d7dce5",
            borderRadius: "8px",
            color: "#111111",
            fontSize: "0.875rem",
            fontWeight: 600,
            textTransform: "none",
            "&:hover": {
              backgroundColor: "#ffffff",
              borderColor: "#c5ccd8",
            },
          }}
          variant="outlined"
        >
          Log out
        </Button>
      </div>

      <main className="mx-auto mt-16 max-w-5xl">
        <section className="rounded-[22px] border border-[#e7e5df] bg-white p-8">
          <span className="text-sm font-medium text-[#378ADD]">
            Signed in
          </span>
          <h1 className="mt-3 text-[2.4rem] font-semibold leading-tight tracking-[-0.07em]">
            Welcome to trove
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#5f5f5f]">
            {session?.user?.email
              ? `You are signed in as ${session.user.email}.`
              : "Loading your session..."}
          </p>
        </section>
      </main>
    </div>
  );
}
