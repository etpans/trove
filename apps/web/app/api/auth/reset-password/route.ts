import { NextResponse } from "next/server";
import { getApiUrl, parseUpstreamResponse } from "../upstream";

type ResetPasswordPayload = {
  code?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ResetPasswordPayload;
  const code = body.code?.trim();
  const email = body.email?.trim();
  const password = body.password;

  if (!email || !code || !password) {
    return NextResponse.json(
      { message: "Email, code, and new password are required." },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetch(getApiUrl("/auth/reset-password"), {
      body: JSON.stringify({ code, email, password }),
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
            ? "Password reset."
            : "Unable to reset password."),
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
