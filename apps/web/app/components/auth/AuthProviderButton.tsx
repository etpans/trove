import Button from "@mui/material/Button";
import type { AuthMode } from "./auth-types";

type AuthProviderButtonProps = {
  disabled: boolean;
  mode: AuthMode;
  onClick: () => void;
};

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.805 12.23c0-.79-.068-1.548-.214-2.276H12.24v4.31h5.35a4.58 4.58 0 0 1-1.98 3.006v2.5h3.22c1.886-1.737 2.975-4.298 2.975-7.54Z"
        fill="#4285F4"
      />
      <path
        d="M12.24 22c2.674 0 4.92-.886 6.56-2.4l-3.22-2.5c-.894.602-2.037.955-3.34.955-2.576 0-4.76-1.74-5.54-4.08H3.38v2.58A9.91 9.91 0 0 0 12.24 22Z"
        fill="#34A853"
      />
      <path
        d="M6.7 13.975a5.93 5.93 0 0 1 0-3.77v-2.58H3.38a9.81 9.81 0 0 0 0 8.93l3.32-2.58Z"
        fill="#FBBC04"
      />
      <path
        d="M12.24 5.945c1.455 0 2.76.5 3.792 1.483l2.844-2.844C17.156 2.98 14.91 2 12.24 2a9.91 9.91 0 0 0-8.86 5.625l3.32 2.58c.78-2.344 2.964-4.26 5.54-4.26Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthProviderButton({
  disabled,
  mode,
  onClick,
}: AuthProviderButtonProps) {
  return (
    <Button
      disableElevation
      disabled={disabled}
      fullWidth
      onClick={onClick}
      startIcon={<GoogleIcon />}
      sx={{
        borderColor: "#d7dce5",
        borderRadius: "10px",
        color: "#111111",
        fontSize: "0.875rem",
        fontWeight: 500,
        minHeight: "48px",
        textTransform: "none",
        "&:hover": {
          backgroundColor: "#f7f7f5",
          borderColor: "#cad2df",
        },
      }}
      type="button"
      variant="outlined"
    >
      {mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
    </Button>
  );
}
