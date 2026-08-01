"use client";

import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AuthModeToggle from "./AuthModeToggle";
import AuthProviderButton from "./AuthProviderButton";
import FormTextField from "./FormTextField";
import { emptyAuthForm, type AuthMode } from "./auth-types";

type AuthFormProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
};

type FocusedField = string | null;

type AuthApiResponse = {
  cooldownSeconds?: number;
  message?: string;
  signedIn?: boolean;
};

class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly cooldownSeconds?: number,
  ) {
    super(message);
  }
}

async function submitAuthRequest(payload: {
  name?: string;
  email?: string;
  mode: AuthMode;
  password?: string;
  provider?: "google";
  rememberMe?: boolean;
}) {
  const response = await fetch("/api/auth", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const data = (await response.json()) as AuthApiResponse;

  if (!response.ok) {
    throw new Error(data.message ?? "Something went wrong.");
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
    throw new AuthRequestError(
      data.message ?? "Unable to resend verification.",
      data.cooldownSeconds,
    );
  }

  return data;
}

export default function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(emptyAuthForm);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function handleGoogleSignIn() {
    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await submitAuthRequest({
        mode,
        provider: "google",
      });
      setSuccessMessage(data.message ?? "Google sign-in started.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to continue with Google.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const submittedEmail = form.email;
      const data = await submitAuthRequest({
        email: form.email,
        mode,
        name: form.name,
        password: form.password,
        rememberMe: form.rememberMe,
      });
      setSuccessMessage(data.message ?? "Request received.");
      setForm(emptyAuthForm);

      if (data.signedIn) {
        setPendingVerificationEmail("");
        router.push("/dashboard");
      } else if (mode === "signup") {
        setPendingVerificationEmail(submittedEmail);
        setResendCooldown(60);
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit the form.";

      if (mode === "login" && message.toLowerCase().includes("verify")) {
        setPendingVerificationEmail(form.email);
      }

      if (
        mode === "signup" &&
        message.toLowerCase().includes("resend")
      ) {
        setPendingVerificationEmail(form.email);
      }

      setError(
        message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (!pendingVerificationEmail || resendCooldown > 0) {
      return;
    }

    setResending(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await resendVerificationEmail(pendingVerificationEmail);
      setSuccessMessage(data.message ?? "Verification email sent.");
      setResendCooldown(data.cooldownSeconds ?? 60);
    } catch (resendError) {
      if (
        resendError instanceof AuthRequestError &&
        resendError.cooldownSeconds
      ) {
        setResendCooldown(resendError.cooldownSeconds);
      }

      setError(
        resendError instanceof Error
          ? resendError.message
          : "Unable to resend verification.",
      );
    } finally {
      setResending(false);
    }
  }

  function toggleMode() {
    onModeChange(mode === "signup" ? "login" : "signup");
    setForm(emptyAuthForm);
    setError("");
    setFocusedField(null);
    setPendingVerificationEmail("");
    setResendCooldown(0);
    setSuccessMessage("");
  }

  const isPasswordTooShort =
    form.password.length > 0 && form.password.length < 8;

  return (
    <>
      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <AuthProviderButton
          disabled={isSubmitting}
          mode={mode}
          onClick={handleGoogleSignIn}
        />

        <Divider
          sx={{
            color: "#8a8a8a",
            fontSize: "0.9rem",
            my: 0.5,
            "&::before, &::after": {
              borderColor: "#e7e5df",
            },
          }}
        >
          Or
        </Divider>

        <div className="space-y-3">
          {mode === "signup" ? (
            <FormTextField
              label="Name"
              name="name"
              value={form.name}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  name: value,
                }))
              }
              required
              placeholder="Your name"
            />
          ) : null}

          <FormTextField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            focusedField={focusedField}
            setFocusedField={setFocusedField}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                email: value,
              }))
            }
            required
            placeholder="your@email.com"
          />

          <FormTextField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            focusedField={focusedField}
            setFocusedField={setFocusedField}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                password: value,
              }))
            }
            required
            placeholder="******"
            error={isPasswordTooShort}
            helperText={
              isPasswordTooShort
                ? "Password must be at least 8 characters."
                : " "
            }
          />

          {mode === "login" ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.rememberMe}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rememberMe: event.target.checked,
                    }))
                  }
                  size="small"
                  sx={{
                    color: "#9aa4b2",
                    p: 0.5,
                    "&.Mui-checked": {
                      color: "#378ADD",
                    },
                  }}
                />
              }
              label="Remember me"
              sx={{
                alignItems: "center",
                color: "#6b6b6b",
                ml: 0,
                "& .MuiFormControlLabel-label": {
                  fontSize: "0.875rem",
                },
              }}
            />
          ) : null}
        </div>

        {error ? (
          <p className="rounded-lg bg-[#fff1f1] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-lg bg-[#edf7ed] px-4 py-3 text-sm text-[#1e6a3b]">
            {successMessage}
          </p>
        ) : null}

        {pendingVerificationEmail ? (
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
                : "Resend verification email"}
          </Button>
        ) : null}

        <Button
          disableElevation
          disabled={isSubmitting || isPasswordTooShort}
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
          {isSubmitting
            ? "Submitting..."
            : mode === "signup"
              ? "Create account"
              : "Sign in with email and password"}
        </Button>

        <p className="text-center text-[12px] leading-5 text-[#8a8a8a]">
          By continuing, you agree to our{" "}
          <a className="text-[#378ADD]" href="#">
            Terms
          </a>{" "}
          and{" "}
          <a className="text-[#378ADD]" href="#">
            Privacy Policy
          </a>
          .
        </p>
      </form>

      <AuthModeToggle mode={mode} onToggle={toggleMode} />
    </>
  );
}
