import { proxyAuthenticatedRequest } from "../../../auth/proxy";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAuthenticatedRequest(`/notes/${id}/share`, {
    method: "POST",
  });
}
