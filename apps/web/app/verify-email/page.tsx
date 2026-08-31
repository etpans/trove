import { Suspense } from "react";
import VerifyEmailStatus from "./VerifyEmailStatus";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-6 text-center text-[#5f5f5f]">
          Verifying your email address...
        </div>
      }
    >
      <VerifyEmailStatus />
    </Suspense>
  );
}
