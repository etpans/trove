import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  accessTokenCookie,
  clearAuthCookies,
  refreshTokenCookie,
} from "../cookies";
import { getApiUrl } from "../upstream";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenCookie)?.value;
  const refreshToken = cookieStore.get(refreshTokenCookie)?.value;

  if (accessToken && refreshToken) {
    await fetch(getApiUrl("/auth/logout"), {
      body: JSON.stringify({ refresh_token: refreshToken }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ message: "Logged out." });
  clearAuthCookies(response);
  return response;
}
