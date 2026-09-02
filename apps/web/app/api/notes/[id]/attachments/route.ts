import { proxyAuthenticatedRequest } from "../../../auth/proxy";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAuthenticatedRequest(`/notes/${id}/attachments`, {
    body: await request.formData(),
    method: "POST",
  });
}
