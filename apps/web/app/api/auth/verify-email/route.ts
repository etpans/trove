import { NextResponse } from "next/server";
import { getApiUrl, parseUpstreamResponse } from "../upstream";

type VerifyEmailPayload = {
  token?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyEmailPayload;
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json(
      { message: "Verification token is required." },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetch(getApiUrl("/auth/verify-email"), {
      body: JSON.stringify({ token }),
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
