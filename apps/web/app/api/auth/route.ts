import { NextResponse } from "next/server";

type AuthPayload = {
  name?: string;
  email?: string;
  mode?: "login" | "signup";
  password?: string;
  provider?: "google";
  rememberMe?: boolean;
};

type AuthResponseBody = {
  access_token?: string;
  message?: string;
  refresh_token?: string;
};

const apiBaseUrl =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

function getAuthEndpoint(mode: "login" | "signup") {
  return new URL(
    mode === "signup" ? "/auth/register" : "/auth/login",
    apiBaseUrl,
  ).toString();
}

async function parseUpstreamResponse(
  response: Response,
): Promise<AuthResponseBody> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as AuthResponseBody;
  }

  const text = await response.text();
  return text ? { message: text } : {};
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
          }
        : {
            email,
            password: body.password,
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

    return NextResponse.json(
      {
        ...data,
        message:
          data.message ??
          (body.mode === "signup"
            ? "Check your email to verify your account."
            : "Signed in successfully."),
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
