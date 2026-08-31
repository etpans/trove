"use client";

import Button from "@mui/material/Button";
import { useState } from "react";
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
  const [dialogKey, setDialogKey] = useState(0);
  const [isOpen, setOpen] = useState(false);

  const isTextButton = tone === "text";

  function handleOpen() {
    setDialogKey((currentKey) => currentKey + 1);
    setOpen(true);
  }

  return (
    <>
      <Button
        disableElevation
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
        {label}
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
