import { NextResponse } from "next/server";

import { getUpstreamApiBase } from "@/lib/public-api-base";
import { RECRUITER_INBOX_ERROR } from "@/lib/recruiter-inbox-errors";

function bearerFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  const legacy = req.headers.get("x-twin-recruiter-token")?.trim();
  return legacy || null;
}

/** Shared gate for `/api/recruiter/*` — requires JWT Bearer or legacy header; no query tokens. */
export function recruiterInboxProxyGate(req: Request): NextResponse | null {
  const credential = bearerFromRequest(req);
  if (!credential) {
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

/** Forward recruiter credential + locale to Railway — backend verifies JWT authoritatively. */
export function recruiterInboxUpstreamHeaders(req: Request): HeadersInit {
  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization")?.trim();
  if (auth) {
    headers.Authorization = auth;
  } else {
    const legacy = req.headers.get("x-twin-recruiter-token")?.trim();
    if (legacy) headers["X-Twin-Recruiter-Token"] = legacy;
  }
  const locale = req.headers.get("x-locale")?.trim();
  if (locale) headers["X-Locale"] = locale;
  return headers;
}
