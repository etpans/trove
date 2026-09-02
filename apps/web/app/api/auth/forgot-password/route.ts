import { NextResponse } from "next/server";
import { getApiUrl, parseUpstreamResponse } from "../upstream";

type ForgotPasswordPayload = {
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ForgotPasswordPayload;
  const email = body.email?.trim();

  if (!email) {
    return NextResponse.json(
      { message: "Email is required." },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetch(getApiUrl("/auth/forgot-password"), {
      body: JSON.stringify({ email }),
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
            ? "Password reset code sent."
            : "Unable to start password reset."),
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
