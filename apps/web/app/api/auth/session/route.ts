import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  accessTokenCookie,
  clearAuthCookies,
  refreshTokenCookie,
  setAuthCookies,
} from "../cookies";
import { getApiUrl, parseUpstreamResponse } from "../upstream";

type ProfileResponse = {
  email?: string;
  userId?: string;
};

async function fetchProfile(accessToken: string) {
  return fetch(getApiUrl("/auth/profile"), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenCookie)?.value;
  const refreshToken = cookieStore.get(refreshTokenCookie)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    if (accessToken) {
      const profileResponse = await fetchProfile(accessToken);

      if (profileResponse.ok) {
        const profile = (await profileResponse.json()) as ProfileResponse;
        return NextResponse.json({ authenticated: true, user: profile });
      }
    }

    if (!refreshToken) {
      const response = NextResponse.json(
        { authenticated: false },
        { status: 401 },
      );
      clearAuthCookies(response);
      return response;
    }

    const refreshResponse = await fetch(getApiUrl("/auth/refresh"), {
      body: JSON.stringify({ refresh_token: refreshToken }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = await parseUpstreamResponse(refreshResponse);

    if (!refreshResponse.ok || !data.access_token) {
      const response = NextResponse.json(
        { authenticated: false, message: data.message },
        { status: 401 },
      );
      clearAuthCookies(response);
      return response;
    }

    const profileResponse = await fetchProfile(data.access_token);

    if (!profileResponse.ok) {
      const response = NextResponse.json(
        { authenticated: false },
        { status: 401 },
      );
      clearAuthCookies(response);
      return response;
    }

    const profile = (await profileResponse.json()) as ProfileResponse;
    const response = NextResponse.json({
      authenticated: true,
      user: profile,
    });
    setAuthCookies(response, data);
    return response;
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        message:
          "Unable to reach the auth service. Make sure the API server is running.",
      },
      { status: 502 },
    );
  }
}
