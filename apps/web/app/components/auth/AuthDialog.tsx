"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import AuthForm from "./AuthForm";
import type { AuthMode } from "./auth-types";

type AuthDialogProps = {
  initialMode: AuthMode;
  isOpen: boolean;
  onClose: () => void;
};

export default function AuthDialog({
  initialMode,
  isOpen,
  onClose,
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const modal = (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={handleBackdropClick}
      role="dialog"
    >
      <div className="relative w-full max-w-md rounded-[22px] border border-[#e7e5df] bg-white p-7 text-left text-base font-normal tracking-normal text-[#111111] shadow-[0_24px_80px_rgba(17,17,17,0.12)] sm:p-8">
        <div className="pr-12">
          <div>
            <h2 className="text-[1.45rem] font-semibold leading-tight tracking-[-0.04em] text-[#111111]">
              {mode === "signup" ? "Sign up" : "Sign in"}
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#6b6b6b]">
              {mode === "signup"
                ? "Create your account to continue"
                : "Welcome back, please sign in to continue"}
            </p>
          </div>
        </div>
        <button
          aria-label="Close form"
          className="absolute right-5 top-5 cursor-pointer rounded-full p-2.5 text-[1.5rem] leading-none text-[#8a8a8a] transition-colors hover:bg-[#f7f7f5] hover:text-[#111111] sm:right-6 sm:top-6"
          onClick={onClose}
          type="button"
        >
          &times;
        </button>

        <AuthForm mode={mode} onModeChange={setMode} />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
