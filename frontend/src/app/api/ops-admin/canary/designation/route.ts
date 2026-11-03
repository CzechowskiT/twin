import type { NextRequest } from "next/server";

import { proxyCanaryRequest } from "@/lib/canary-admin-bff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyCanaryRequest(request, "/api/v1/admin/canary/designation");
}

export async function POST(request: NextRequest) {
  return proxyCanaryRequest(request, "/api/v1/admin/canary/designation");
}
