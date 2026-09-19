import { NextResponse } from "next/server";
import { setAuthCookies } from "./cookies";
import { getApiUrl, parseUpstreamResponse } from "./upstream";

type AuthPayload = {
  name?: string;
  email?: string;
  mode?: "login" | "signup";
  password?: string;
  provider?: "google";
  rememberMe?: boolean;
  turnstileToken?: string;
};

function getAuthEndpoint(mode: "login" | "signup") {
  return getApiUrl(mode === "signup" ? "/auth/register" : "/auth/login");
}

export async function POST(request: Request) {
  const body = (await request.json()) as AuthPayload;

  if (!body.mode) {
    return NextResponse.json(
      { message: "Auth mode is required." },
      { status: 400 },
    );
  }

  if (body.provider === "google") {
    return NextResponse.json(
      {
        message: "Google sign-in is not connected yet.",
      },
      { status: 501 },
    );
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { message: "Email and password are required." },
      { status: 400 },
    );
  }

  if (!body.turnstileToken) {
    return NextResponse.json(
      { message: "Verification is required." },
      { status: 400 },
    );
  }

  const displayName = body.name?.trim();
  const email = body.email.trim();

  if (body.mode === "signup" && !displayName) {
    return NextResponse.json(
      { message: "Name is required to create an account." },
      { status: 400 },
    );
  }

  try {
    const payload =
      body.mode === "signup"
        ? {
            displayName,
            email,
            password: body.password,
            "cf-turnstile-response": body.turnstileToken,
          }
        : {
            email,
            password: body.password,
            "cf-turnstile-response": body.turnstileToken,
          };

    const upstreamResponse = await fetch(getAuthEndpoint(body.mode), {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const data = await parseUpstreamResponse(upstreamResponse);

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          message: data.message ?? "Unable to complete the auth request.",
        },
        { status: upstreamResponse.status },
      );
    }

    const response = NextResponse.json(
      {
        message:
          data.message ??
          (body.mode === "signup"
            ? "Check your email to verify your account."
            : "Signed in successfully."),
        signedIn: body.mode === "login",
      },
      { status: upstreamResponse.status },
    );

    if (body.mode === "login") {
      setAuthCookies(response, data);
    }

    return response;
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
