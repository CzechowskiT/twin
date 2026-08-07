import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { shouldBlockLikelyBot } from "@/lib/bot-guard";
import {
  isAllowlistedPreviewScenario,
  isPublicPreviewEnabled,
} from "@/lib/public-preview-gate";

const PREVIEW_ROBOTS =
  "noindex, nofollow, noarchive, nosnippet, noimageindex";

const PREVIEW_CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; " +
  "font-src 'self' data:; " +
  "connect-src 'self'; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'";

function hasLikelyAuthCookie(request: NextRequest): boolean {
  const cookie = request.headers.get("cookie") || "";
  if (!cookie) return false;
  // Any session-ish cookie forces private cache — never put authed HTML in public CDN.
  return /(?:^|;\s*)(twin_|session|auth|token|sb-|__Secure-|__Host-)/i.test(cookie);
}

function applyPreviewSecurityHeaders(
  response: NextResponse,
  privateCache: boolean,
): NextResponse {
  response.headers.set("X-Robots-Tag", PREVIEW_ROBOTS);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
  );
  response.headers.set("Content-Security-Policy", PREVIEW_CSP);
  response.headers.set(
    "Cache-Control",
    privateCache
      ? "private, no-store, max-age=0, must-revalidate"
      : "public, max-age=60, stale-while-revalidate=300",
  );
  response.headers.set("Vary", "Cookie, Authorization");
  return response;
}

export function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent");
  if (shouldBlockLikelyBot(ua)) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/auth/signup" || pathname === "/auth/signup/") {
    const url = request.nextUrl.clone();
    url.pathname = "/register";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/preview" || pathname.startsWith("/preview/")) {
    if (!isPublicPreviewEnabled()) {
      return new NextResponse("Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": PREVIEW_ROBOTS,
        },
      });
    }
    const method = request.method.toUpperCase();
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      return new NextResponse("Method Not Allowed", {
        status: 405,
        headers: {
          Allow: "GET, HEAD, OPTIONS",
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": PREVIEW_ROBOTS,
        },
      });
    }
    const scenario = request.nextUrl.searchParams.get("scenario");
    if (scenario && !isAllowlistedPreviewScenario(scenario)) {
      return new NextResponse("Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": PREVIEW_ROBOTS,
        },
      });
    }
    const response = NextResponse.next();
    const privateCache =
      hasLikelyAuthCookie(request) || Boolean(request.headers.get("authorization"));
    return applyPreviewSecurityHeaders(response, privateCache);
  }

  // Private app surfaces must never be publicly cached.
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/me") ||
    pathname.startsWith("/admin")
  ) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/|favicon.ico|robots.txt|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|txt|woff2?|webmanifest)$).*)",
  ],
};
