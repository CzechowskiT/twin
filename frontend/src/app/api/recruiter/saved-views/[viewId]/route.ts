import { NextResponse } from "next/server";

import { recruiterInboxProxyGate, recruiterInboxUpstreamHeaders } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

async function proxy(req: Request, method: string): Promise<NextResponse> {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const base = getUpstreamApiBase();
  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  const viewId = parts[parts.length - 1];
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/recruiter/saved-views/${viewId}?${url.searchParams.toString()}`;
  const upstream = await fetch(upstreamUrl, {
    method,
    headers: {
      ...recruiterInboxUpstreamHeaders(req),
      ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}),
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

export async function PATCH(req: Request) {
  return proxy(req, "PATCH");
}

export async function DELETE(req: Request) {
  return proxy(req, "DELETE");
}
