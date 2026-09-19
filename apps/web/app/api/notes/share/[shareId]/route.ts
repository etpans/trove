import { proxyAuthenticatedRequest } from "../../../auth/proxy";

type RouteContext = {
  params: Promise<{
    shareId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { shareId } = await context.params;
  return proxyAuthenticatedRequest(`/notes/share/${shareId}`, {
    method: "DELETE",
  });
}
