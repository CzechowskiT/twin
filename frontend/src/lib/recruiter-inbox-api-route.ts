import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";
import { RECRUITER_INBOX_ERROR } from "@/lib/recruiter-inbox-errors";

export function recruiterTokenFromRequest(req: Request): string | null {
  const header = req.headers.get("x-twin-recruiter-token")?.trim();
  if (header) return header;
  const url = new URL(req.url);
  return url.searchParams.get("token")?.trim() || null;
}

/** Shared gate for `/api/recruiter/*` — returns safe error codes only. */
export function recruiterInboxProxyGate(req: Request): NextResponse | null {
  const serverToken = process.env.RECRUITER_INBOX_TOKEN?.trim();
  if (!serverToken) {
    return NextResponse.json(
      { detail: RECRUITER_INBOX_ERROR.unavailable },
      { status: 503 },
    );
  }
  const supplied = recruiterTokenFromRequest(req);
  if (supplied !== serverToken) {
    return NextResponse.json(
      { detail: RECRUITER_INBOX_ERROR.invalidToken },
      { status: 401 },
    );
  }
  const base = getUpstreamApiBase();
  if (!base) {
    return NextResponse.json(
      { detail: RECRUITER_INBOX_ERROR.unavailable },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const company = url.searchParams.get("company_slug")?.trim();
  if (!company) {
    return NextResponse.json(
      { detail: RECRUITER_INBOX_ERROR.companyRequired },
      { status: 400 },
    );
  }
  return null;
}

/** Forward client locale to Railway so match reasons / review card copy respect UI language. */
export function recruiterInboxUpstreamHeaders(req: Request): HeadersInit {
  const headers: Record<string, string> = {};
  const serverToken = process.env.RECRUITER_INBOX_TOKEN?.trim();
  if (serverToken) headers["X-Twin-Recruiter-Token"] = serverToken;
  const locale = req.headers.get("x-locale")?.trim();
  if (locale) headers["X-Locale"] = locale;
  return headers;
}
