import { NextResponse } from "next/server";

import { recruiterInboxProxyGate } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ roleId: string }> };

async function proxy(req: Request, method: string, roleId: string) {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const base = getUpstreamApiBase();
  const serverToken = process.env.RECRUITER_INBOX_TOKEN?.trim() ?? "";
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/company/roles/${roleId}?${url.searchParams.toString()}`;
  const upstream = await fetch(upstreamUrl, {
    method,
    headers: {
      "X-Twin-Recruiter-Token": serverToken,
      "Content-Type": "application/json",
    },
    body: method === "PATCH" ? await req.text() : undefined,
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: Request, context: RouteContext) {
  const { roleId } = await context.params;
  return proxy(req, "GET", roleId);
}

export async function PATCH(req: Request, context: RouteContext) {
  const { roleId } = await context.params;
  return proxy(req, "PATCH", roleId);
}
