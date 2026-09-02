import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  accessTokenCookie,
  clearAuthCookies,
  refreshTokenCookie,
  setAuthCookies,
} from "./cookies";
import { getApiUrl, parseUpstreamResponse } from "./upstream";

type ProxyOptions = {
  body?: BodyInit;
  headers?: HeadersInit;
  method?: string;
};

function copySetCookieHeaders(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

function getForwardedHeaders(headers?: HeadersInit, body?: BodyInit) {
  const forwardedHeaders = new Headers(headers);

  if (!forwardedHeaders.has("Content-Type") && !(body instanceof FormData)) {
    forwardedHeaders.set("Content-Type", "application/json");
  }

  return forwardedHeaders;
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(getApiUrl("/auth/refresh"), {
    body: JSON.stringify({ refresh_token: refreshToken }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = await parseUpstreamResponse(response);

  if (!response.ok || !data.access_token) {
    const unauthenticatedResponse = NextResponse.json(
      { message: data.message ?? "Your session has expired." },
      { status: 401 },
    );
    clearAuthCookies(unauthenticatedResponse);
    return { response: unauthenticatedResponse };
  }

  const cookieResponse = NextResponse.json({});
  setAuthCookies(cookieResponse, data);

  return {
    accessToken: data.access_token,
    cookieResponse,
  };
}

async function toNextResponse(upstreamResponse: Response) {
  const contentType = upstreamResponse.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = await upstreamResponse.json();
    return NextResponse.json(data, { status: upstreamResponse.status });
  }

  const text = await upstreamResponse.text();
  return new NextResponse(text, {
    headers: contentType ? { "Content-Type": contentType } : undefined,
    status: upstreamResponse.status,
  });
}

async function fetchUpstream(
  path: string,
  accessToken: string,
  options: ProxyOptions,
) {
  const headers = getForwardedHeaders(options.headers, options.body);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(getApiUrl(path), {
    body: options.body,
    headers,
    method: options.method ?? "GET",
  });
}

export async function proxyAuthenticatedRequest(
  path: string,
  options: ProxyOptions = {},
) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenCookie)?.value;
  const refreshToken = cookieStore.get(refreshTokenCookie)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { message: "Authentication is required." },
      { status: 401 },
    );
  }

  try {
    if (accessToken) {
      const upstreamResponse = await fetchUpstream(path, accessToken, options);

      if (upstreamResponse.status !== 401 || !refreshToken) {
        return toNextResponse(upstreamResponse);
      }
    }

    if (!refreshToken) {
      const response = NextResponse.json(
        { message: "Your session has expired." },
        { status: 401 },
      );
      clearAuthCookies(response);
      return response;
    }

    const refreshed = await refreshAccessToken(refreshToken);

    if (refreshed.response || !refreshed.accessToken) {
      return refreshed.response;
    }

    const upstreamResponse = await fetchUpstream(
      path,
      refreshed.accessToken,
      options,
    );
    const response = await toNextResponse(upstreamResponse);
    copySetCookieHeaders(refreshed.cookieResponse, response);

    return response;
  } catch {
    return NextResponse.json(
      {
        message:
          "Unable to reach the API service. Make sure the API server is running.",
      },
      { status: 502 },
    );
  }
}
