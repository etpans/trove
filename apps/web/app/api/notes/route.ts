import { proxyAuthenticatedRequest } from "../auth/proxy";

export async function GET() {
  return proxyAuthenticatedRequest("/notes");
}

export async function POST(request: Request) {
  return proxyAuthenticatedRequest("/notes", {
    body: await request.text(),
    method: "POST",
  });
}
