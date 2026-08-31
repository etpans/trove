export type AuthResponseBody = {
  access_token?: string;
  cooldownSeconds?: number;
  message?: string;
  refresh_token?: string;
};

export const apiBaseUrl =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

export function getApiUrl(path: string) {
  return new URL(path, apiBaseUrl).toString();
}

export async function parseUpstreamResponse(
  response: Response,
): Promise<AuthResponseBody> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as AuthResponseBody;
  }

  const text = await response.text();
  return text ? { message: text } : {};
}
