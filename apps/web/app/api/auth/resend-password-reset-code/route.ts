import { NextResponse } from "next/server";
import { getApiUrl, parseUpstreamResponse } from "../upstream";

type ResendPasswordResetPayload = {
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ResendPasswordResetPayload;
  const email = body.email?.trim();

  if (!email) {
    return NextResponse.json(
      { message: "Email is required." },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetch(
      getApiUrl("/auth/resend-password-reset-code"),
      {
        body: JSON.stringify({ email }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
    const data = await parseUpstreamResponse(upstreamResponse);

    return NextResponse.json(
      {
        message:
          data.message ??
          (upstreamResponse.ok
            ? "Password reset code sent."
            : "Unable to resend password reset code."),
      },
      { status: upstreamResponse.status },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Unable to reach the auth service. Make sure the API server is running.",
      },
      { status: 502 },
    );
  }
}
