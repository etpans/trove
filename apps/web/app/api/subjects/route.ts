import { proxyAuthenticatedRequest } from "../auth/proxy";

export async function GET() {
  return proxyAuthenticatedRequest("/subjects");
}

export async function POST(request: Request) {
  return proxyAuthenticatedRequest("/subjects", {
    body: await request.text(),
    method: "POST",
  });
}
