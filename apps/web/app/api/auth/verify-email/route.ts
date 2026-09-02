import { NextResponse } from "next/server";
import { getApiUrl, parseUpstreamResponse } from "../upstream";

type VerifyEmailPayload = {
  code?: string;
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyEmailPayload;
  const code = body.code?.trim();
  const email = body.email?.trim();

  if (!email || !code) {
    return NextResponse.json(
      { message: "Email and verification code are required." },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetch(getApiUrl("/auth/verify-email"), {
      body: JSON.stringify({ code, email }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const data = await parseUpstreamResponse(upstreamResponse);

    return NextResponse.json(
      {
        message:
          data.message ??
          (upstreamResponse.ok
            ? "Email verified."
            : "Unable to verify this email link."),
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
