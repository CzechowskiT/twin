import { NextResponse } from "next/server";

import { recruiterInboxProxyGate, recruiterInboxUpstreamHeaders } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

async function proxy(req: Request, method: string, suffix = ""): Promise<NextResponse> {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const base = getUpstreamApiBase();
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/recruiter/saved-views${suffix}?${url.searchParams.toString()}`;
  const upstream = await fetch(upstreamUrl, {
    method,
    headers: {
      ...recruiterInboxUpstreamHeaders(req),
      ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "GET" || method === "DELETE" ? undefined : await req.text(),
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: Request) {
  return proxy(req, "GET");
}

export async function POST(req: Request) {
  return proxy(req, "POST");
}
