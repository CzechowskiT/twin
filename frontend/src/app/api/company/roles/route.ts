import { NextResponse } from "next/server";

import { recruiterInboxProxyGate, recruiterInboxUpstreamHeaders } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

async function proxy(req: Request, method: string) {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const base = getUpstreamApiBase();
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/company/roles?${url.searchParams.toString()}`;
  const upstream = await fetch(upstreamUrl, {
    method,
    headers: {
      ...recruiterInboxUpstreamHeaders(req),
      "Content-Type": "application/json",
    },
    body: method === "POST" ? await req.text() : undefined,
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
