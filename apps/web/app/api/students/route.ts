import { proxyAuthenticatedRequest } from "../auth/proxy";

export async function GET() {
  return proxyAuthenticatedRequest("/students");
}

export async function POST(request: Request) {
  return proxyAuthenticatedRequest("/students", {
    body: await request.text(),
    method: "POST",
  });
}
