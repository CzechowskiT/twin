import { NextResponse } from "next/server";

import { recruiterInboxProxyGate, recruiterInboxUpstreamHeaders } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ applicationId: string }> };

async function proxy(req: Request, applicationId: string) {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const base = getUpstreamApiBase();
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/recruiter/inbox/${applicationId}/scorecard?${url.searchParams.toString()}`;
  const init: RequestInit = {
    headers: recruiterInboxUpstreamHeaders(req),
    cache: "no-store",
  };
  if (req.method === "PUT") {
    init.method = "PUT";
    init.body = await req.text();
    init.headers = { ...init.headers, "Content-Type": "application/json" };
  }
  const upstream = await fetch(upstreamUrl, init);
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: Request, ctx: Ctx) {
  const { applicationId } = await ctx.params;
  return proxy(req, applicationId);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { applicationId } = await ctx.params;
  return proxy(req, applicationId);
}
