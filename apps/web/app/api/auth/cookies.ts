import type { NextResponse } from "next/server";

export const accessTokenCookie = "trove_access_token";
export const refreshTokenCookie = "trove_refresh_token";

const isProduction = process.env.NODE_ENV === "production";

export function setAuthCookies(
  response: NextResponse,
  tokens: { access_token?: string; refresh_token?: string },
) {
  if (tokens.access_token) {
    response.cookies.set(accessTokenCookie, tokens.access_token, {
      httpOnly: true,
      maxAge: 15 * 60,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
    });
  }

  if (tokens.refresh_token) {
    response.cookies.set(refreshTokenCookie, tokens.refresh_token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
    });
  }
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(accessTokenCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
  });

  response.cookies.set(refreshTokenCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
  });
}
