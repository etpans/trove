import { proxyAuthenticatedRequest } from "../../../../auth/proxy";

type RouteContext = {
  params: Promise<{
    attachmentId: string;
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { attachmentId, id } = await context.params;
  return proxyAuthenticatedRequest(`/notes/${id}/attachments/${attachmentId}`, {
    body: await request.formData(),
    method: "PATCH",
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { attachmentId, id } = await context.params;
  return proxyAuthenticatedRequest(`/notes/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}
