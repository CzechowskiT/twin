import { proxyFounderCanary } from "@/lib/founder-canary-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Founder-session proxy for GET/POST /api/v1/admin/canary/control — no browser OPS token. */
export async function GET(req: Request) {
  return proxyFounderCanary(req, "/api/v1/admin/canary/control");
}

export async function POST(req: Request) {
  return proxyFounderCanary(req, "/api/v1/admin/canary/control");
}
