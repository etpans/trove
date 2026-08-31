import type { AuthMode } from "./auth-types";

type AuthModeToggleProps = {
  mode: AuthMode;
  onToggle: () => void;
};

export default function AuthModeToggle({ mode, onToggle }: AuthModeToggleProps) {
  return (
    <p className="mt-5 text-center text-sm text-[#6b6b6b]">
      {mode === "signup" ? "Already signed up?" : "Need an account?"}{" "}
      <button
        className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-[#378ADD]"
        onClick={onToggle}
        type="button"
      >
        {mode === "signup" ? "Log in" : "Start free"}
      </button>
    </p>
  );
}
