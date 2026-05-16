/**
 * Global visual mode for the whole Next app (marketing + dashboard + auth).
 *
 * - `heritage` — light tokens on `<html>`; nature wallpaper on non-studio routes (see `RouteAwareBackground`).
 * - `studio` — dark tokens on `<html>`, studio ambient background, editorial accents (`marketing-copy-rail`, …).
 *
 * To revert to the light heritage product: set `MARKETING_SURFACE` to `"heritage"` and redeploy.
 */
export type MarketingSurfaceId = "heritage" | "studio";

export const MARKETING_SURFACE: MarketingSurfaceId = "studio";
