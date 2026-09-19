"use client";

import Button from "@mui/material/Button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type VerificationState = {
  message: string;
  status: "idle" | "error" | "success";
};

type AuthApiResponse = {
  cooldownSeconds?: number;
  message?: string;
};

class VerificationRequestError extends Error {
  constructor(
    message: string,
    readonly cooldownSeconds?: number,
  ) {
    super(message);
  }
}

async function verifyEmail(payload: { code: string; email: string }) {
  const response = await fetch("/api/auth/verify-email", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as AuthApiResponse;

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to verify this account.");
  }

  return data;
}

async function resendVerificationEmail(email: string) {
  const response = await fetch("/api/auth/resend-verification", {
    body: JSON.stringify({ email }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as AuthApiResponse;

  if (!response.ok) {
    throw new VerificationRequestError(
      data.message ?? "Unable to resend verification code.",
      data.cooldownSeconds,
    );
  }

  return data;
}

export default function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [isResending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(
    searchParams.get("email") ? 60 : 0,
  );
  const [state, setState] = useState<VerificationState>({
    message: "",
    status: "idle",
  });

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail || code.length !== 6) {
      setState({
        message: "Enter your email and the six-digit code.",
        status: "error",
      });
      return;
    }

    setSubmitting(true);
    setState({ message: "", status: "idle" });

    try {
      const data = await verifyEmail({
        code,
        email: trimmedEmail,
      });
      setState({
        message: data.message ?? "Email verified. You can sign in now.",
        status: "success",
      });
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify this account.",
        status: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendVerification() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || resendCooldown > 0) {
      if (!trimmedEmail) {
        setState({
          message: "Enter your email address before resending the code.",
          status: "error",
        });
      }
      return;
    }

    setResending(true);
    setState({ message: "", status: "idle" });

    try {
      const data = await resendVerificationEmail(trimmedEmail);
      setState({
        message: data.message ?? "Verification code sent.",
        status: "idle",
      });
      setResendCooldown(data.cooldownSeconds ?? 60);
    } catch (error) {
      if (
        error instanceof VerificationRequestError &&
        error.cooldownSeconds
      ) {
        setResendCooldown(error.cooldownSeconds);
      }

      setState({
        message:
          error instanceof Error
            ? error.message
            : "Unable to resend verification code.",
        status: "error",
      });
    } finally {
      setResending(false);
    }
  }

  const isSuccess = state.status === "success";

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
          <div
            className={`flex size-11 items-center justify-center rounded-full text-sm font-semibold ${
              isSuccess
                ? "bg-[#edf7ed] text-[#1e6a3b]"
                : "bg-[#edf4fc] text-[#378ADD]"
            }`}
          >
            {isSuccess ? "OK" : "6"}
          </div>

          <h1 className="mt-5 text-[1.65rem] font-semibold leading-tight tracking-[-0.04em] text-[#111111]">
            {isSuccess ? "Email verified" : "Check your email"}
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-[#6b6b6b]">
            {isSuccess
              ? "Your account is ready. Sign in to open your classroom workspace."
              : "Enter the six-digit code we sent after signup. You can update the email address if needed."}
          </p>

          {isSuccess ? (
            <div className="mt-7 space-y-4">
              {state.message ? (
                <p className="rounded-lg bg-[#edf7ed] px-4 py-3 text-sm text-[#1e6a3b]">
                  {state.message}
                </p>
              ) : null}

              <Button
                disableElevation
                fullWidth
                href="/login"
                sx={{
                  backgroundColor: "#378ADD",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  minHeight: "48px",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#2f7aca",
                  },
                }}
                variant="contained"
              >
                Continue to login
              </Button>
            </div>
          ) : (
            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-left text-[12px] font-medium tracking-[0.01em] text-[#6b6b6b]">
                  Email
                </span>
                <input
                  className="h-12 w-full rounded-[10px] border border-[#d7dce5] bg-white px-[14px] text-sm text-[#111111] outline-none transition focus:border-[#378ADD]"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-left text-[12px] font-medium tracking-[0.01em] text-[#6b6b6b]">
                  Verification code
                </span>
                <input
                  className="h-12 w-full rounded-[10px] border border-[#d7dce5] bg-white px-[14px] text-center text-lg font-semibold tracking-[0.3em] text-[#111111] outline-none transition placeholder:tracking-normal placeholder:opacity-70 focus:border-[#378ADD]"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  required
                  value={code}
                />
              </label>

              {state.message ? (
                <p
                  className={`rounded-lg px-4 py-3 text-sm ${
                    state.status === "error"
                      ? "bg-[#fff1f1] text-[#b42318]"
                      : "bg-[#edf7ed] text-[#1e6a3b]"
                  }`}
                >
                  {state.message}
                </p>
              ) : null}

              <Button
                disableElevation
                disabled={isSubmitting || code.length !== 6 || !email.trim()}
                fullWidth
                sx={{
                  backgroundColor: "#378ADD",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  minHeight: "48px",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#2f7aca",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "#d7dce5",
                    color: "#7b8492",
                  },
                }}
                type="submit"
                variant="contained"
              >
                {isSubmitting ? "Verifying..." : "Verify account"}
              </Button>

              <Button
                disabled={isResending || resendCooldown > 0}
                fullWidth
                onClick={handleResendVerification}
                sx={{
                  borderColor: "#d7dce5",
                  borderRadius: "10px",
                  color: "#111111",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  minHeight: "44px",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#f7f7f5",
                    borderColor: "#c5ccd8",
                  },
                }}
                type="button"
                variant="outlined"
              >
                {isResending
                  ? "Sending..."
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend verification code"}
              </Button>

              <p className="text-center text-[12px] leading-5 text-[#8a8a8a]">
                Already verified?{" "}
                <Link className="font-semibold text-[#378ADD]" href="/login">
                  Continue to login
                </Link>
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
