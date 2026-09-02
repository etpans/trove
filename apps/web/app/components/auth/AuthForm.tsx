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

async function verifyEmailCode(payload: { code: string; email: string }) {
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

async function requestPasswordReset(email: string) {
  const response = await fetch("/api/auth/forgot-password", {
    body: JSON.stringify({ email }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as AuthApiResponse;

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to start password reset.");
  }

  return data;
}

async function resendPasswordResetCode(email: string) {
  const response = await fetch("/api/auth/resend-password-reset-code", {
    body: JSON.stringify({ email }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as AuthApiResponse;

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to resend password reset code.");
  }

  return data;
}

async function resetPassword(payload: {
  code: string;
  email: string;
  password: string;
}) {
  const response = await fetch("/api/auth/reset-password", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as AuthApiResponse;

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to reset password.");
  }

  return data;
}

export default function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(emptyAuthForm);
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setResending] = useState(false);
  const [isVerifying, setVerifying] = useState(false);
  const [pendingPasswordResetEmail, setPendingPasswordResetEmail] =
    useState("");
  const [passwordResetCode, setPasswordResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordResetCooldown, setPasswordResetCooldown] = useState(0);
  const [isRequestingPasswordReset, setRequestingPasswordReset] =
    useState(false);
  const [isResettingPassword, setResettingPassword] = useState(false);
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

  useEffect(() => {
    if (passwordResetCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setPasswordResetCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [passwordResetCooldown]);

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
        setVerificationCode("");
        setResendCooldown(60);
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit the form.";

      if (mode === "login" && message.toLowerCase().includes("verify")) {
        setPendingVerificationEmail(form.email);
        setVerificationCode("");
      }

      if (
        mode === "signup" &&
        message.toLowerCase().includes("resend")
      ) {
        setPendingVerificationEmail(form.email);
        setVerificationCode("");
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

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pendingVerificationEmail || verificationCode.trim().length !== 6) {
      return;
    }

    setVerifying(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await verifyEmailCode({
        code: verificationCode.trim(),
        email: pendingVerificationEmail,
      });
      setSuccessMessage(data.message ?? "Email verified. You can sign in now.");
      setForm({
        ...emptyAuthForm,
        email: pendingVerificationEmail,
      });
      setPendingVerificationEmail("");
      setVerificationCode("");
      setResendCooldown(0);
      onModeChange("login");
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Unable to verify this account.",
      );
    } finally {
      setVerifying(false);
    }
  }

  async function handleForgotPassword() {
    const email = form.email.trim();

    if (!email) {
      setError("Enter your email address before resetting your password.");
      return;
    }

    setRequestingPasswordReset(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await requestPasswordReset(email);
      setPendingPasswordResetEmail(email);
      setPasswordResetCode("");
      setNewPassword("");
      setPasswordResetCooldown(data.cooldownSeconds ?? 60);
      setSuccessMessage(data.message ?? "Password reset code sent.");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to start password reset.",
      );
    } finally {
      setRequestingPasswordReset(false);
    }
  }

  async function handleResendPasswordResetCode() {
    if (!pendingPasswordResetEmail || passwordResetCooldown > 0) {
      return;
    }

    setRequestingPasswordReset(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await resendPasswordResetCode(pendingPasswordResetEmail);
      setPasswordResetCooldown(data.cooldownSeconds ?? 60);
      setSuccessMessage(data.message ?? "Password reset code sent.");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to resend password reset code.",
      );
    } finally {
      setRequestingPasswordReset(false);
    }
  }

  async function handleResetPassword() {
    if (
      !pendingPasswordResetEmail ||
      passwordResetCode.length !== 6 ||
      newPassword.length < 8
    ) {
      return;
    }

    setResettingPassword(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await resetPassword({
        code: passwordResetCode,
        email: pendingPasswordResetEmail,
        password: newPassword,
      });
      setForm({
        ...emptyAuthForm,
        email: pendingPasswordResetEmail,
      });
      setPendingPasswordResetEmail("");
      setPasswordResetCode("");
      setNewPassword("");
      setPasswordResetCooldown(0);
      onModeChange("login");
      setSuccessMessage(data.message ?? "Password reset. You can sign in now.");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to reset password.",
      );
    } finally {
      setResettingPassword(false);
    }
  }

  function toggleMode() {
    onModeChange(mode === "signup" ? "login" : "signup");
    setForm(emptyAuthForm);
    setError("");
    setPendingVerificationEmail("");
    setVerificationCode("");
    setPendingPasswordResetEmail("");
    setPasswordResetCode("");
    setNewPassword("");
    setPasswordResetCooldown(0);
    setResendCooldown(0);
    setSuccessMessage("");
  }

  const isPasswordTooShort =
    form.password.length > 0 && form.password.length < 8;
  const isNewPasswordTooShort =
    newPassword.length > 0 && newPassword.length < 8;

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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
              <button
                className="text-left text-[12px] font-semibold text-[#378ADD] hover:underline sm:text-right"
                disabled={isRequestingPasswordReset}
                onClick={handleForgotPassword}
                type="button"
              >
                {isRequestingPasswordReset ? "Sending..." : "Forgot password?"}
              </button>
            </div>
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
          <div className="rounded-[12px] border border-[#d7dce5] bg-[#fafaf8] p-4">
            <form className="space-y-3" onSubmit={handleVerifyEmail}>
              <label className="block text-left">
                <span className="mb-1.5 block text-left text-[12px] font-medium tracking-[0.01em] text-[#6b6b6b]">
                  Verification code *
                </span>
                <input
                  className="h-12 w-full rounded-[10px] border border-[#d7dce5] bg-white px-[14px] text-center text-lg font-semibold tracking-[0.3em] text-[#111111] outline-none transition placeholder:tracking-normal placeholder:opacity-70 focus:border-[#378ADD]"
                  inputMode="numeric"
                  maxLength={6}
                  name="verificationCode"
                  onChange={(event) =>
                    setVerificationCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="000000"
                  required
                  value={verificationCode}
                />
              </label>
              <Button
                disableElevation
                disabled={isVerifying || verificationCode.length !== 6}
                fullWidth
                sx={{
                  backgroundColor: "#111111",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  minHeight: "44px",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#2a2a2a",
                  },
                }}
                type="submit"
                variant="contained"
              >
                {isVerifying ? "Verifying..." : "Verify account"}
              </Button>
            </form>
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
                mt: 1.5,
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
          </div>
        ) : null}

        {pendingPasswordResetEmail ? (
          <div className="rounded-[12px] border border-[#d7dce5] bg-[#fafaf8] p-4">
            <div className="space-y-3">
              <label className="block text-left">
                <span className="mb-1.5 block text-left text-[12px] font-medium tracking-[0.01em] text-[#6b6b6b]">
                  Reset code *
                </span>
                <input
                  className="h-12 w-full rounded-[10px] border border-[#d7dce5] bg-white px-[14px] text-center text-lg font-semibold tracking-[0.3em] text-[#111111] outline-none transition placeholder:tracking-normal placeholder:opacity-70 focus:border-[#378ADD]"
                  inputMode="numeric"
                  maxLength={6}
                  name="passwordResetCode"
                  onChange={(event) =>
                    setPasswordResetCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="000000"
                  required
                  value={passwordResetCode}
                />
              </label>
              <FormTextField
                error={isNewPasswordTooShort}
                helperText={
                  isNewPasswordTooShort
                    ? "Password must be at least 8 characters."
                    : " "
                }
                label="New password"
                name="newPassword"
                onChange={setNewPassword}
                placeholder="******"
                required
                type="password"
                value={newPassword}
              />
              <Button
                disableElevation
                disabled={
                  isResettingPassword ||
                  passwordResetCode.length !== 6 ||
                  newPassword.length < 8
                }
                fullWidth
                onClick={handleResetPassword}
                sx={{
                  backgroundColor: "#111111",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  minHeight: "44px",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#2a2a2a",
                  },
                }}
                type="button"
                variant="contained"
              >
                {isResettingPassword ? "Resetting..." : "Reset password"}
              </Button>
            </div>
            <Button
              disabled={isRequestingPasswordReset || passwordResetCooldown > 0}
              fullWidth
              onClick={handleResendPasswordResetCode}
              sx={{
                borderColor: "#d7dce5",
                borderRadius: "10px",
                color: "#111111",
                fontSize: "0.875rem",
                fontWeight: 600,
                mt: 1.5,
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
              {isRequestingPasswordReset
                ? "Sending..."
                : passwordResetCooldown > 0
                  ? `Resend in ${passwordResetCooldown}s`
                  : "Resend reset code"}
            </Button>
          </div>
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
