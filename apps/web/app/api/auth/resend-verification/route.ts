import { NextResponse } from "next/server";
import { getApiUrl, parseUpstreamResponse } from "../upstream";

type ResendVerificationPayload = {
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ResendVerificationPayload;
  const email = body.email?.trim();

  if (!email) {
    return NextResponse.json(
      { message: "Email is required." },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetch(
      getApiUrl("/auth/resend-verification"),
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
        cooldownSeconds: data.cooldownSeconds,
        message:
          data.message ??
          (upstreamResponse.ok
            ? "Verification email sent."
            : "Unable to resend verification email."),
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
