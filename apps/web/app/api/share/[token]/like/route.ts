import { getApiUrl } from "../../../auth/upstream";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const upstreamResponse = await fetch(getApiUrl(`/share/${token}/like`), {
    method: "POST",
  });
  const contentType = upstreamResponse.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return Response.json(await upstreamResponse.json(), {
      status: upstreamResponse.status,
    });
  }

  return new Response(await upstreamResponse.text(), {
    headers: contentType ? { "Content-Type": contentType } : undefined,
    status: upstreamResponse.status,
  });
}
