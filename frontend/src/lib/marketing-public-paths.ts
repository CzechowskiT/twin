/** Routes that use `LandingAmbient` instead of the global `twin-studio-ambient` wallpaper. */
const MARKETING_PUBLIC_PREFIXES = [
  "/faq",
  "/how-it-works",
  "/pricing",
  "/about",
  "/contact",
  "/demo",
  "/login",
  "/register",
  "/privacy",
  "/terms",
  "/for-candidates",
  "/for-recruiters",
  "/for-companies",
  "/for-investors",
  "/compare/",
  "/calculator",
  "/developers",
  "/status",
  "/testimonials",
  "/case-studies",
  "/media",
  "/careers",
  "/partners",
  "/companies/",
  "/first-1000",
  "/forgot-password",
  "/verify-email",
  "/auth/callback",
  "/reset-password",
  "/consent/",
] as const;

export function isMarketingPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/waitlist" || pathname.startsWith("/waitlist/")) return false;
  return MARKETING_PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}
