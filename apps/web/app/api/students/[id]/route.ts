import { proxyAuthenticatedRequest } from "../../auth/proxy";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAuthenticatedRequest(`/students/${id}`);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAuthenticatedRequest(`/students/${id}`, {
    body: await request.text(),
    method: "PATCH",
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAuthenticatedRequest(`/students/${id}`, {
    method: "DELETE",
  });
}
