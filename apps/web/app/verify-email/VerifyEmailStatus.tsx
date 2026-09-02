"use client";

import Button from "@mui/material/Button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

type VerificationState = {
  message: string;
  status: "idle" | "error" | "success";
};

async function verifyEmail(payload: { code: string; email: string }) {
  const response = await fetch("/api/auth/verify-email", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to verify this account.");
  }

  return data;
}

export default function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [state, setState] = useState<VerificationState>({
    message: "",
    status: "idle",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || code.length !== 6) {
      return;
    }

    setSubmitting(true);
    setState({ message: "", status: "idle" });

    try {
      const data = await verifyEmail({
        code,
        email: email.trim(),
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

  const isSuccess = state.status === "success";

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16 text-center">
      <Link
        className="mx-auto text-lg font-semibold tracking-[-0.04em] lowercase text-[#111111]"
        href="/"
      >
        trove
      </Link>

      <div className="mt-8 rounded-[22px] border border-[#e7e5df] bg-white p-8 shadow-[0_24px_80px_rgba(17,17,17,0.08)]">
        <span
          className={`mx-auto flex size-12 items-center justify-center rounded-full text-sm font-semibold ${
            isSuccess
              ? "bg-[#edf7ed] text-[#1e6a3b]"
              : "bg-[#edf4fc] text-[#378ADD]"
          }`}
        >
          {isSuccess ? "OK" : "6"}
        </span>

        <h1 className="mt-5 text-[2rem] font-semibold leading-tight tracking-[-0.06em] text-[#111111]">
          {isSuccess ? "Email verified" : "Verify your email"}
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-[#5f5f5f]">
          Enter the six-digit code sent to your email address.
        </p>

        {isSuccess ? (
          <div className="mt-7">
            <Button
              disableElevation
              href="/"
              sx={{
                backgroundColor: "#378ADD",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "0.95rem",
                fontWeight: 600,
                px: 3,
                py: 1.25,
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
          <form className="mt-7 space-y-4 text-left" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-left text-[12px] font-medium tracking-[0.01em] text-[#6b6b6b]">
                Email *
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
                Verification code *
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
              <p className="rounded-lg bg-[#fff1f1] px-4 py-3 text-sm text-[#b42318]">
                {state.message}
              </p>
            ) : null}

            <Button
              disableElevation
              disabled={isSubmitting || code.length !== 6}
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
              }}
              type="submit"
              variant="contained"
            >
              {isSubmitting ? "Verifying..." : "Verify account"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
