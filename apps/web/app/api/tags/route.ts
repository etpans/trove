import { proxyAuthenticatedRequest } from "../auth/proxy";

export async function GET() {
  return proxyAuthenticatedRequest("/tags");
}

export async function POST(request: Request) {
  return proxyAuthenticatedRequest("/tags", {
    body: await request.text(),
    method: "POST",
  });
}
