import { proxyAuthenticatedRequest } from "../auth/proxy";

export async function GET() {
  return proxyAuthenticatedRequest("/classes");
}

export async function POST(request: Request) {
  return proxyAuthenticatedRequest("/classes", {
    body: await request.text(),
    method: "POST",
  });
}
