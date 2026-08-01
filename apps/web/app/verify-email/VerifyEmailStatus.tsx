"use client";

import Button from "@mui/material/Button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type VerificationState = {
  message: string;
  status: "error" | "loading" | "success";
};

export default function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const hasToken = Boolean(token);
  const [state, setState] = useState<VerificationState>({
    message: "Verifying your email address...",
    status: "loading",
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    async function verifyEmail() {
      try {
        const response = await fetch("/api/auth/verify-email", {
          body: JSON.stringify({ token }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const data = (await response.json()) as { message?: string };

        if (!isMounted) {
          return;
        }

        setState({
          message:
            data.message ??
            (response.ok
              ? "Email verified."
              : "Unable to verify this email link."),
          status: response.ok ? "success" : "error",
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setState({
          message:
            "Unable to reach the auth service. Make sure the API server is running.",
          status: "error",
        });
      }
    }

    void verifyEmail();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const displayState: VerificationState = hasToken
    ? state
    : {
        message: "This verification link is missing a token.",
        status: "error",
      };
  const isSuccess = displayState.status === "success";

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
            : displayState.status === "loading"
                ? "bg-[#edf4fc] text-[#378ADD]"
                : "bg-[#fff1f1] text-[#b42318]"
          }`}
        >
          {isSuccess ? "OK" : displayState.status === "loading" ? "..." : "!"}
        </span>

        <h1 className="mt-5 text-[2rem] font-semibold leading-tight tracking-[-0.06em] text-[#111111]">
          {isSuccess
            ? "Email verified"
            : displayState.status === "loading"
              ? "Checking your link"
              : "Verification failed"}
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-[#5f5f5f]">
          {displayState.message}
        </p>

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
            {isSuccess ? "Continue to login" : "Back to trove"}
          </Button>
        </div>
      </div>
    </div>
  );
}
