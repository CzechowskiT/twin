import { NextResponse } from "next/server";

import { recruiterInboxProxyGate } from "@/lib/recruiter-inbox-api-route";
import { getUpstreamApiBase } from "@/lib/public-api-base";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = recruiterInboxProxyGate(req);
  if (gate) return gate;
  const base = getUpstreamApiBase();
  const serverToken = process.env.RECRUITER_INBOX_TOKEN?.trim() ?? "";
  const url = new URL(req.url);
  const upstreamUrl = `${base!.replace(/\/$/, "")}/api/v1/company/team?${url.searchParams.toString()}`;
  const upstream = await fetch(upstreamUrl, {
    method: "GET",
    headers: {
      "X-Twin-Recruiter-Token": serverToken,
    },
    cache: "no-store",
  });
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
