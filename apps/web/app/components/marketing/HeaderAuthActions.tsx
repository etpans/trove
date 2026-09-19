"use client";

import Button from "@mui/material/Button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionResponse = {
  authenticated?: boolean;
};

function buttonStyles(tone: "primary" | "text") {
  const isTextButton = tone === "text";

  return {
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
  };
}

export default function HeaderAuthActions() {
  const router = useRouter();
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isCheckingSession, setCheckingSession] = useState(true);
  const [isLoggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as
          | SessionResponse
          | null;

        if (isMounted) {
          setAuthenticated(response.ok && data?.authenticated === true);
        }
      } catch {
        if (isMounted) {
          setAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuthenticated(false);
      window.dispatchEvent(new Event("trove:auth-changed"));
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (isAuthenticated) {
    return (
      <>
        <li>
          <Button
            disableElevation
            onClick={() => router.push("/dashboard")}
            sx={buttonStyles("primary")}
            variant="contained"
          >
            Continue to dashboard
          </Button>
        </li>
        <li>
          <Button
            disabled={isLoggingOut}
            onClick={handleLogout}
            sx={buttonStyles("text")}
            variant="text"
          >
            {isLoggingOut ? "Logging out..." : "Log out"}
          </Button>
        </li>
      </>
    );
  }

  return (
    <>
      <li>
        <Button
          disabled={isCheckingSession}
          onClick={() => router.push("/login")}
          sx={buttonStyles("text")}
          variant="text"
        >
          {isCheckingSession ? "Checking..." : "Log in"}
        </Button>
      </li>
      <li>
        <Button
          disabled={isCheckingSession}
          disableElevation
          onClick={() => router.push("/signup")}
          sx={buttonStyles("primary")}
          variant="contained"
        >
          {isCheckingSession ? "Checking..." : "Start free"}
        </Button>
      </li>
    </>
  );
}
