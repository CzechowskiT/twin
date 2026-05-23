import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { shouldBlockLikelyBot } from "@/lib/bot-guard";

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/|favicon.ico|robots.txt|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|txt|woff2?|webmanifest)$).*)",
  ],
};
