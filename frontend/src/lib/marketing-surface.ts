/**
 * Marketing site visual mode (public pages: /, /about, /calculator, …).
 *
 * - `heritage` — soft mint canvas + nature wallpaper (previous default look).
 * - `studio` — dark high-contrast hero like the mobile reference (purple / teal glow, white type).
 *
 * To revert the whole marketing chrome: set `MARKETING_SURFACE` to `"heritage"` and redeploy.
 */
export type MarketingSurfaceId = "heritage" | "studio";

export const MARKETING_SURFACE: MarketingSurfaceId = "studio";

const MARKETING_PATH_PREFIXES = [
  "/about",
  "/case-studies",
  "/faq",
  "/partners",
  "/media",
  "/careers",
  "/contact",
  "/calculator",
  "/for-candidates",
  "/for-recruiters",
  "/for-companies",
] as const;

/** True for public marketing URLs (same set as OS wallpaper `meadow` fallback in `resolveNatureVariant`). */
export function isMarketingPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "/").replace(/\/$/, "") || "/";
  if (path === "/") return true;
  return MARKETING_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
