"use client";

import Button from "@mui/material/Button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PopupForm from "./PopupForm";

type SignUpCtaProps = {
  label: string;
  mode?: "login" | "signup";
  tone?: "primary" | "text";
};

export default function SignUpCta({
  label,
  mode = "signup",
  tone = "primary",
}: SignUpCtaProps) {
  const router = useRouter();
  const [dialogKey, setDialogKey] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [isCheckingSession, setCheckingSession] = useState(false);
  const [isAuthenticated, setAuthenticated] = useState(false);

  const isTextButton = tone === "text";

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as {
          authenticated?: boolean;
        } | null;

        if (isMounted) {
          setAuthenticated(response.ok && data?.authenticated === true);
        }
      } catch {
        if (isMounted) {
          setAuthenticated(false);
        }
      }
    }

    function handleAuthChanged() {
      setAuthenticated(false);
    }

    void checkSession();
    window.addEventListener("trove:auth-changed", handleAuthChanged);

    return () => {
      isMounted = false;
      window.removeEventListener("trove:auth-changed", handleAuthChanged);
    };
  }, []);

  async function handleOpen() {
    if (isAuthenticated) {
      router.push("/dashboard");
      return;
    }

    setCheckingSession(true);

    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as {
        authenticated?: boolean;
      } | null;

      if (response.ok && data?.authenticated) {
        setAuthenticated(true);
        router.push("/dashboard");
        return;
      }
    } finally {
      setCheckingSession(false);
    }

    setDialogKey((currentKey) => currentKey + 1);
    setOpen(true);
  }

  return (
    <>
      <Button
        disableElevation
        disabled={isCheckingSession}
        onClick={handleOpen}
        sx={{
          borderColor: isTextButton ? "transparent" : "#378ADD",
          borderRadius: "8px",
          color: isTextButton ? "#6b6b6b" : "#ffffff",
          fontSize: "0.875rem",
          fontWeight: 600,
          minWidth: isTextButton ? "auto" : undefined,
          px: isTextButton ? 1.5 : 2.5,
          py: isTextButton ? 1 : 1.25,
          textTransform: "none",
          "&:hover": {
            backgroundColor: isTextButton ? "transparent" : "#2f7aca",
            color: isTextButton ? "#111111" : "#ffffff",
          },
        }}
        variant={isTextButton ? "text" : "contained"}
      >
        {isCheckingSession
          ? "Checking..."
          : isAuthenticated
            ? "Continue to dashboard"
            : label}
      </Button>

      <PopupForm
        key={`${mode}-${dialogKey}`}
        initialMode={mode}
        isOpen={isOpen}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
