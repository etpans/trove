"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          callback: (token: string) => void;
          "error-callback": () => void;
          "expired-callback": () => void;
          size?: "compact" | "flexible" | "normal";
          sitekey: string;
          theme?: "auto" | "dark" | "light";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type TurnstileFieldProps = {
  onError: () => void;
  onToken: (token: string) => void;
  siteKey?: string;
};

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
  if (existingScript) {
    return new Promise<void>((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = TURNSTILE_SRC;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(), { once: true });
    document.head.appendChild(script);
  });
}

export default function TurnstileField({
  onError,
  onToken,
  siteKey,
}: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let widgetId: string | undefined;

    if (!siteKey || !containerRef.current) {
      return;
    }

    setLoadError(false);
    onToken("");

    loadTurnstileScript()
      .then(() => {
        if (!isMounted || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetId = window.turnstile.render(containerRef.current, {
          callback: onToken,
          "error-callback": () => {
            onToken("");
            onError();
          },
          "expired-callback": () => onToken(""),
          size: "flexible",
          sitekey: siteKey,
          theme: "light",
        });
      })
      .catch(() => {
        if (isMounted) {
          setLoadError(true);
          onError();
        }
      });

    return () => {
      isMounted = false;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [onError, onToken, siteKey]);

  if (!siteKey) {
    return (
      <p className="rounded-lg bg-[#fff1f1] px-4 py-3 text-sm text-[#b42318]">
        Turnstile is not configured for this environment.
      </p>
    );
  }

  return (
    <div className="min-h-[65px] w-full">
      <div
        className="w-full [&>div]:w-full [&_iframe]:w-full"
        ref={containerRef}
      />
      {loadError ? (
        <p className="mt-2 text-sm text-[#b42318]">
          Unable to load verification. Check your connection and try again.
        </p>
      ) : null}
    </div>
  );
}
